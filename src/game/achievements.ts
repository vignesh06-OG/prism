/**
 * Mastery achievements. Nothing here unlocks for simply finishing a level —
 * every badge measures how the light was solved: efficiency, restraint,
 * colour work, speed and understanding of the engine.
 *
 * Stored locally and parsed defensively, like every other persisted value.
 */

const KEY = "prism.mastery.v1";
const MAX_IDS = 100;

export interface SolveReport {
  levelId: string;
  moves: number;
  par: number;
  seconds: number;
  undos: number;
  hintsUsed: number;
  mixedTargets: number;
  splits: number;
  reflections: number;
  totalSolved: number;
  perfectSolves: number;
}

export interface Achievement {
  id: string;
  name: string;
  blurb: string;
  /** Mastery tier, purely for presentation. */
  tier: "bronze" | "silver" | "gold";
  test: (r: SolveReport) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "optimal",
    name: "Optimal Path",
    blurb: "Solve a puzzle in par moves or fewer.",
    tier: "bronze",
    test: (r) => r.moves <= r.par,
  },
  {
    id: "no-undo",
    name: "First Intent",
    blurb: "Solve at par without a single undo.",
    tier: "silver",
    test: (r) => r.moves <= r.par && r.undos === 0,
  },
  {
    id: "unaided",
    name: "Unaided",
    blurb: "Solve a puzzle at par with no hint.",
    tier: "silver",
    test: (r) => r.hintsUsed === 0 && r.moves <= r.par,
  },
  {
    id: "chromatic",
    name: "Chromatic Mind",
    blurb: "Light a mixed-colour target.",
    tier: "bronze",
    test: (r) => r.mixedTargets > 0,
  },
  {
    id: "prismatic",
    name: "Prismatic",
    blurb: "Solve a puzzle that needed four or more splits.",
    tier: "gold",
    test: (r) => r.splits >= 4,
  },
  {
    id: "geometer",
    name: "Geometer",
    blurb: "Route light through six or more reflections.",
    tier: "silver",
    test: (r) => r.reflections >= 6,
  },
  {
    id: "swift",
    name: "Speed of Light",
    blurb: "Solve at par in under 30 seconds.",
    tier: "gold",
    test: (r) => r.seconds <= 30 && r.moves <= r.par,
  },
  {
    id: "flawless-3",
    name: "Flawless Three",
    blurb: "Earn three perfect par solves.",
    tier: "gold",
    test: (r) => r.perfectSolves >= 3,
  },
  {
    id: "spectrum",
    name: "Full Spectrum",
    blurb: "Complete every puzzle in the campaign.",
    tier: "gold",
    test: (r) => r.totalSolved >= 12,
  },
];

function safeParse(raw: string | null): unknown {
  if (!raw || raw.length > 10_000) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const VALID = new Set(ACHIEVEMENTS.map((a) => a.id));

export function loadUnlocked(): string[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse(window.localStorage.getItem(KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((id): id is string => typeof id === "string" && VALID.has(id))
    .slice(0, MAX_IDS);
}

/** Evaluates a solve and returns only the achievements newly unlocked. */
export function evaluate(report: SolveReport): Achievement[] {
  const already = new Set(loadUnlocked());
  const fresh = ACHIEVEMENTS.filter((a) => !already.has(a.id) && a.test(report));
  if (!fresh.length) return [];
  const next = [...already, ...fresh.map((a) => a.id)].slice(0, MAX_IDS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — badges are a nicety */
  }
  return fresh;
}
