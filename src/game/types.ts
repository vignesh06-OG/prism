export type Dir = 0 | 1 | 2 | 3; // 0 = north, 1 = east, 2 = south, 3 = west

/** Colour is an additive RGB bitmask: 1 = red, 2 = green, 4 = blue. */
export type ColorMask = number;

export const RED = 1;
export const GREEN = 2;
export const BLUE = 4;
export const WHITE = 7;

export type PieceKind =
  | "emitter"
  | "target"
  | "mirror"
  | "splitter"
  | "filter"
  | "prism"
  | "wall"
  | "glass"
  | "crystal"
  | "water"
  | "fog";

/** Materials attenuate or scatter light instead of routing it. */
export const MATERIALS: PieceKind[] = ["glass", "crystal", "water", "fog"];

export interface Piece {
  id: string;
  kind: PieceKind;
  /** For mirrors/splitters/prisms: 0 = "/", 1 = "\". For emitters: the Dir it fires. */
  rot: number;
  /** Emitter beam colour, target required colour, filter pass mask. */
  color?: ColorMask;
  /** Fixed pieces cannot be rotated, moved or removed by the player. */
  fixed?: boolean;
}

export interface Board {
  width: number;
  height: number;
  /** Keyed by `${x},${y}` */
  cells: Record<string, Piece>;
  /** Pieces the player still has to place. */
  tray: Piece[];
}

/** Coarse difficulty band, used for level presentation only. */
export type LevelTier = "Gentle" | "Testing" | "Demanding" | "Master";

export interface Level {
  id: string;
  chapter: number;
  index: number;
  name: string;
  hint: string;
  /** The reasoning pattern this level is built around. */
  concept?: string;
  /** Difficulty band shown on the level card. */
  tier?: LevelTier;
  /** Introduces a new mechanic — shown as a teaching card. */
  teaches?: string;
  par: number;
  board: Board;
}

/**
 * Tunable physics for the Light Laboratory. The defaults are the shipping
 * constants — campaign play always traces with DEFAULT_SIM, so gameplay stays
 * deterministic no matter what is dialled in the lab.
 */
export interface SimParams {
  /** Energy retained per reflection (mirror / splitter / crystal). */
  reflectionEfficiency: number;
  /** Energy lost per cell travelled. */
  attenuation: number;
  /** Dispersion strength of prisms and crystals. */
  prismIndex: number;
  /** Emitter output energy. */
  beamIntensity: number;
  /** How much fog bleeds light sideways. */
  scattering: number;
  /** Rays below this energy stop propagating. */
  minIntensity: number;
}

export const DEFAULT_SIM: SimParams = {
  reflectionEfficiency: 1,
  attenuation: 0,
  prismIndex: 1,
  beamIntensity: 1,
  scattering: 0.5,
  minIntensity: 0.02,
};

export type BeamEventKind =
  | "emit"
  | "reflect"
  | "split"
  | "disperse"
  | "filter"
  | "absorb"
  | "attenuate"
  | "scatter"
  | "hit"
  | "escape";

/** A single decision the tracer made — the source of Commentary Mode. */
export interface BeamEvent {
  kind: BeamEventKind;
  /** Cell where it happened. */
  cell: string;
  color: ColorMask;
  intensity: number;
  /** Plain-English explanation of the engine decision. */
  text: string;
}

/** Live telemetry for a single beam edge — powers the beam inspector. */
export interface SegmentMeta {
  /** Cell keys of every emitter whose light reaches this edge. */
  sources: string[];
  /** Shortest hop count from an emitter to this edge. */
  distance: number;
  /** Reflections the light took to get here (mirrors + splitters). */
  reflections: number;
  /** Splits (splitters / prisms) the light passed through. */
  splits: number;
  /** Relative intensity, 1 = untouched emitter output. */
  intensity: number;
  /** Directions of travel across this edge, as a Dir bitmask. */
  dirs: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: ColorMask;
  meta?: SegmentMeta;
}


export interface TraceResult {
  segments: Segment[];
  /** Colour delivered into each target cell, keyed by `${x},${y}` */
  hits: Record<string, ColorMask>;
  solved: boolean;
  targetCount: number;
  solvedCount: number;
  /** Ordered log of every interaction, for Commentary Mode. */
  events: BeamEvent[];
}

export const key = (x: number, y: number) => `${x},${y}`;
export const parseKey = (k: string): [number, number] => {
  const parts = k.split(",");
  return [Number(parts[0]), Number(parts[1])];
};

export const DELTA: Record<Dir, [number, number]> = {
  0: [0, -1],
  1: [1, 0],
  2: [0, 1],
  3: [-1, 0],
};
