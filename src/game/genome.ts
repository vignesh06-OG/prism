/**
 * Puzzle Genome — a deterministic fingerprint and complexity profile for any
 * board. Everything is derived from the beam engine itself: no heuristics that
 * live outside the simulation, no network, no model.
 */
import { trace } from "./engine";
import { MATERIALS, type Board, type ColorMask } from "./types";

export interface Genome {
  /** Stable 12-char hash of the board layout. */
  fingerprint: string;
  beamInteractions: number;
  branchingFactor: number;
  colorMixingScore: number;
  materialLoad: number;
  pieceCount: number;
  targetCount: number;
  /** 0–100 complexity, comparable across puzzles. */
  complexity: number;
  strand: { label: string; value: number; display: string }[];
}

const popcount = (n: number) => (n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1);

/** FNV-1a — small, fast, deterministic across runtimes. */
function hash(input: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    a ^= input.charCodeAt(i);
    a = Math.imul(a, 0x01000193) >>> 0;
    b = Math.imul(b ^ input.charCodeAt(i), 0x85ebca6b) >>> 0;
  }
  return (a.toString(36) + b.toString(36)).toUpperCase().padEnd(12, "0").slice(0, 12);
}

export const fingerprintOf = (board: Board): string =>
  hash(
    `${board.width}x${board.height}|` +
      Object.entries(board.cells)
        .map(([k, p]) => `${k}:${p.kind}:${p.rot}:${p.color ?? 7}`)
        .sort()
        .join(";") +
      "|" +
      board.tray
        .map((p) => `${p.kind}:${p.color ?? 7}`)
        .sort()
        .join(","),
  );

export function genome(board: Board, depth = 0): Genome {
  const res = trace(board);
  const cells = Object.values(board.cells);
  const targets = cells.filter((p) => p.kind === "target");
  const splits = res.events.filter((e) => e.kind === "split" || e.kind === "disperse").length;
  const reflections = res.events.filter((e) => e.kind === "reflect").length;
  const materials = cells.filter((p) => MATERIALS.includes(p.kind)).length;

  const crossings = res.segments.filter((s) => popcount(s.color as ColorMask) > 1).length;
  const mixedTargets = targets.filter((p) => popcount(p.color ?? 7) > 1).length;
  const hues = new Set(targets.map((p) => p.color ?? 7)).size;

  const beamInteractions = reflections + splits + crossings;
  const branchingFactor = res.segments.length
    ? Number((1 + splits / Math.max(1, res.segments.length / 4)).toFixed(2))
    : 0;
  const colorMixingScore = Math.min(100, mixedTargets * 22 + hues * 9 + crossings * 4);

  const complexity = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        depth * 6 +
          beamInteractions * 2.4 +
          colorMixingScore * 0.28 +
          materials * 5 +
          targets.length * 4 +
          branchingFactor * 6,
      ),
    ),
  );

  return {
    fingerprint: fingerprintOf(board),
    beamInteractions,
    branchingFactor,
    colorMixingScore,
    materialLoad: materials,
    pieceCount: cells.length + board.tray.length,
    targetCount: targets.length,
    complexity,
    strand: [
      { label: "Beam interactions", value: Math.min(100, beamInteractions * 5), display: `${beamInteractions}` },
      { label: "Branching factor", value: Math.min(100, branchingFactor * 30), display: branchingFactor.toFixed(2) },
      { label: "Colour mixing", value: colorMixingScore, display: `${colorMixingScore}/100` },
      { label: "Solution depth", value: Math.min(100, depth * 12), display: depth ? `${depth} moves` : "—" },
      { label: "Material load", value: Math.min(100, materials * 20), display: `${materials}` },
    ],
  };
}
