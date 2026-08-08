/**
 * PhotonMind — instrumented search.
 *
 * The same breadth-first expansion the validator uses, but it records the tree
 * it walks: which node came from which, which branches died, and which one
 * reached a solved board. That trace is what the AI Lab animates, so the
 * visualisation is the real search, not a mock-up.
 */
import { cloneBoard, trace } from "../engine";
import { key, type Board, type Piece } from "../types";

export type NodeStatus = "root" | "open" | "deadend" | "solution" | "onPath";

export interface SearchNode {
  id: number;
  parent: number | null;
  depth: number;
  /** Short human label for the move that produced this node. */
  move: string;
  status: NodeStatus;
  /** Lit targets over total, used to colour the node. */
  heuristic: number;
}

export interface SearchTrace {
  nodes: SearchNode[];
  expanded: number;
  solutionId: number | null;
  depth: number;
  path: number[];
  truncated: boolean;
  milliseconds: number;
}

const ROTATABLE = new Set(["mirror", "splitter"]);
const NODE_CAP = 420;
const STATE_CAP = 40_000;

const pieceSig = (p: Piece) => `${p.kind}:${p.rot}:${p.color ?? 7}`;

const boardKey = (b: Board) =>
  `${Object.entries(b.cells)
    .map(([k, p]) => `${k}:${pieceSig(p)}`)
    .sort()
    .join("|")}#${b.tray.map(pieceSig).sort().join(",")}`;

interface Move {
  board: Board;
  label: string;
}

function successors(board: Board): Move[] {
  const out: Move[] = [];
  const seen = new Set<string>();

  board.tray.forEach((piece, idx) => {
    const sig = pieceSig(piece);
    if (seen.has(sig)) return;
    seen.add(sig);
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const k = key(x, y);
        if (board.cells[k]) continue;
        const next = cloneBoard(board);
        const [taken] = next.tray.splice(idx, 1);
        next.cells[k] = taken!;
        out.push({ board: next, label: `place ${piece.kind} @ ${k}` });
      }
    }
  });

  for (const [k, piece] of Object.entries(board.cells)) {
    if (piece.fixed || !ROTATABLE.has(piece.kind)) continue;
    const next = cloneBoard(board);
    next.cells[k] = { ...piece, rot: (piece.rot + 1) % 2 };
    out.push({ board: next, label: `turn ${piece.kind} @ ${k}` });
  }

  return out;
}

/** Fraction of targets currently satisfied — the branch-quality signal. */
function heuristic(board: Board): number {
  const res = trace(board);
  return res.targetCount ? res.solvedCount / res.targetCount : 0;
}

export function traceSearch(input: Board, maxDepth = 6): SearchTrace {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const start = cloneBoard(input);
  const nodes: SearchNode[] = [
    { id: 0, parent: null, depth: 0, move: "initial layout", status: "root", heuristic: heuristic(start) },
  ];
  const visited = new Set<string>([boardKey(start)]);
  let frontier: { id: number; board: Board }[] = [{ id: 0, board: start }];
  let expanded = 1;
  let solutionId: number | null = null;
  let truncated = false;
  let depth = 0;

  if (trace(start).solved) solutionId = 0;

  while (solutionId === null && frontier.length && depth < maxDepth) {
    depth++;
    const next: { id: number; board: Board }[] = [];
    for (const node of frontier) {
      const kids = successors(node.board);
      let live = 0;
      for (const kid of kids) {
        const k = boardKey(kid.board);
        if (visited.has(k)) continue;
        visited.add(k);
        expanded++;
        const solved = trace(kid.board).solved;
        if (nodes.length < NODE_CAP) {
          nodes.push({
            id: nodes.length,
            parent: node.id,
            depth,
            move: kid.label,
            status: solved ? "solution" : "open",
            heuristic: heuristic(kid.board),
          });
          if (solved) {
            solutionId = nodes.length - 1;
            break;
          }
        } else {
          truncated = true;
        }
        live++;
        next.push({ id: nodes.length - 1, board: kid.board });
        if (expanded > STATE_CAP) {
          truncated = true;
          break;
        }
      }
      if (live === 0 && nodes[node.id] && nodes[node.id]!.status === "open") {
        nodes[node.id]!.status = "deadend";
      }
      if (solutionId !== null || truncated) break;
    }
    if (solutionId !== null || truncated) break;
    frontier = next;
  }

  // Mark the winning branch so the visualiser can light it up.
  const path: number[] = [];
  if (solutionId !== null) {
    let cur: number | null = solutionId;
    while (cur !== null) {
      path.unshift(cur);
      const node: SearchNode | undefined = nodes[cur];
      if (!node) break;
      if (node.status === "open") node.status = "onPath";
      cur = node.parent;
    }
  }

  const t1 = typeof performance !== "undefined" ? performance.now() : 0;
  return {
    nodes,
    expanded,
    solutionId,
    depth,
    path,
    truncated,
    milliseconds: Math.max(1, Math.round(t1 - t0)),
  };
}
