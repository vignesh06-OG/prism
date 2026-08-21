/**
 * FIELD MISSIONS — real-world geometric optics.
 *
 * A Field Mission is not a grid puzzle. It is a single physical scenario with
 * one continuous control, solved by reasoning about a real optical law. The
 * geometry below is computed from the standard relations of geometric optics
 * (Snell's law, critical angle, prism deviation) — nothing is faked to make a
 * scenario "work", and every readout the player sees is derived, not authored.
 *
 * Scope note, stated honestly in-game as well: this is a ray/geometric model.
 * It does not simulate wave optics (interference, diffraction, polarisation).
 */
import { clampAsin, DEG, RAD, round, type SceneEl } from "./scene";

export type MissionCategory = "ANIMALS" | "REAL WORLD" | "SCIENCE";

export interface MissionFeedback {
  solved: boolean;
  /** The *kind* of mistake, so feedback is never a generic "wrong". */
  kind: "solved" | "path" | "angle" | "medium" | "concept" | "idle";
  message: string;
  /** Optional one-line "why" the player can open. */
  why?: string;
}

export interface Readout {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "muted";
}

export interface Mission {
  id: string;
  title: string;
  subtitle: string;
  category: MissionCategory;
  concept: string;
  /** Two sentences, maximum. Sets the scene, states the goal. */
  brief: string;
  goal: string;
  control: { label: string; unit: string; min: number; max: number; step: number; start: number };
  scene: (aim: number) => SceneEl[];
  readouts: (aim: number) => Readout[];
  evaluate: (aim: number) => MissionFeedback;
  /** Five rungs: observation → concept → data → method → formula. */
  hints: string[];
  /** Hidden in the scene; found by inspecting the marker, worth bonus score. */
  formula: { clue: string; expression: string; caption: string };
  discovery: {
    law: string;
    statement: string;
    usedIn: string[];
    /** Historically careful: development, not a single "discoverer". */
    history: string;
  };
}

const CYAN = "var(--beam-cyan)";
const WHITE = "var(--beam-white)";
const RED = "var(--beam-red)";
const BLUE = "var(--beam-blue)";
const DIM = "var(--beam-dark)";

/* ------------------------------------------------------------------ */
/* 1 — THE HUNGRY KINGFISHER : refraction, apparent position           */
/* ------------------------------------------------------------------ */

const N_WATER = 1.33;
const BIRD = { x: 12, y: 6 };
const SURFACE_Y = 24;
const FISH = { x: 64, y: 45 };
const H = SURFACE_Y - BIRD.y; // height above the surface
const D = FISH.y - SURFACE_Y; // depth of the fish

/** Where a dive launched at `aim` (degrees from the vertical) actually lands. */
function kingfisher(aim: number) {
  const t1 = aim * RAD;
  const entryX = BIRD.x + H * Math.tan(t1);
  const t2 = clampAsin(Math.sin(t1) / N_WATER);
  const hitX = entryX + D * Math.tan(t2);
  const apparentX = entryX + D * Math.tan(t1); // straight-line continuation
  return { entryX, t1, t2, hitX, apparentX };
}

const kingfisherMission: Mission = {
  id: "kingfisher",
  title: "The Hungry Kingfisher",
  subtitle: "A bird, a fish, and a surface that lies",
  category: "ANIMALS",
  concept: "Refraction & apparent position",
  brief:
    "A kingfisher hovers above still water and sees a fish below. The fish it sees is not where the fish is.",
  goal: "Aim the dive so the strike reaches the real fish.",
  control: { label: "Dive angle from vertical", unit: "°", min: 0, max: 75, step: 0.5, start: 20 },
  scene: (aim) => {
    const k = kingfisher(aim);
    const els: SceneEl[] = [
      { t: "rect", x: 0, y: SURFACE_Y, w: 100, h: 60 - SURFACE_Y, color: "transparent", fill: "color-mix(in oklab, var(--beam-blue) 14%, transparent)" },
      { t: "line", x1: 0, y1: SURFACE_Y, x2: 100, y2: SURFACE_Y, color: CYAN, w: 0.5 },
      { t: "line", x1: k.entryX, y1: SURFACE_Y - 9, x2: k.entryX, y2: SURFACE_Y + 9, color: DIM, dash: true, w: 0.35 },
      { t: "line", x1: BIRD.x, y1: BIRD.y, x2: k.entryX, y2: SURFACE_Y, color: WHITE, w: 0.9, glow: true },
      { t: "line", x1: k.entryX, y1: SURFACE_Y, x2: k.hitX, y2: FISH.y, color: CYAN, w: 0.9, glow: true },
      { t: "line", x1: k.entryX, y1: SURFACE_Y, x2: k.apparentX, y2: FISH.y, color: DIM, dash: true, w: 0.4 },
      { t: "dot", x: k.apparentX, y: FISH.y, color: DIM, r: 1.6 },
      { t: "text", x: k.apparentX + 3, y: FISH.y + 1, text: "apparent", color: "var(--muted-foreground)", size: 2.6 },
      { t: "dot", x: BIRD.x, y: BIRD.y, color: WHITE, r: 2, ring: true },
      { t: "text", x: BIRD.x, y: BIRD.y - 4, text: "kingfisher", anchor: "middle", size: 2.6 },
      { t: "dot", x: FISH.x, y: FISH.y, color: "var(--beam-yellow)", r: 2.2, ring: true },
      { t: "text", x: FISH.x, y: FISH.y + 6, text: "real fish", anchor: "middle", size: 2.6 },
    ];
    return els;
  },
  readouts: (aim) => {
    const k = kingfisher(aim);
    const miss = k.hitX - FISH.x;
    return [
      { label: "θ₁ in air", value: `${round(aim)}°` },
      { label: "θ₂ in water", value: `${round(k.t2 * DEG)}°` },
      { label: "Strike lands", value: `${miss > 0 ? "+" : ""}${round(miss)} beyond fish`, tone: Math.abs(miss) <= 1 ? "ok" : "warn" },
    ];
  },
  evaluate: (aim) => {
    const k = kingfisher(aim);
    const miss = k.hitX - FISH.x;
    if (Math.abs(miss) <= 1) {
      return { solved: true, kind: "solved", message: "Caught. You aimed at the fish, not at its image." };
    }
    if (Math.abs(k.apparentX - FISH.x) <= 1.5) {
      return {
        solved: false,
        kind: "concept",
        message: "Your line of sight is perfect — that is exactly where the fish appears. The strike still misses.",
        why: "The bird sees along the bent ray. A dive travels straight, so it must be aimed at the real position, not the image.",
      };
    }
    return miss > 0
      ? {
          solved: false,
          kind: "angle",
          message: "Your path is correct. Your angle isn't — you land beyond the fish.",
          why: "A steeper entry bends less far; the deeper leg is shorter than the line of sight suggests.",
        }
      : {
          solved: false,
          kind: "angle",
          message: "Too shallow an angle — you land short of the fish.",
          why: "Opening the angle moves the entry point along the surface, and the bent leg underwater carries the strike further out.",
        };
  },
  hints: [
    "The fish isn't where your eyes place it.",
    "Light changes direction when it crosses the water surface, so the image is displaced.",
    "Water's refractive index is approximately 1.33; air's is approximately 1.00.",
    "Look for the relationship between the angle above the surface and the angle below it.",
    "n₁ sin θ₁ = n₂ sin θ₂ — measure both angles from the surface normal.",
  ],
  formula: {
    clue: "A weathered field marker stands on the bank, half covered in silt.",
    expression: "n₁ sin θ₁ = n₂ sin θ₂",
    caption: "Angles are measured from the normal — the line perpendicular to the surface.",
  },
  discovery: {
    law: "REFRACTION",
    statement:
      "Light changes direction when it crosses between media, by an amount set by the two refractive indices.",
    usedIn: ["spearfishing", "camera lenses", "swimming-pool depth illusions"],
    history:
      "The relation was worked out over centuries — from Ptolemy's angle tables through Ibn Sahl's 10th-century construction, and later Harriot, Snell and Descartes. It is no single person's discovery.",
  },
};

/* ------------------------------------------------------------------ */
/* 2 — THE DARK CABLE : total internal reflection, acceptance cone     */
/* ------------------------------------------------------------------ */

const N_CORE = 1.5;
const N_CLAD = 1.45;
const THETA_C = clampAsin(N_CLAD / N_CORE) * DEG; // 75.16°
const NA = Math.sqrt(N_CORE * N_CORE - N_CLAD * N_CLAD); // 0.384
const ACCEPT = clampAsin(NA) * DEG; // 22.6°
const DETECTOR_MIN = 15;

function fibre(aim: number) {
  const tAir = aim * RAD;
  const tCore = clampAsin(Math.sin(tAir) / N_CORE);
  const wall = 90 - tCore * DEG; // angle at the core wall, from its normal
  return { tCore: tCore * DEG, wall, trapped: wall >= THETA_C };
}

const fibreMission: Mission = {
  id: "dark-cable",
  title: "The Dark Cable",
  subtitle: "A hospital link goes quiet at 3 a.m.",
  category: "REAL WORLD",
  concept: "Total internal reflection",
  brief:
    "A fibre link has gone dark. The launch angle at the connector was knocked out of alignment during a repair.",
  goal: "Re-aim the launch so the light stays trapped and still reaches the off-axis detector.",
  control: { label: "Launch angle into the core", unit: "°", min: 0, max: 40, step: 0.25, start: 33 },
  scene: (aim) => {
    const f = fibre(aim);
    const top = 22;
    const bot = 34;
    const core = bot - top;
    const startX = 18;
    const endX = 92;
    const els: SceneEl[] = [
      { t: "rect", x: startX, y: top, w: endX - startX, h: core, color: "transparent", fill: "color-mix(in oklab, var(--beam-cyan) 8%, transparent)" },
      { t: "line", x1: startX, y1: top, x2: endX, y2: top, color: CYAN, w: 0.5 },
      { t: "line", x1: startX, y1: bot, x2: endX, y2: bot, color: CYAN, w: 0.5 },
      { t: "text", x: startX + 2, y: top - 2.5, text: `cladding n = ${N_CLAD}`, size: 2.4 },
      { t: "text", x: startX + 2, y: bot + 4.5, text: `core n = ${N_CORE}`, size: 2.4 },
      { t: "line", x1: 4, y1: 28 - 12 * Math.tan(aim * RAD), x2: startX, y2: 28, color: WHITE, w: 0.8, glow: true },
      { t: "dot", x: 4, y: 28 - 12 * Math.tan(aim * RAD), color: WHITE, r: 1.6 },
    ];

    // zig-zag inside the core; axial run per bounce = core * tan(wall angle)
    const run = core * Math.tan(f.wall * RAD);
    let x = startX;
    let y = 28;
    let dirUp = true;
    let guard = 0;
    if (f.trapped && Number.isFinite(run) && run > 0.5) {
      // first partial leg to a wall
      const firstRun = (core / 2) * Math.tan(f.wall * RAD);
      let nx = Math.min(endX, x + firstRun);
      els.push({ t: "line", x1: x, y1: y, x2: nx, y2: nx === endX ? y - (nx - x) / Math.tan(f.wall * RAD) : top, color: CYAN, w: 0.9, glow: true });
      x = nx;
      y = top;
      while (x < endX && guard++ < 40) {
        nx = Math.min(endX, x + run);
        const ny = nx === endX ? (dirUp ? top + (nx - x) / Math.tan(f.wall * RAD) : bot - (nx - x) / Math.tan(f.wall * RAD)) : dirUp ? bot : top;
        els.push({ t: "line", x1: x, y1: y, x2: nx, y2: ny, color: CYAN, w: 0.9, glow: true });
        x = nx;
        y = ny;
        dirUp = !dirUp;
      }
    } else {
      // leaks out through the cladding at the first wall
      const firstRun = (core / 2) * Math.tan(f.wall * RAD);
      const lx = startX + (Number.isFinite(firstRun) ? Math.max(2, firstRun) : 8);
      els.push({ t: "line", x1: startX, y1: 28, x2: lx, y2: top, color: CYAN, w: 0.9, glow: true });
      els.push({ t: "line", x1: lx, y1: top, x2: lx + 12, y2: top - 10, color: RED, w: 0.7, dash: true });
      els.push({ t: "text", x: lx + 13, y: top - 10, text: "light escapes", color: RED, size: 2.6 });
    }

    els.push({ t: "line", x1: endX, y1: top - 3, x2: endX, y2: bot + 3, color: DIM, w: 0.4, dash: true });
    els.push({ t: "dot", x: endX + 4, y: 22, color: aim >= DETECTOR_MIN ? "var(--beam-yellow)" : DIM, r: 2, ring: true });
    els.push({ t: "text", x: endX + 4, y: 17, text: "detector", anchor: "middle", size: 2.6 });
    return els;
  },
  readouts: (aim) => {
    const f = fibre(aim);
    return [
      { label: "Angle at core wall", value: `${round(f.wall)}°` },
      { label: "Critical angle", value: `${round(THETA_C, 2)}°` },
      { label: "Guided", value: f.trapped ? "yes" : "no — refracts out", tone: f.trapped ? "ok" : "warn" },
    ];
  },
  evaluate: (aim) => {
    const f = fibre(aim);
    if (!f.trapped) {
      return {
        solved: false,
        kind: "medium",
        message: "You solved the aim. You used the wrong angle for the medium — the light leaves through the cladding.",
        why: `Below the critical angle (${round(THETA_C, 2)}° at the wall) part of the light refracts into the cladding instead of reflecting.`,
      };
    }
    if (aim < DETECTOR_MIN) {
      return {
        solved: false,
        kind: "path",
        message: "Guided, but too near the axis — the beam exits straight past the off-axis detector.",
        why: "Light leaves a fibre in a cone equal to the one it entered: the exit angle mirrors the launch angle.",
      };
    }
    return { solved: true, kind: "solved", message: "Link restored. Trapped by reflection alone, and landing on the detector." };
  },
  hints: [
    "The light is not being blocked. It is leaving the cable.",
    "Past a certain angle at the wall, none of the light escapes at all.",
    "Core index 1.50, cladding index 1.45 — those two numbers set the limit.",
    "Compare the angle at the wall with the angle whose sine is the ratio of the two indices.",
    "θc = arcsin(n₂ / n₁), and the guided cone in air satisfies sin θmax = √(n₁² − n₂²).",
  ],
  formula: {
    clue: "A service label is taped inside the splice tray, hidden under a cable loop.",
    expression: "θc = arcsin(n₂ / n₁)",
    caption: "Total internal reflection requires n₁ > n₂ and an angle of incidence above θc.",
  },
  discovery: {
    law: "TOTAL INTERNAL REFLECTION",
    statement:
      "Above the critical angle, light meeting a less dense medium is reflected entirely back inside.",
    usedIn: ["optical fibre", "endoscopes", "binocular prisms"],
    history:
      "Demonstrated in the 1840s with light guided along falling water jets by Colladon and Babinet; practical low-loss fibre followed in the 1960s–70s through work by Kao and others.",
  },
};

/* ------------------------------------------------------------------ */
/* 3 — THE SPLIT SKY : dispersion & minimum deviation                  */
/* ------------------------------------------------------------------ */

const APEX = 60;
const N_RED = 1.513;
const N_VIOLET = 1.532;

function deviation(aim: number, n: number) {
  const t1 = aim * RAD;
  const r1 = clampAsin(Math.sin(t1) / n);
  const r2 = APEX * RAD - r1;
  const s = n * Math.sin(r2);
  if (s > 1) return { tir: true, dev: NaN, t2: NaN };
  const t2 = clampAsin(s);
  return { tir: false, dev: (t1 + t2) * DEG - APEX, t2: t2 * DEG };
}

const MIN_DEV_AIM = clampAsin(N_RED * Math.sin((APEX / 2) * RAD)) * DEG; // ≈ 49.2°

const prismMission: Mission = {
  id: "split-sky",
  title: "The Split Sky",
  subtitle: "A bench, a prism and a wall of white light",
  category: "SCIENCE",
  concept: "Dispersion & minimum deviation",
  brief:
    "White light enters a 60° glass prism. Red and violet leave along different directions because the glass slows them differently.",
  goal: "Find the incidence angle where the spread stops moving — the angle of minimum deviation.",
  control: { label: "Angle of incidence", unit: "°", min: 30, max: 80, step: 0.25, start: 36 },
  scene: (aim) => {
    const apexPt: [number, number] = [50, 12];
    const left: [number, number] = [32, 44];
    const right: [number, number] = [68, 44];
    const r = deviation(aim, N_RED);
    const v = deviation(aim, N_VIOLET);
    const entry: [number, number] = [41, 28];
    const els: SceneEl[] = [
      { t: "poly", pts: [apexPt, left, right], color: CYAN, fill: "color-mix(in oklab, var(--beam-cyan) 7%, transparent)" },
      { t: "line", x1: 4, y1: entry[1] - (entry[0] - 4) * Math.tan((aim - 30) * RAD) * 0.35, x2: entry[0], y2: entry[1], color: WHITE, w: 1, glow: true },
      { t: "text", x: 4, y: 12, text: "white light", size: 2.6 },
    ];
    if (r.tir || v.tir) {
      els.push({ t: "line", x1: entry[0], y1: entry[1], x2: 59, y2: 28, color: RED, w: 0.8, dash: true });
      els.push({ t: "text", x: 61, y: 27, text: "trapped inside the glass", color: RED, size: 2.6 });
    } else {
      const exit: [number, number] = [59, 28];
      els.push({ t: "line", x1: entry[0], y1: entry[1], x2: exit[0], y2: exit[1], color: WHITE, w: 0.8 });
      const draw = (dev: number, color: string, label: string) => {
        const a = dev * RAD;
        els.push({
          t: "line",
          x1: exit[0],
          y1: exit[1],
          x2: exit[0] + 34 * Math.cos(a),
          y2: exit[1] + 34 * Math.sin(a),
          color,
          w: 0.9,
          glow: true,
        });
        els.push({
          t: "text",
          x: exit[0] + 36 * Math.cos(a),
          y: exit[1] + 36 * Math.sin(a),
          text: label,
          color,
          size: 2.6,
        });
      };
      draw(r.dev, RED, "red");
      draw(v.dev, BLUE, "violet");
    }
    return els;
  },
  readouts: (aim) => {
    const r = deviation(aim, N_RED);
    const v = deviation(aim, N_VIOLET);
    if (r.tir || v.tir) return [{ label: "Deviation", value: "no exit ray", tone: "warn" }];
    return [
      { label: "Deviation (red)", value: `${round(r.dev, 2)}°` },
      { label: "Deviation (violet)", value: `${round(v.dev, 2)}°` },
      { label: "Spread", value: `${round(v.dev - r.dev, 2)}°` },
    ];
  },
  evaluate: (aim) => {
    const r = deviation(aim, N_RED);
    if (r.tir) {
      return {
        solved: false,
        kind: "medium",
        message: "Nothing leaves the far face — the light is being reflected back inside the glass.",
        why: "At this incidence the internal angle at the second face exceeds the critical angle.",
      };
    }
    const off = aim - MIN_DEV_AIM;
    if (Math.abs(off) <= 1.2) {
      return {
        solved: true,
        kind: "solved",
        message: "Minimum deviation. The ray now passes symmetrically through the prism.",
      };
    }
    return {
      solved: false,
      kind: "angle",
      message:
        off < 0
          ? "Deviation is still falling as you increase the angle. You have not reached the turning point."
          : "You have passed the turning point — deviation is rising again.",
      why: "Deviation has a single minimum, where the path inside the prism is symmetric about the apex.",
    };
  },
  hints: [
    "Sweep the angle slowly and watch the deviation readout, not the picture.",
    "The deviation does not fall forever — it turns around.",
    "The prism apex angle is 60°; the glass index is about 1.513 for red light.",
    "At the turning point the ray inside the prism is symmetric: it enters and leaves at the same angle.",
    "At minimum deviation, r₁ = r₂ = A/2, so sin θ₁ = n sin(A/2).",
  ],
  formula: {
    clue: "A chalk note survives on the corner of the bench slate, mostly rubbed away.",
    expression: "n = sin((A + Dmin) / 2) / sin(A / 2)",
    caption: "The classic prism method for measuring a refractive index from a measured minimum deviation.",
  },
  discovery: {
    law: "DISPERSION",
    statement:
      "A medium's refractive index depends on wavelength, so a prism separates white light into a spread of colours.",
    usedIn: ["spectrometers", "rainbows", "refractive-index measurement"],
    history:
      "Prismatic colour was long attributed to the glass itself; Newton's 1660s experiments — including recombining the spread back into white — showed the colours were already present in the light.",
  },
};

export const MISSIONS: Mission[] = [kingfisherMission, fibreMission, prismMission];

export const getMission = (id: string) => MISSIONS.find((m) => m.id === id);

/**
 * Discovery Score. Hints cost, but a hinted solve is still a solve — the score
 * describes how much of the reasoning the player supplied, not a punishment.
 */
export function discoveryScore(input: {
  hintsUsed: number;
  wrongAttempts: number;
  formulaFound: boolean;
}) {
  const raw =
    100 - input.hintsUsed * 12 - Math.min(4, input.wrongAttempts) * 6 + (input.formulaFound ? 10 : 0);
  return Math.max(20, Math.min(110, Math.round(raw)));
}
