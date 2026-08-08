/**
 * PhotonMind — calibration ledger and reasoning mirror.
 *
 * The difficulty model is only worth anything if we check it against reality.
 * Every solve writes one anonymous local row: what the model predicted before
 * the player started, and what actually happened. From that ledger we compute
 * mean absolute error, a calibration-derived confidence, and — crucially — an
 * honest "not enough evidence yet" state instead of a fabricated number.
 *
 * Nothing leaves the device. No identifiers, no timestamps beyond ordering.
 */

export interface SolveRow {
  levelId: string;
  /** Model output before the attempt. */
  predictedDifficulty: number;
  predictedSeconds: number;
  modelConfidence: number;
  /** Ground truth from the attempt. */
  seconds: number;
  moves: number;
  par: number;
  undos: number;
  hints: number;
  /** 0 = worked backwards from targets, 1 = worked forwards from emitters. */
  forwardBias: number;
}

const KEY = "prism.calibration.v1";
const MAX_ROWS = 200;
/** Below this the model must say it does not know. */
export const MIN_EVIDENCE = 4;

const num = (v: unknown, lo: number, hi: number): number | null => {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v * 1000) / 1000;
  return n < lo || n > hi ? null : n;
};

export function loadRows(): SolveRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw || raw.length > 80_000) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: SolveRow[] = [];
    for (const r of parsed.slice(-MAX_ROWS)) {
      if (typeof r !== "object" || r === null) continue;
      const o = r as Record<string, unknown>;
      const levelId = typeof o["levelId"] === "string" ? o["levelId"].slice(0, 12) : null;
      const pd = num(o["predictedDifficulty"], 0, 500);
      const ps = num(o["predictedSeconds"], 0, 10_000);
      const mc = num(o["modelConfidence"], 0, 1);
      const s = num(o["seconds"], 0, 100_000);
      const m = num(o["moves"], 0, 9_999);
      const p = num(o["par"], 0, 9_999);
      const u = num(o["undos"], 0, 9_999);
      const h = num(o["hints"], 0, 99);
      const f = num(o["forwardBias"], 0, 1);
      if (
        !levelId || !/^[a-z0-9-]+$/i.test(levelId) ||
        pd === null || ps === null || mc === null || s === null ||
        m === null || p === null || u === null || h === null || f === null
      ) continue;
      out.push({
        levelId,
        predictedDifficulty: pd,
        predictedSeconds: ps,
        modelConfidence: mc,
        seconds: s,
        moves: m,
        par: p,
        undos: u,
        hints: h,
        forwardBias: f,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function recordSolveRow(row: SolveRow): SolveRow[] {
  if (typeof window === "undefined") return [];
  const rows = [...loadRows(), row].slice(-MAX_ROWS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
  return rows;
}

export interface Calibration {
  n: number;
  /** True when the ledger is too thin to make any claim. */
  unknown: boolean;
  /** Mean absolute error of the solve-time prediction, in seconds. */
  timeMae: number;
  /** Signed bias: positive = the model expects puzzles to take longer than they do. */
  timeBias: number;
  /** Share of attempts whose true time fell inside the model's ±50% band. */
  hitRate: number;
  /** Empirical confidence, derived from the ledger rather than asserted. */
  confidence: number;
  verdict: string;
}

export function calibrate(rows: SolveRow[]): Calibration {
  const n = rows.length;
  if (n < MIN_EVIDENCE) {
    return {
      n,
      unknown: true,
      timeMae: 0,
      timeBias: 0,
      hitRate: 0,
      confidence: 0,
      verdict:
        `I don't know yet. ${n} of ${MIN_EVIDENCE} solves recorded — with this little evidence any accuracy figure I gave you would be made up.`,
    };
  }
  let absErr = 0;
  let bias = 0;
  let hits = 0;
  for (const r of rows) {
    absErr += Math.abs(r.predictedSeconds - r.seconds);
    bias += r.predictedSeconds - r.seconds;
    if (r.seconds >= r.predictedSeconds * 0.5 && r.seconds <= r.predictedSeconds * 1.5) hits++;
  }
  const timeMae = absErr / n;
  const hitRate = hits / n;
  const meanTrue = rows.reduce((a, r) => a + r.seconds, 0) / n || 1;
  const confidence = Math.max(0.05, Math.min(0.95, 1 - timeMae / Math.max(20, meanTrue * 1.5)));
  const verdict =
    hitRate >= 0.6
      ? `Calibrated: ${Math.round(hitRate * 100)}% of your solves landed inside the predicted band.`
      : bias > 0
        ? "Over-estimating: the model consistently expects these puzzles to take you longer than they do."
        : "Under-estimating: you are spending longer than the model expects — its priors do not match your play yet.";
  return { n, unknown: false, timeMae, timeBias: bias / n, hitRate, confidence, verdict };
}

/* ------------------------------------------------------------------ */
/* Reasoning mirror                                                     */
/* ------------------------------------------------------------------ */

export interface ReasoningTrait {
  label: string;
  /** 0–1 position on the axis, with `low`/`high` naming the two poles. */
  value: number;
  low: string;
  high: string;
  note: string;
}

export interface ReasoningProfile {
  n: number;
  unknown: boolean;
  headline: string;
  traits: ReasoningTrait[];
}

/**
 * Describes *how* the player thinks, never how good they are. Every phrasing is
 * neutral: both ends of every axis are legitimate strategies.
 */
export function reasoningProfile(rows: SolveRow[]): ReasoningProfile {
  const n = rows.length;
  if (n < MIN_EVIDENCE) {
    return {
      n,
      unknown: true,
      headline:
        `Not enough play to mirror your style yet — ${n} of ${MIN_EVIDENCE} solves. Solve a few more and this fills in.`,
      traits: [],
    };
  }
  const avg = (f: (r: SolveRow) => number) => rows.reduce((a, r) => a + f(r), 0) / n;
  const forward = avg((r) => r.forwardBias);
  const efficiency = Math.max(0, Math.min(1, avg((r) => Math.min(1, r.par / Math.max(1, r.moves)))));
  const experimentation = Math.max(
    0,
    Math.min(1, avg((r) => Math.min(1, r.undos / Math.max(2, r.par)))),
  );
  const persistence = Math.max(0, Math.min(1, 1 - avg((r) => Math.min(1, r.hints / 2))));
  const deliberation = Math.max(
    0,
    Math.min(1, avg((r) => Math.min(1, r.seconds / Math.max(30, r.par * 45)))),
  );

  const traits: ReasoningTrait[] = [
    {
      label: "Direction of reasoning",
      value: forward,
      low: "From the target back",
      high: "From the emitter out",
      note:
        forward > 0.62
          ? "You usually start where the light starts and follow it forward."
          : forward < 0.38
            ? "You usually start at the target, name the colour it needs, and work backwards."
            : "You switch ends depending on the puzzle — a flexible approach.",
    },
    {
      label: "Route economy",
      value: efficiency,
      low: "Explores widely",
      high: "Finds the short route",
      note:
        efficiency > 0.85
          ? "Your solutions land on or near the optimal move count."
          : "You reach solutions by trying routes rather than by pre-planning them — a perfectly valid strategy.",
    },
    {
      label: "Experimentation",
      value: experimentation,
      low: "Commits early",
      high: "Tests before committing",
      note:
        experimentation > 0.5
          ? "You test hypotheses and rewind freely — the sandbox instinct."
          : "You tend to commit to a plan and follow it through.",
    },
    {
      label: "Self-reliance",
      value: persistence,
      low: "Uses the tutor",
      high: "Solves unaided",
      note:
        persistence > 0.8
          ? "You almost never take a nudge."
          : "You use the tutor as a thinking partner rather than a solution key.",
    },
    {
      label: "Pace",
      value: deliberation,
      low: "Fast, iterative",
      high: "Slow, deliberate",
      note:
        deliberation > 0.6
          ? "You spend real time reading the board before moving."
          : "You think by moving — fast loops of try and observe.",
    },
  ];

  const headline =
    forward < 0.38
      ? "You are a backward reasoner: you decide what the target demands, then build a route that can deliver it."
      : efficiency > 0.85
        ? "You are an optimiser: you look for the shortest route rather than the first one that works."
        : experimentation > 0.5
          ? "You are an experimenter: you learn the system by perturbing it, then converge."
          : "You are a planner: you form a route in your head and execute it.";

  return { n, unknown: false, headline, traits };
}

/**
 * Forward vs backward bias for a single attempt: how close the player's early
 * moves sat to the emitters compared with the targets.
 */
export function forwardBiasOf(
  touchedCells: string[],
  emitters: string[],
  targets: string[],
): number {
  if (!touchedCells.length || !emitters.length || !targets.length) return 0.5;
  const parse = (k: string) => k.split(",").map(Number) as [number, number];
  const dist = (a: string, list: string[]) => {
    const [ax, ay] = parse(a);
    return Math.min(
      ...list.map((b) => {
        const [bx, by] = parse(b);
        return Math.abs(ax - bx) + Math.abs(ay - by);
      }),
    );
  };
  const early = touchedCells.slice(0, Math.max(2, Math.ceil(touchedCells.length / 2)));
  let score = 0;
  for (const c of early) {
    const de = dist(c, emitters);
    const dt = dist(c, targets);
    score += de + dt === 0 ? 0.5 : dt / (de + dt);
  }
  return Math.max(0, Math.min(1, score / early.length));
}
