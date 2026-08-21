import { motion, AnimatePresence } from "motion/react";
import { Etch } from "@/components/chrome/instrument";

/**
 * Five rungs, revealed one at a time: observation → concept → data → method →
 * formula. Nothing is dumped at once, and taking a hint costs Discovery Score
 * rather than blocking the solve.
 */
export function HintLadder({
  hints,
  used,
  onReveal,
}: {
  hints: string[];
  used: number;
  onReveal: () => void;
}) {
  const remaining = hints.length - used;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <Etch>Hint ladder</Etch>
        <span className="font-display text-[0.6875rem] tabular-nums text-muted-foreground">
          {remaining} hint{remaining === 1 ? "" : "s"} remaining
        </span>
      </div>

      <ol className="mt-2 space-y-1.5">
        <AnimatePresence initial={false}>
          {hints.slice(0, used).map((h, i) => (
            <motion.li
              key={h}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="border-l border-primary/40 pl-2.5 text-xs text-muted-foreground"
            >
              <span className="mr-1.5 font-display text-[0.625rem] text-primary tabular-nums">
                {i + 1}
              </span>
              {h}
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>

      {remaining > 0 ? (
        <>
          <button
            type="button"
            onClick={onReveal}
            className="mt-3 inline-flex min-h-11 items-center rounded-sm border border-primary/30 px-3 text-[0.8125rem] text-primary transition-colors hover:bg-primary/10"
          >
            {used === 0 ? "Ask PhotonMind" : "One more rung"}
          </button>
          {/* Stated up front: a hint is a trade, never a penalty for trying. */}
          <p className="mt-2 text-[0.6875rem] text-muted-foreground">
            Each rung costs 12 discovery score. The solve still counts either way.
          </p>
        </>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Every rung is open. The reasoning is still yours to finish.
        </p>
      )}
    </div>
  );
}
