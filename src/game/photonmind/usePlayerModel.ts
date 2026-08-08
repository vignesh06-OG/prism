import { useCallback, useMemo, useRef, useState } from "react";
import { readBehaviour, type Behaviour, type MoveRecord } from "./behaviour";

/**
 * Records the player's move stream in memory (never persisted, never sent
 * anywhere) and re-reads their behaviour profile on every move.
 */
export function usePlayerModel(par: number) {
  const records = useRef<MoveRecord[]>([]);
  const [version, setVersion] = useState(0);

  const record = useCallback((cell: string, solvedCount: number) => {
    records.current = [...records.current.slice(-80), { cell, at: Date.now(), solvedCount }];
    setVersion((v) => v + 1);
  }, []);

  const clear = useCallback(() => {
    records.current = [];
    setVersion((v) => v + 1);
  }, []);

  const behaviour: Behaviour = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => readBehaviour(records.current, par),
    [version, par],
  );

  return {
    behaviour,
    record,
    clear,
    moveCount: records.current.length,
    /** Ordered cell keys the player has touched — used by the reasoning mirror. */
    touchedCells: records.current.map((r) => r.cell),
  };
}
