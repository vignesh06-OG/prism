/**
 * PhotonMind — feature extraction.
 *
 * Every feature is computed from the board and a single forward trace of the
 * light engine. Crucially, none of them require search: this is what lets the
 * learned model predict difficulty in microseconds where the exhaustive BFS
 * solver needs to expand tens of thousands of states.
 */
import { trace } from "../engine";
import { MATERIALS, key, type Board, type ColorMask } from "../types";

export const FEATURE_KEYS = [
  "area",
  "pieces",
  "tray",
  "targets",
  "mixedTargets",
  "hues",
  "mirrors",
  "splitters",
  "filters",
  "materials",
  "walls",
  "segments",
  "reflections",
  "splits",
  "litFraction",
  "spread",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type FeatureVector = Record<FeatureKey, number>;

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  area: "Board area",
  pieces: "Placed pieces",
  tray: "Tray pieces",
  targets: "Targets",
  mixedTargets: "Mixed-colour targets",
  hues: "Distinct target hues",
  mirrors: "Mirrors",
  splitters: "Splitters & prisms",
  filters: "Filters",
  materials: "Optical materials",
  walls: "Walls",
  segments: "Beam segments",
  reflections: "Reflection events",
  splits: "Split / disperse events",
  litFraction: "Targets already lit",
  spread: "Emitter→target spread",
};

/**
 * Normalisation ranges. Fixed at authoring time so a model trained today keeps
 * predicting the same numbers tomorrow — no drifting scalers.
 */
const RANGE: Record<FeatureKey, number> = {
  area: 121,
  pieces: 24,
  tray: 6,
  targets: 4,
  mixedTargets: 4,
  hues: 3,
  mirrors: 10,
  splitters: 6,
  filters: 4,
  materials: 6,
  walls: 8,
  segments: 40,
  reflections: 16,
  splits: 10,
  litFraction: 1,
  spread: 20,
};

const popcount = (n: number) => (n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1);

export function extractFeatures(board: Board): FeatureVector {
  const res = trace(board);
  const cells = Object.entries(board.cells);
  const values = cells.map(([, p]) => p);
  const targets = values.filter((p) => p.kind === "target");
  const emitters = cells.filter(([, p]) => p.kind === "emitter");
  const targetCells = cells.filter(([, p]) => p.kind === "target");

  let spread = 0;
  for (const [ek] of emitters) {
    for (const [tk] of targetCells) {
      const [ex, ey] = ek.split(",").map(Number) as [number, number];
      const [tx, ty] = tk.split(",").map(Number) as [number, number];
      spread = Math.max(spread, Math.abs(ex - tx) + Math.abs(ey - ty));
    }
  }

  const lit = targetCells.filter(([k, p]) => {
    const got = res.hits[k];
    return got !== undefined && got === (p.color ?? 7);
  }).length;

  return {
    area: board.width * board.height,
    pieces: values.length,
    tray: board.tray.length,
    targets: targets.length,
    mixedTargets: targets.filter((p) => popcount((p.color ?? 7) as ColorMask) > 1).length,
    hues: new Set(targets.map((p) => p.color ?? 7)).size,
    mirrors:
      values.filter((p) => p.kind === "mirror").length +
      board.tray.filter((p) => p.kind === "mirror").length,
    splitters:
      values.filter((p) => p.kind === "splitter" || p.kind === "prism").length +
      board.tray.filter((p) => p.kind === "splitter" || p.kind === "prism").length,
    filters: values.filter((p) => p.kind === "filter").length,
    materials: values.filter((p) => MATERIALS.includes(p.kind)).length,
    walls: values.filter((p) => p.kind === "wall").length,
    segments: res.segments.length,
    reflections: res.events.filter((e) => e.kind === "reflect").length,
    splits: res.events.filter((e) => e.kind === "split" || e.kind === "disperse").length,
    litFraction: targets.length ? lit / targets.length : 0,
    spread,
  };
}

/** Scaled copy of a feature vector, clamped to [0, 1.5]. */
export function normalise(f: FeatureVector): number[] {
  return FEATURE_KEYS.map((k) => Math.min(1.5, f[k] / RANGE[k]));
}

/** Convenience for callers that only need a stable cell id. */
export const cellKey = key;
