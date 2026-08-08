import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { PrismBoard } from "@/components/game/PrismBoard";
import { trace } from "@/game/engine";
import { WHITE, key, type Board, type Piece } from "@/game/types";

let uid = 0;
const p = (piece: Omit<Piece, "id">): Piece => ({ id: `h${++uid}`, ...piece });

/**
 * The landing hero is not a picture of the game — it *is* the game, running the
 * shipping beam engine. One click turns the mirror, the white beam falls into
 * the prism and separates into red, green and blue, lighting three targets at
 * once. That single interaction is the whole thesis of Prism.
 */
function makeBoard(rot: number): Board {
  const cells: Array<[number, number, Piece]> = [
    [0, 0, p({ kind: "emitter", rot: 1, color: WHITE, fixed: true })],
    [3, 0, p({ kind: "mirror", rot })],
    [3, 2, p({ kind: "prism", rot: 0, fixed: true })],
    [1, 2, p({ kind: "target", rot: 0, color: 2, fixed: true })],
    [5, 2, p({ kind: "target", rot: 0, color: 4, fixed: true })],
    [3, 4, p({ kind: "target", rot: 0, color: 1, fixed: true })],
  ];
  return {
    width: 7,
    height: 5,
    cells: Object.fromEntries(cells.map(([x, y, piece]) => [key(x, y), piece])),
    tray: [],
  };
}

export function HeroPuzzle({ reduceMotion = false }: { reduceMotion?: boolean }) {
  const [rot, setRot] = useState(0);
  const board = useMemo(() => makeBoard(rot), [rot]);
  const result = useMemo(() => trace(board), [board]);
  const litKeys = Object.keys(result.hits).filter(
    (k) => (result.hits[k] ?? 0) === (board.cells[k]?.color ?? 7),
  );
  const solved = litKeys.length === 3;

  return (
    <div className="relative">
      <div className="rounded-3xl border border-border bg-surface/50 p-3 backdrop-blur sm:p-4">
        <PrismBoard
          board={board}
          result={result}
          onActivate={() => setRot((r) => (r + 1) % 2)}
          colorblind={false}
          placing={false}
          reduceMotion={reduceMotion}
          litKeys={litKeys}
          hintCell={solved ? null : key(3, 0)}
        />
      </div>

      <div className="mt-3 min-h-14">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={solved ? "after" : "before"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0 : 0.28 }}
            className="text-sm text-muted-foreground"
          >
            {solved ? (
              <span className="text-foreground">
                That is what white light is made of — red, green and blue, separated
                by a prism. Three targets, one move.
              </span>
            ) : (
              <>
                <span className="text-primary">Turn the mirror.</span> One click, and
                the beam finds out what it is really made of.
              </>
            )}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
