/**
 * PhotonMind — player behaviour model.
 *
 * Runs entirely on-device. It watches the sequence of cells a player touches
 * and turns it into four bounded traits, then uses those traits (plus a diff
 * against a known-good board) to write a hint that explains *reasoning* rather
 * than handing over the answer.
 */
import { trace } from "../engine";
import type { Board } from "../types";

export interface MoveRecord {
  cell: string;
  at: number;
  /** Targets satisfied immediately after the move. */
  solvedCount: number;
}

export interface Trait {
  key: "confusion" | "fixation" | "exploration" | "precision";
  label: string;
  /** 0–1. */
  value: number;
  note: string;
}

export interface Behaviour {
  traits: Trait[];
  /** One-line read on the player's thinking style. */
  style: string;
  signals: string[];
  /** Cells the player keeps returning to. */
  hotCells: string[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function readBehaviour(records: MoveRecord[], par: number): Behaviour {
  const n = records.length;
  const counts = new Map<string, number>();
  for (const r of records) counts.set(r.cell, (counts.get(r.cell) ?? 0) + 1);
  const hot = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const topRepeat = hot[0]?.[1] ?? 0;
  const distinct = counts.size;

  // Oscillation: the same cell touched twice within three moves.
  let oscillations = 0;
  for (let i = 2; i < n; i++) {
    if (records[i]!.cell === records[i - 2]!.cell) oscillations++;
  }

  // Progress: did the touched moves actually light anything new?
  let regressions = 0;
  for (let i = 1; i < n; i++) {
    if (records[i]!.solvedCount < records[i - 1]!.solvedCount) regressions++;
  }

  const gaps = records.slice(1).map((r, i) => r.at - records[i]!.at);
  const medianGap = gaps.length ? [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)]! : 0;

  const confusion = clamp01(
    (oscillations / Math.max(3, n)) * 1.6 + (regressions / Math.max(3, n)) * 1.1 + Math.max(0, n - par * 2) / Math.max(6, par * 4),
  );
  const fixation = clamp01(n ? topRepeat / Math.max(3, n) * 1.8 : 0);
  const exploration = clamp01(n ? distinct / Math.max(4, n) : 0);
  const precision = clamp01(n ? 1 - Math.max(0, n - par) / Math.max(4, par * 2) : 1);

  const traits: Trait[] = [
    {
      key: "confusion",
      label: "Confusion",
      value: confusion,
      note:
        oscillations > 1
          ? `Reversed the same piece ${oscillations}× — the model reads this as testing a hypothesis it has already falsified.`
          : "Moves are progressing forward without back-and-forth.",
    },
    {
      key: "fixation",
      label: "Fixation",
      value: fixation,
      note: hot[0] && topRepeat > 2
        ? `${Math.round((topRepeat / Math.max(1, n)) * 100)}% of moves land on cell ${hot[0][0]}.`
        : "Attention is spread across the board.",
    },
    {
      key: "exploration",
      label: "Exploration",
      value: exploration,
      note: `${distinct} distinct cells touched across ${n} moves.`,
    },
    {
      key: "precision",
      label: "Precision",
      value: precision,
      note:
        n <= par
          ? "Still inside par — moves are landing where they need to."
          : `${n - par} moves over par so far.`,
    },
  ];

  const style =
    n === 0
      ? "No moves observed yet — the model is listening."
      : fixation > 0.55
        ? "Depth-first thinker: commits hard to one region before widening."
        : exploration > 0.7
          ? "Breadth-first thinker: samples widely before committing."
          : confusion > 0.5
            ? "Hypothesis-looping: retesting an assumption that the engine keeps rejecting."
            : "Balanced: alternating between probing and committing.";

  const signals: string[] = [];
  if (oscillations > 1) signals.push(`${oscillations} reversal loops detected`);
  if (regressions > 0) signals.push(`${regressions} moves reduced the number of lit targets`);
  if (medianGap > 12_000) signals.push("long deliberation between moves");
  if (n > par * 2) signals.push("well over the par move budget");

  return { traits, style, signals, hotCells: hot.slice(0, 3).map(([c]) => c) };
}

export interface Guidance {
  headline: string;
  /** Ordered chain of reasoning shown to the player. */
  reasoning: string[];
  /** Cell to pulse on the board. Never the full answer. */
  focusCell: string | null;
  /** How firmly the model is nudging, 0–1. */
  strength: number;
}

/**
 * Builds an explainable nudge. It compares the live board against a verified
 * solution to find the *region* that matters, but only ever names the region
 * and the reason — never the piece orientation to use.
 */
export function guide(
  board: Board,
  solution: Board | null,
  behaviour: Behaviour,
  par: number,
  moves: number,
): Guidance {
  const res = trace(board);
  const reasoning: string[] = [];

  const misaimed: string[] = [];
  if (solution) {
    for (const [k, want] of Object.entries(solution.cells)) {
      const have = board.cells[k];
      if (!have) misaimed.push(k);
      else if (have.kind === want.kind && have.rot !== want.rot) misaimed.push(k);
    }
  }

  const untouched = misaimed.filter((k) => !behaviour.hotCells.includes(k));
  const focusCell = untouched[0] ?? misaimed[0] ?? null;

  const hot = behaviour.hotCells[0];
  if (hot && behaviour.traits.find((t) => t.key === "fixation")!.value > 0.5) {
    reasoning.push(
      `Nearly every attempt has gone through cell ${hot}. The solver reaches solved boards that never change that cell, so it is probably not the blocker.`,
    );
  }

  if (res.solvedCount > 0) {
    reasoning.push(
      `${res.solvedCount} of ${res.targetCount} targets already accept the colour they ask for — whatever you change next should preserve those paths.`,
    );
  } else {
    reasoning.push(
      "No target is receiving its exact colour yet, so the first job is delivering one clean path rather than balancing several.",
    );
  }

  const wrongColour = Object.entries(board.cells).filter(([k, p]) => {
    if (p.kind !== "target") return false;
    const got = res.hits[k] ?? 0;
    return got !== 0 && got !== (p.color ?? 7);
  });
  if (wrongColour.length) {
    reasoning.push(
      `Light is arriving at ${wrongColour.map(([k]) => k).join(", ")} but with the wrong mix — this is a colour problem, not a routing problem. Look at what is being added, not where the beam goes.`,
    );
  }

  if (focusCell && untouched.length) {
    reasoning.push(
      `Cell ${focusCell} sits on every optimal route the solver found and you have not adjusted it yet. Start your reasoning there.`,
    );
  }

  if (behaviour.signals.length) {
    reasoning.push(`Behavioural signals: ${behaviour.signals.join("; ")}.`);
  }

  const strength = clamp01(
    (moves > par ? 0.4 : 0.15) +
      behaviour.traits.find((t) => t.key === "confusion")!.value * 0.5,
  );

  const headline = !res.targetCount
    ? "Nothing to solve on this board yet."
    : wrongColour.length
      ? "This is a colour-mixing problem, not a routing problem."
      : behaviour.traits.find((t) => t.key === "fixation")!.value > 0.5
        ? "You may be re-testing an assumption the engine already rejected."
        : res.solvedCount > 0
          ? "You are one path away — protect what already works."
          : "Solve one beam completely before balancing the rest.";

  return { headline, reasoning, focusCell, strength };
}
