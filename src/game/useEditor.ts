import { useCallback, useMemo, useState } from "react";
import { cloneBoard, trace } from "@/game/engine";
import { key, type Board, type ColorMask, type Piece, type PieceKind } from "@/game/types";

export interface Tool {
  kind: PieceKind;
  color: ColorMask;
  rot: number;
}

const HISTORY_LIMIT = 80;
const ROTATION_STEPS: Record<string, number> = { emitter: 4 };

export const emptyBoard = (width = 7, height = 7): Board => ({
  width,
  height,
  cells: {},
  tray: [],
});

let seq = 0;
const newId = () => `e${(seq++).toString(36)}${Date.now().toString(36).slice(-3)}`;

export interface EditorState {
  board: Board;
  result: ReturnType<typeof trace>;
  tool: Tool;
  setTool: (t: Tool) => void;
  selected: string | null;
  select: (k: string | null) => void;
  /** Place the current tool, or select an existing piece. */
  paint: (x: number, y: number) => void;
  rotateAt: (k: string) => void;
  deleteAt: (k: string) => void;
  movePiece: (from: string, to: string) => void;
  resize: (width: number, height: number) => void;
  clear: () => void;
  load: (board: Board) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useEditor(initial?: Board): EditorState {
  const [board, setBoard] = useState<Board>(() => cloneBoard(initial ?? emptyBoard()));
  const [past, setPast] = useState<Board[]>([]);
  const [future, setFuture] = useState<Board[]>([]);
  const [tool, setTool] = useState<Tool>({ kind: "mirror", color: 7, rot: 0 });
  const [selected, setSelected] = useState<string | null>(null);

  const result = useMemo(() => trace(board), [board]);

  const commit = useCallback((mutate: (draft: Board) => void) => {
    setBoard((prev) => {
      const draft = cloneBoard(prev);
      mutate(draft);
      setPast((p) => [...p.slice(-HISTORY_LIMIT), prev]);
      setFuture([]);
      return draft;
    });
  }, []);

  const paint = useCallback(
    (x: number, y: number) => {
      const k = key(x, y);
      const existing = board.cells[k];
      if (existing) {
        setSelected(k);
        return;
      }
      setSelected(k);
      commit((draft) => {
        draft.cells[k] = {
          id: newId(),
          kind: tool.kind,
          rot: tool.rot,
          color: tool.color,
        } satisfies Piece;
      });
    },
    [board, commit, tool],
  );

  const rotateAt = useCallback(
    (k: string) => {
      const piece = board.cells[k];
      if (!piece) return;
      const steps = ROTATION_STEPS[piece.kind] ?? 2;
      commit((draft) => {
        const target = draft.cells[k];
        if (target) target.rot = (target.rot + 1) % steps;
      });
    },
    [board, commit],
  );

  const deleteAt = useCallback(
    (k: string) => {
      if (!board.cells[k]) return;
      setSelected((s) => (s === k ? null : s));
      commit((draft) => {
        delete draft.cells[k];
      });
    },
    [board, commit],
  );

  const movePiece = useCallback(
    (from: string, to: string) => {
      if (from === to) return;
      const piece = board.cells[from];
      if (!piece || board.cells[to]) return;
      setSelected(to);
      commit((draft) => {
        delete draft.cells[from];
        draft.cells[to] = { ...piece };
      });
    },
    [board, commit],
  );

  const resize = useCallback(
    (width: number, height: number) => {
      const w = Math.max(3, Math.min(12, width));
      const h = Math.max(3, Math.min(12, height));
      commit((draft) => {
        draft.width = w;
        draft.height = h;
        for (const k of Object.keys(draft.cells)) {
          const [x, y] = k.split(",").map(Number);
          if (x! >= w || y! >= h) delete draft.cells[k];
        }
      });
    },
    [commit],
  );

  const clear = useCallback(() => {
    setSelected(null);
    commit((draft) => {
      draft.cells = {};
      draft.tray = [];
    });
  }, [commit]);

  const load = useCallback(
    (next: Board) => {
      setSelected(null);
      commit((draft) => {
        draft.width = next.width;
        draft.height = next.height;
        draft.cells = cloneBoard(next).cells;
        draft.tray = cloneBoard(next).tray;
      });
    },
    [commit],
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1]!;
      setBoard((cur) => {
        setFuture((f) => [cur, ...f].slice(0, HISTORY_LIMIT));
        return prev;
      });
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const nextBoard = f[0]!;
      setBoard((cur) => {
        setPast((p) => [...p.slice(-HISTORY_LIMIT), cur]);
        return nextBoard;
      });
      return f.slice(1);
    });
  }, []);

  return {
    board,
    result,
    tool,
    setTool,
    selected,
    select: setSelected,
    paint,
    rotateAt,
    deleteAt,
    movePiece,
    resize,
    clear,
    load,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
