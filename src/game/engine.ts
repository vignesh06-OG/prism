import {
  DEFAULT_SIM,
  DELTA,
  key,
  type Board,
  type BeamEvent,
  type ColorMask,
  type Dir,
  type Piece,
  type Segment,
  type SegmentMeta,
  type SimParams,
  type TraceResult,
} from "./types";

const reflectSlash: Record<Dir, Dir> = { 0: 1, 1: 0, 2: 3, 3: 2 };
const reflectBackslash: Record<Dir, Dir> = { 0: 3, 3: 0, 2: 1, 1: 2 };

export const reflect = (dir: Dir, rot: number): Dir =>
  rot % 2 === 0 ? reflectSlash[dir] : reflectBackslash[dir];

interface Ray {
  x: number;
  y: number;
  dir: Dir;
  color: ColorMask;
  /** Telemetry carried along the ray so every edge knows its history. */
  src: string;
  dist: number;
  refl: number;
  splits: number;
  /** Remaining energy after attenuation, reflection loss and scattering. */
  energy: number;
  /** Scattered rays never scatter again — keeps fog bounded. */
  scattered: boolean;
}

const MAX_STEPS = 4000;
const MAX_EVENTS = 240;

const newMeta = (ray: Ray): SegmentMeta => ({
  sources: [ray.src],
  distance: ray.dist,
  reflections: ray.refl,
  splits: ray.splits,
  intensity: Math.max(0, Math.min(1, ray.energy / 2 ** Math.min(ray.splits, 10))),
  dirs: 1 << ray.dir,
});

const mergeMeta = (a: SegmentMeta, b: SegmentMeta): SegmentMeta => ({
  sources: a.sources.includes(b.sources[0]!) ? a.sources : [...a.sources, ...b.sources],
  distance: Math.min(a.distance, b.distance),
  reflections: Math.max(a.reflections, b.reflections),
  splits: Math.max(a.splits, b.splits),
  intensity: Math.min(1, a.intensity + b.intensity),
  dirs: a.dirs | b.dirs,
});

/** Per-cell energy multiplier of each material. */
const ABSORPTION: Partial<Record<Piece["kind"], number>> = {
  glass: 0.92,
  crystal: 0.88,
  water: 0.85,
};

export const materialBlurb: Partial<Record<Piece["kind"], string>> = {
  glass: "Transparent — light passes with a small energy loss.",
  crystal: "Passes light and throws rainbow caustics to either side.",
  water: "Absorbs the red channel and dims what remains.",
  fog: "Scatters light sideways and swallows most of its energy.",
};

/**
 * Pure beam tracer: (board, params) => beams. Deterministic, used by the
 * renderer, the puzzle validator, the studio editor, the laboratory and the
 * sandbox alike. Campaign play always uses DEFAULT_SIM.
 */
export function trace(board: Board, params: SimParams = DEFAULT_SIM): TraceResult {
  const sim = { ...DEFAULT_SIM, ...params };
  const segments: Segment[] = [];
  const hits: Record<string, ColorMask> = {};
  const events: BeamEvent[] = [];
  const seen = new Set<string>();
  const queue: Ray[] = [];

  const log = (
    kind: BeamEvent["kind"],
    cell: string,
    color: ColorMask,
    intensity: number,
    text: string,
  ) => {
    if (events.length >= MAX_EVENTS) return;
    events.push({ kind, cell, color, intensity, text });
  };

  for (const [k, piece] of Object.entries(board.cells)) {
    if (piece.kind === "emitter") {
      const parts = k.split(",");
      queue.push({
        x: Number(parts[0]),
        y: Number(parts[1]),
        dir: (piece.rot % 4) as Dir,
        color: piece.color ?? 7,
        src: k,
        dist: 0,
        refl: 0,
        splits: 0,
        energy: sim.beamIntensity,
        scattered: false,
      });
      log(
        "emit",
        k,
        piece.color ?? 7,
        sim.beamIntensity,
        `Emitter at ${k} fires ${colorName(piece.color ?? 7).toLowerCase()} light ${
          DIR_NAME[(piece.rot % 4) as Dir]
        }.`,
      );
    }
  }

  let steps = 0;
  while (queue.length && steps < MAX_STEPS) {
    const ray = queue.shift()!;
    steps++;
    if (!ray.color || ray.energy < sim.minIntensity) continue;

    const rayKey = `${ray.x},${ray.y},${ray.dir},${ray.color}`;
    if (seen.has(rayKey)) continue;
    seen.add(rayKey);

    const [dx, dy] = DELTA[ray.dir];
    const nx = ray.x + dx;
    const ny = ray.y + dy;
    if (nx < 0 || ny < 0 || nx >= board.width || ny >= board.height) {
      log("escape", key(ray.x, ray.y), ray.color, ray.energy, `Light leaves the board at ${ray.x},${ray.y}.`);
      continue;
    }

    const travelled = ray.energy * (1 - sim.attenuation);
    const next: Ray = { ...ray, x: nx, y: ny, dist: ray.dist + 1, energy: travelled };
    segments.push({
      x1: ray.x,
      y1: ray.y,
      x2: nx,
      y2: ny,
      color: ray.color,
      meta: newMeta(next),
    });

    const here = key(nx, ny);
    const piece: Piece | undefined = board.cells[here];
    if (!piece) {
      queue.push(next);
      continue;
    }

    switch (piece.kind) {
      case "wall":
      case "emitter":
        log("absorb", here, ray.color, next.energy, `${piece.kind === "wall" ? "Wall" : "Emitter body"} at ${here} stops the beam.`);
        break;
      case "target": {
        hits[here] = (hits[here] ?? 0) | ray.color;
        log("hit", here, ray.color, next.energy, `Target at ${here} receives ${colorName(ray.color).toLowerCase()}.`);
        break;
      }
      case "mirror":
        queue.push({
          ...next,
          dir: reflect(ray.dir, piece.rot),
          refl: ray.refl + 1,
          energy: next.energy * sim.reflectionEfficiency,
        });
        log("reflect", here, ray.color, next.energy, `Mirror at ${here} turns the beam ${DIR_NAME[reflect(ray.dir, piece.rot)]}.`);
        break;
      case "splitter":
        queue.push({ ...next, splits: ray.splits + 1 });
        queue.push({
          ...next,
          dir: reflect(ray.dir, piece.rot),
          refl: ray.refl + 1,
          splits: ray.splits + 1,
          energy: next.energy * sim.reflectionEfficiency,
        });
        log("split", here, ray.color, next.energy, `Splitter at ${here} sends light straight on and ${DIR_NAME[reflect(ray.dir, piece.rot)]} at once.`);
        break;
      case "filter": {
        const passed = ray.color & (piece.color ?? 7);
        if (passed) queue.push({ ...next, color: passed });
        log(
          "filter",
          here,
          passed,
          next.energy,
          passed
            ? `Filter at ${here} keeps only ${colorName(passed).toLowerCase()}.`
            : `Filter at ${here} blocks the beam entirely.`,
        );
        break;
      }
      case "prism": {
        // Splits a beam into its components: red goes straight,
        // green reflects one way, blue the other.
        const spread = Math.max(0.2, Math.min(1, sim.prismIndex));
        if (ray.color & 1) queue.push({ ...next, color: 1, splits: ray.splits + 1 });
        if (ray.color & 2)
          queue.push({
            ...next,
            color: 2,
            dir: reflect(ray.dir, 0),
            refl: ray.refl + 1,
            splits: ray.splits + 1,
            energy: next.energy * spread,
          });
        if (ray.color & 4)
          queue.push({
            ...next,
            color: 4,
            dir: reflect(ray.dir, 1),
            refl: ray.refl + 1,
            splits: ray.splits + 1,
            energy: next.energy * spread,
          });
        log("disperse", here, ray.color, next.energy, `Prism at ${here} separates the beam into its red, green and blue components.`);
        break;
      }
      case "glass": {
        queue.push({ ...next, energy: next.energy * (ABSORPTION["glass"] ?? 1) });
        log("attenuate", here, ray.color, next.energy, `Glass at ${here} passes the light, dimming it slightly.`);
        break;
      }
      case "water": {
        const passed = ray.color & 6 ? ray.color & 6 : ray.color;
        queue.push({ ...next, color: passed, energy: next.energy * (ABSORPTION["water"] ?? 1) });
        log("attenuate", here, passed, next.energy, `Water at ${here} absorbs red and dims the rest.`);
        break;
      }
      case "crystal": {
        const caustic = Math.max(0.1, Math.min(1, sim.prismIndex)) * 0.45;
        queue.push({ ...next, energy: next.energy * (ABSORPTION["crystal"] ?? 1) });
        if (!ray.scattered && ray.color & 1)
          queue.push({
            ...next,
            color: 1,
            dir: reflect(ray.dir, 0),
            refl: ray.refl + 1,
            splits: ray.splits + 1,
            energy: next.energy * caustic,
            scattered: true,
          });
        if (!ray.scattered && ray.color & 4)
          queue.push({
            ...next,
            color: 4,
            dir: reflect(ray.dir, 1),
            refl: ray.refl + 1,
            splits: ray.splits + 1,
            energy: next.energy * caustic,
            scattered: true,
          });
        log("disperse", here, ray.color, next.energy, `Crystal at ${here} passes the beam and throws rainbow caustics sideways.`);
        break;
      }
      case "fog": {
        const survive = Math.max(0.05, 1 - sim.scattering);
        queue.push({ ...next, energy: next.energy * survive });
        if (!ray.scattered) {
          for (const rot of [0, 1]) {
            queue.push({
              ...next,
              dir: reflect(ray.dir, rot),
              refl: ray.refl + 1,
              splits: ray.splits + 1,
              energy: next.energy * sim.scattering * 0.35,
              scattered: true,
            });
          }
        }
        log("scatter", here, ray.color, next.energy, `Fog at ${here} scatters light in every direction and swallows most of its energy.`);
        break;
      }
    }
  }

  // Merge overlapping segments so crossing beams mix colour.
  const merged = new Map<string, Segment>();
  for (const s of segments) {
    const a = `${s.x1},${s.y1}`;
    const b = `${s.x2},${s.y2}`;
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    const existing = merged.get(k);
    if (existing) {
      existing.color |= s.color;
      if (existing.meta && s.meta) existing.meta = mergeMeta(existing.meta, s.meta);
    } else {
      const copy: Segment = { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, color: s.color };
      if (s.meta) copy.meta = { ...s.meta };
      merged.set(k, copy);
    }
  }

  let targetCount = 0;
  let solvedCount = 0;
  for (const [k, piece] of Object.entries(board.cells)) {
    if (piece.kind !== "target") continue;
    targetCount++;
    if ((hits[k] ?? 0) === (piece.color ?? 7)) solvedCount++;
  }

  return {
    segments: [...merged.values()],
    hits,
    solved: targetCount > 0 && solvedCount === targetCount,
    targetCount,
    solvedCount,
    events,
  };
}

export const colorVar = (mask: ColorMask): string => {
  switch (mask & 7) {
    case 1:
      return "var(--beam-red)";
    case 2:
      return "var(--beam-green)";
    case 4:
      return "var(--beam-blue)";
    case 3:
      return "var(--beam-yellow)";
    case 5:
      return "var(--beam-magenta)";
    case 6:
      return "var(--beam-cyan)";
    case 7:
      return "var(--beam-white)";
    default:
      return "var(--beam-dark)";
  }
};

export const colorName = (mask: ColorMask): string =>
  ({ 1: "Red", 2: "Green", 4: "Blue", 3: "Yellow", 5: "Magenta", 6: "Cyan", 7: "White" })[
    mask & 7
  ] ?? "None";

/** Distinct glyph per colour so the game is playable without colour vision. */
export const colorGlyph = (mask: ColorMask): string =>
  ({ 1: "▲", 2: "■", 4: "●", 3: "◆", 5: "✦", 6: "⬢", 7: "★" })[mask & 7] ?? "·";

export const DIR_NAME = ["north", "east", "south", "west"] as const;

/** Human-readable list of travel directions from a Dir bitmask. */
export const dirNames = (mask: number): string =>
  DIR_NAME.filter((_, i) => mask & (1 << i)).join(" + ") || "—";

export const cloneBoard = (board: Board): Board => ({
  width: board.width,
  height: board.height,
  cells: Object.fromEntries(
    Object.entries(board.cells).map(([k, p]) => [k, { ...p }]),
  ),
  tray: board.tray.map((p) => ({ ...p })),
});
