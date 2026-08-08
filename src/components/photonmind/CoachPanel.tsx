import { motion } from "motion/react";
import { useMemo } from "react";
import { BrainCircuit } from "lucide-react";
import { guide, type Behaviour } from "@/game/photonmind/behaviour";
import type { Board } from "@/game/types";
import { cn } from "@/lib/utils";

interface Props {
  board: Board;
  solution: Board | null;
  behaviour: Behaviour;
  par: number;
  moves: number;
  reduceMotion?: boolean;
  className?: string;
}

/**
 * The in-game face of PhotonMind: it reads how the player is thinking and
 * explains the reasoning it would apply next. It never states the answer.
 */
export function CoachPanel({
  board,
  solution,
  behaviour,
  par,
  moves,
  reduceMotion = false,
  className,
}: Props) {
  const g = useMemo(
    () => guide(board, solution, behaviour, par, moves),
    [board, solution, behaviour, par, moves],
  );

  return (
    <section
      className={cn(
        "rounded-2xl border border-primary/30 bg-surface/70 p-4 text-sm backdrop-blur",
        className,
      )}
      aria-live="polite"
      aria-label="PhotonMind coach"
    >
      <header className="flex items-center justify-between gap-2">
        <p className="font-display text-[11px] tracking-[0.28em] text-primary uppercase">
          PhotonMind coach
        </p>
        <BrainCircuit className="h-4 w-4 text-primary" aria-hidden="true" />
      </header>

      <p className="mt-2 font-display font-bold">{g.headline}</p>

      <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
        {g.reasoning.map((r, i) => (
          <motion.li
            key={r}
            initial={reduceMotion ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduceMotion ? 0 : i * 0.06 }}
            className="border-l border-primary/30 pl-2.5"
          >
            {r}
          </motion.li>
        ))}
      </ol>

      <p className="mt-3 text-[11px] text-foreground/70">{behaviour.style}</p>

      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
        {behaviour.traits.map((t) => (
          <li key={t.key}>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{t.label}</span>
              <span className="tabular-nums">{Math.round(t.value * 100)}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  t.key === "confusion" || t.key === "fixation" ? "bg-beam-red" : "bg-beam-cyan",
                )}
                initial={reduceMotion ? false : { width: 0 }}
                animate={{ width: `${t.value * 100}%` }}
                transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
