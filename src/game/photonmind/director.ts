/**
 * PhotonMind — Game Director.
 *
 * A transparent decision layer, not a chatbot and not a solver. It reads
 * telemetry the game already produces, classifies the player's state, and
 * chooses one rung of an escalating intervention ladder — including rung zero,
 * silence, which it picks deliberately and says so.
 *
 *   TELEMETRY  →  PLAYER STATE  →  INTERVENTION DECISION
 *
 * Two rules are load-bearing:
 *   1. The director may choose to do nothing, and must explain that choice too.
 *   2. Rung 5 (explicit solution assistance) is only ever reachable when the
 *      player asks for it by name. Nothing here escalates into it on its own.
 *
 * Everything below is a pure function of its inputs: no timers, no randomness,
 * no network. The deterministic BFS solver remains the only source of truth —
 * the director merely decides whether and how to speak.
 */
import type { Behaviour } from "./behaviour";
import type { Board } from "../types";

export type PlayerState = "FLOWING" | "EXPLORING" | "UNCERTAIN" | "STRUGGLING" | "STUCK";

/** 0 silence · 1 observation · 2 concept · 3 local · 4 what-if · 5 explicit. */
export type Rung = 0 | 1 | 2 | 3 | 4 | 5;

export interface Telemetry {
  moves: number;
  par: number;
  undos: number;
  resets: number;
  /** Milliseconds since the last committed move. */
  idleMs: number;
  /** How many times the player asked for help on this attempt. */
  hintsRequested: number;
  /** True only when the player explicitly asked for solution assistance. */
  solutionRequested: boolean;
  solvedCount: number;
  targetCount: number;
  /** Targets receiving light of the wrong mix. */
  misrouted: number;
  behaviour: Behaviour;
  /** Verified solution board, when the off-thread solver has produced one. */
  solution: Board | null;
  board: Board;
}

export interface Decision {
  state: PlayerState;
  rung: Rung;
  silent: boolean;
  /** One line, always shown. */
  headline: string;
  /** The intervention itself, or the reason for staying quiet. */
  body: string;
  /** Why the director acted — the observations behind the decision. */
  evidence: string[];
  /** Region to highlight. Only populated from rung 3 upward. */
  focusCell: string | null;
  /** Label describing the rung, for the UI badge. */
  rungLabel: string;
}

const RUNG_LABELS: Record<Rung, string> = {
  0: "Silence",
  1: "Observation",
  2: "Concept",
  3: "Region",
  4: "What-if",
  5: "Assisted",
};

const traitOf = (b: Behaviour, key: Behaviour["traits"][number]["key"]) =>
  b.traits.find((t) => t.key === key)?.value ?? 0;

/** Cells the solver changes that the player has not touched at all. */
function untouchedPivots(t: Telemetry): string[] {
  if (!t.solution) return [];
  const out: string[] = [];
  for (const [k, want] of Object.entries(t.solution.cells)) {
    const have = t.board.cells[k];
    if (!have || (have.kind === want.kind && have.rot !== want.rot)) {
      if (!t.behaviour.hotCells.includes(k)) out.push(k);
    }
  }
  return out;
}

export function classify(t: Telemetry): { state: PlayerState; evidence: string[] } {
  const evidence: string[] = [];
  const confusion = traitOf(t.behaviour, "confusion");
  const fixation = traitOf(t.behaviour, "fixation");
  const exploration = traitOf(t.behaviour, "exploration");
  const progress = t.targetCount ? t.solvedCount / t.targetCount : 0;
  const overPar = t.moves - t.par;

  if (t.moves === 0) {
    evidence.push("no moves committed yet — nothing to read");
    return { state: t.idleMs > 45_000 ? "UNCERTAIN" : "EXPLORING", evidence };
  }

  if (t.idleMs > 50_000) evidence.push(`${Math.round(t.idleMs / 1000)}s since your last move`);
  if (overPar > 0) evidence.push(`${overPar} moves past par ${t.par}`);
  if (t.resets > 0) evidence.push(`${t.resets} full reset${t.resets > 1 ? "s" : ""}`);
  if (t.undos > 1) evidence.push(`${t.undos} undos`);
  if (fixation > 0.5 && t.behaviour.hotCells[0]) {
    evidence.push(`most moves land on the same cell (${t.behaviour.hotCells[0]})`);
  }
  if (confusion > 0.5) evidence.push("repeated reversals of pieces already tested");
  if (progress > 0) evidence.push(`${t.solvedCount}/${t.targetCount} targets already accepted`);
  if (t.misrouted > 0) evidence.push(`${t.misrouted} target${t.misrouted > 1 ? "s" : ""} lit with the wrong mix`);

  const stuck = t.idleMs > 50_000 || (overPar > t.par && confusion > 0.55) || t.resets >= 2;
  if (stuck) return { state: "STUCK", evidence };
  if (overPar > Math.max(2, t.par * 0.75) || confusion > 0.6) {
    return { state: "STRUGGLING", evidence };
  }
  if (confusion > 0.35 || fixation > 0.6) return { state: "UNCERTAIN", evidence };
  if (exploration > 0.65 && progress < 1) return { state: "EXPLORING", evidence };
  return { state: "FLOWING", evidence };
}

/**
 * Picks the rung. Escalation comes from state plus how many times the player
 * has asked; it never jumps to 5 on its own.
 */
function chooseRung(state: PlayerState, t: Telemetry): Rung {
  if (t.solutionRequested) return 5;
  const base: Record<PlayerState, Rung> = {
    FLOWING: 0,
    EXPLORING: 0,
    UNCERTAIN: 1,
    STRUGGLING: 2,
    STUCK: 3,
  };
  const asked = Math.min(2, t.hintsRequested);
  const rung = Math.min(4, base[state] + asked);
  return rung as Rung;
}

export function direct(t: Telemetry): Decision {
  const { state, evidence } = classify(t);
  const rung = chooseRung(state, t);
  const pivots = untouchedPivots(t);
  const focusCell = rung >= 3 ? (pivots[0] ?? null) : null;
  const hot = t.behaviour.hotCells[0] ?? null;

  if (rung === 0) {
    return {
      state,
      rung,
      silent: true,
      headline: "PhotonMind is staying silent.",
      body:
        state === "FLOWING"
          ? "You are inside par and the board is moving in the right direction. Nothing useful can be added right now."
          : "You are sampling the board rather than repeating yourself. That is exactly how this puzzle is meant to be read.",
      evidence: evidence.length ? evidence : ["telemetry shows productive, non-repeating moves"],
      focusCell: null,
      rungLabel: RUNG_LABELS[0],
    };
  }

  const colourProblem = t.misrouted > 0;

  const body =
    rung === 1
      ? colourProblem
        ? "Notice what changed in the colour arriving at that target — the path already reaches it."
        : hot
          ? `Notice what actually changed the last two times you touched ${hot}. If the outcome repeated, the assumption behind it did too.`
          : "Watch the first piece the beam meets, and say out loud what it does before you move it."
      : rung === 2
        ? colourProblem
          ? "One target is being asked for a colour it is not receiving. This is a channel problem, not a routing problem — change what is being added, not where the beam goes."
          : t.solvedCount > 0
            ? "Whatever you change next has to preserve the paths that already work. Solve the remaining target without breaking the delivered ones."
            : "Deliver one complete path before you try to balance several. Partial routes tell you almost nothing."
        : rung === 3
          ? focusCell
            ? `Every verified solution the solver found passes through cell ${focusCell}, and you have not adjusted it yet. The region is highlighted — the reasoning is still yours.`
            : "The blocker is not where you have been working. Widen your attention to the pieces you have not touched at all."
          : rung === 4
            ? "Hover any cell to see the consequence before you spend a move. The preview is free — use it to test the assumption instead of the board."
            : "Solution assistance is on because you asked for it. The solver's route is shown as guidance; the moves are still yours to make.";

  const headline =
    rung === 5
      ? "Assisted mode — you asked, so here is the solver's route."
      : colourProblem
        ? "This is a colour problem, not a routing problem."
        : state === "STUCK"
          ? "You have been circling. Let's change what you are looking at."
          : state === "STRUGGLING"
            ? "The approach is costing more moves than the puzzle needs."
            : "One observation, then it is back to you.";

  return {
    state,
    rung,
    silent: false,
    headline,
    body,
    evidence: evidence.length ? evidence : ["move stream read locally, on this device"],
    focusCell,
    rungLabel: RUNG_LABELS[rung],
  };
}
