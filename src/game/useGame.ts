import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cloneBoard, trace } from "./engine";
import type { Board, ColorMask, Level, Piece, TraceResult } from "./types";
import { key } from "./types";

export interface GameState {
  board: Board;
  moves: number;
  result: TraceResult;
  /** Target cells lit with exactly the colour they asked for. */
  litKeys: string[];
  /** Target cells receiving light, but the wrong mix — the soft failure state. */
  misroutedKeys: string[];
  /** Cell key touched by the most recent move, for pop/rotate feedback. */
  lastTouched: string | null;
  /** Player is over par or has stalled — used to surface help, never to punish. */
  struggling: boolean;
  overPar: boolean;
  /** Every board state the player has passed through, for replay. */
  timeline: Board[];
  selectedTrayId: string | null;
  setSelectedTrayId: (id: string | null) => void;
  activate: (x: number, y: number) => void;
  reset: () => void;
  undo: () => void;
  canUndo: boolean;
}

const ROTATABLE = new Set(["mirror", "splitter"]);
const HISTORY_LIMIT = 60;
const STALL_MS = 35_000;

export function useGame(level: Level): GameState {
  const [board, setBoard] = useState<Board>(() => cloneBoard(level.board));
  const [history, setHistory] = useState<Board[]>([]);
  const [timeline, setTimeline] = useState<Board[]>(() => [cloneBoard(level.board)]);
  const [moves, setMoves] = useState(0);
  const [selectedTrayId, setSelectedTrayId] = useState<string | null>(null);
  const [lastTouched, setLastTouched] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const lastMoveAt = useRef(Date.now());

  const result = useMemo(() => trace(board), [board]);

  const { litKeys, misroutedKeys } = useMemo(() => {
    const lit: string[] = [];
    const wrong: string[] = [];
    for (const [k, piece] of Object.entries(board.cells)) {
      if (piece.kind !== "target") continue;
      const got: ColorMask = result.hits[k] ?? 0;
      const want: ColorMask = piece.color ?? 7;
      if (got === want) lit.push(k);
      else if (got !== 0) wrong.push(k);
    }
    return { litKeys: lit, misroutedKeys: wrong };
  }, [board, result]);

  // Stall detection: no move for a while and the puzzle is still open.
  useEffect(() => {
    if (result.solved) return;
    setStalled(false);
    const timer = window.setInterval(() => {
      if (Date.now() - lastMoveAt.current > STALL_MS) setStalled(true);
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [moves, result.solved]);

  const commit = useCallback((next: Board, touched: string) => {
    lastMoveAt.current = Date.now();
    setLastTouched(touched);
    setBoard((prev) => {
      setHistory((h) => [...h.slice(-HISTORY_LIMIT), prev]);
      return next;
    });
    setTimeline((t) => [...t.slice(-HISTORY_LIMIT), cloneBoard(next)]);
    setMoves((m) => m + 1);
  }, []);

  const activate = useCallback(
    (x: number, y: number) => {
      const k = key(x, y);
      const piece: Piece | undefined = board.cells[k];
      const next = cloneBoard(board);

      if (!piece) {
        if (!selectedTrayId) return;
        const idx = next.tray.findIndex((t) => t.id === selectedTrayId);
        if (idx === -1) return;
        const [taken] = next.tray.splice(idx, 1);
        next.cells[k] = taken!;
        setSelectedTrayId(null);
        commit(next, k);
        return;
      }

      if (piece.fixed) return;

      if (ROTATABLE.has(piece.kind)) {
        next.cells[k] = { ...piece, rot: (piece.rot + 1) % 2 };
        commit(next, k);
        return;
      }

      // Non-rotatable placed piece: pick it back up into the tray.
      delete next.cells[k];
      next.tray.push(piece);
      commit(next, k);
    },
    [board, commit, selectedTrayId],
  );

  const reset = useCallback(() => {
    lastMoveAt.current = Date.now();
    setBoard(cloneBoard(level.board));
    setHistory([]);
    setTimeline([cloneBoard(level.board)]);
    setMoves(0);
    setSelectedTrayId(null);
    setLastTouched(null);
    setStalled(false);
  }, [level]);

  const undo = useCallback(() => {
    lastMoveAt.current = Date.now();
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1]!;
      setBoard(prev);
      setMoves((m) => Math.max(0, m - 1));
      setTimeline((t) => (t.length > 1 ? t.slice(0, -1) : t));
      return h.slice(0, -1);
    });
    setLastTouched(null);
  }, []);

  return {
    board,
    moves,
    result,
    litKeys,
    misroutedKeys,
    lastTouched,
    struggling: !result.solved && (stalled || moves > level.par * 2 + 1),
    overPar: moves > level.par,
    timeline,
    selectedTrayId,
    setSelectedTrayId,
    activate,
    reset,
    undo,
    canUndo: history.length > 0,
  };
}
