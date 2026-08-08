/**
 * Puzzle analysis: an exhaustive breadth-first search over the legal move
 * space of a board, plus a deterministic difficulty model derived from the
 * search itself. No network, no LLM — everything is computed locally from
 * solution depth, branching, beam interactions and colour work.
 */
import { cloneBoard, trace } from "./engine";
import { key, type Board, type Piece } from "./types";

const ROTATABLE = new Set(["mirror", "splitter"]);

export type Rating = "Beginner" | "Intermediate" | "Advanced" | "Master" | "Expert";

export interface Analysis {
  solvable: boolean;
  /** Fewest moves found. -1 when unsolvable within the search budget. */
  minMoves: number;
  /** Distinct optimal solutions found (capped at SOLUTION_CAP). */
  solutionCount: number;
  unique: boolean;
  /** False when the search hit its budget, so results are a lower bound. */
  exhaustive: boolean;
  statesExplored: number;
  rating: Rating;
  /** 0–1 model confidence in the rating. */
  confidence: number;
  difficultyScore: number;
  estimatedSeconds: number;
  /** One optimal board, for previewing the solution. */
  solutionBoard: Board | null;
  factors: { label: string; value: string; weight: number }[];
  issues: string[];
}

const STATE_CAP = 120_000;
const DEPTH_CAP = 10;
const SOLUTION_CAP = 64;

const boardKey = (b: Board) => {
  const cells = Object.entries(b.cells)
    .map(([k, p]) => `${k}:${p.kind}:${p.rot}:${p.color ?? 7}`)
    .sort()
    .join("|");
  const tray = b.tray
    .map((p) => `${p.kind}:${p.rot}:${p.color ?? 7}`)
    .sort()
    .join(",");
  return `${cells}#${tray}`;
};

const pieceSig = (p: Piece) => `${p.kind}:${p.rot}:${p.color ?? 7}`;

/** Every legal single move from a board, deduplicated by identical pieces. */
function successors(board: Board): Board[] {
  const out: Board[] = [];

  const seenTray = new Set<string>();
  board.tray.forEach((piece, idx) => {
    const sig = pieceSig(piece);
    if (seenTray.has(sig)) return;
    seenTray.add(sig);
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const k = key(x, y);
        if (board.cells[k]) continue;
        const next = cloneBoard(board);
        const [taken] = next.tray.splice(idx, 1);
        next.cells[k] = taken!;
        out.push(next);
      }
    }
  });

  for (const [k, piece] of Object.entries(board.cells)) {
    if (piece.fixed || !ROTATABLE.has(piece.kind)) continue;
    const next = cloneBoard(board);
    next.cells[k] = { ...piece, rot: (piece.rot + 1) % 2 };
    out.push(next);
  }

  return out;
}

function rate(score: number): Rating {
  if (score < 26) return "Beginner";
  if (score < 46) return "Intermediate";
  if (score < 70) return "Advanced";
  if (score < 96) return "Master";
  return "Expert";
}

const popcount = (n: number) => ((n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1)) | 0;

/** Structural problems that make a puzzle unshippable. */
function lint(board: Board): string[] {
  const issues: string[] = [];
  const pieces = Object.values(board.cells);
  if (!pieces.some((p) => p.kind === "emitter")) issues.push("No emitter on the board.");
  if (!pieces.some((p) => p.kind === "target")) issues.push("No target to light.");
  if (board.width < 3 || board.height < 3) issues.push("Board is smaller than 3×3.");
  return issues;
}

export function analyse(input: Board): Analysis {
  const issues = lint(input);
  const start = cloneBoard(input);

  const visited = new Set<string>([boardKey(start)]);
  let frontier: Board[] = [start];
  let depth = 0;
  let statesExplored = 1;
  let exhaustive = true;

  let minMoves = -1;
  let solutionCount = 0;
  let solutionBoard: Board | null = null;
  let solutionSegments = 0;

  const check = (b: Board) => {
    const res = trace(b);
    if (!res.solved) return false;
    solutionCount++;
    if (!solutionBoard) {
      solutionBoard = b;
      solutionSegments = res.segments.length;
    }
    return true;
  };

  if (issues.length === 0) {
    if (check(start)) minMoves = 0;

    while (minMoves === -1 && frontier.length && depth < DEPTH_CAP) {
      depth++;
      const nextFrontier: Board[] = [];
      for (const b of frontier) {
        for (const s of successors(b)) {
          const k = boardKey(s);
          if (visited.has(k)) continue;
          visited.add(k);
          statesExplored++;
          if (check(s) && minMoves === -1) minMoves = depth;
          if (solutionCount >= SOLUTION_CAP) break;
          nextFrontier.push(s);
        }
        if (statesExplored > STATE_CAP) {
          exhaustive = false;
          break;
        }
      }
      if (!exhaustive) break;
      frontier = nextFrontier;
    }
    if (minMoves === -1 && depth >= DEPTH_CAP && frontier.length) exhaustive = false;
  }

  const solvable = minMoves >= 0;
  const cells = Object.values(input.cells);
  const splitters =
    cells.filter((p) => p.kind === "splitter" || p.kind === "prism").length +
    input.tray.filter((p) => p.kind === "splitter" || p.kind === "prism").length;
  const targets = cells.filter((p) => p.kind === "target");
  const mixedTargets = targets.filter((p) => popcount(p.color ?? 7) > 1).length;
  const distinctColors = new Set(targets.map((p) => p.color ?? 7)).size;
  const rotations = Math.max(0, minMoves - input.tray.length);
  const branching = Math.log2(Math.max(2, statesExplored));

  const factors = [
    { label: "Solution depth", value: solvable ? `${minMoves} moves` : "—", weight: minMoves * 9 },
    { label: "Splits & prisms", value: `${splitters}`, weight: splitters * 7 },
    { label: "Colour mixing", value: `${mixedTargets} mixed / ${distinctColors} hues`, weight: mixedTargets * 9 + distinctColors * 3 },
    { label: "Beam interactions", value: `${solutionSegments} edges`, weight: Math.min(24, solutionSegments / 2) },
    { label: "Required backtracking", value: `${rotations} re-aims`, weight: rotations * 6 },
    { label: "Search branching", value: `${statesExplored.toLocaleString()} states`, weight: branching * 2 },
  ].map((f) => ({ ...f, weight: Math.round(f.weight) }));

  const difficultyScore = solvable
    ? Math.round(factors.reduce((sum, f) => sum + f.weight, 0))
    : 0;

  const confidence = solvable
    ? Math.min(0.98, Math.max(0.55, (exhaustive ? 0.82 : 0.6) + Math.min(0.14, solutionCount / 200)))
    : exhaustive
      ? 0.95
      : 0.5;

  return {
    solvable,
    minMoves,
    solutionCount,
    unique: solvable && solutionCount === 1,
    exhaustive,
    statesExplored,
    rating: rate(difficultyScore),
    confidence,
    difficultyScore,
    estimatedSeconds: solvable
      ? Math.round(18 + minMoves * 16 + difficultyScore * 1.8)
      : 0,
    solutionBoard,
    factors,
    issues,
  };
}

export const formatDuration = (seconds: number) => {
  if (seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
};
