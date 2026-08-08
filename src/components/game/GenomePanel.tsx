import { motion } from "motion/react";
import { Dna } from "lucide-react";
import { useMemo } from "react";
import { genome } from "@/game/genome";
import type { Board } from "@/game/types";
import { cn } from "@/lib/utils";

interface Props {
  board: Board;
  className?: string;
  reduceMotion?: boolean;
}

/** Live complexity profile of whatever board is on the bench. */
export function GenomePanel({ board, className, reduceMotion = false }: Props) {
  const g = useMemo(() => genome(board), [board]);

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur",
        className,
      )}
      aria-label="Puzzle genome"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-xs tracking-widest text-muted-foreground uppercase">
          Puzzle genome
        </p>
        <Dna className="h-4 w-4 text-accent" aria-hidden="true" />
      </div>

      <p className="mt-2 font-mono text-[11px] tracking-wider text-foreground/80">
        {g.fingerprint}
      </p>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-2xl font-extrabold tabular-nums">{g.complexity}</span>
        <span className="text-xs text-muted-foreground">/ 100 complexity</span>
      </div>

      <ul className="mt-3 space-y-2">
        {g.strand.map((s) => (
          <li key={s.label}>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{s.label}</span>
              <span className="tabular-nums text-foreground/80">{s.display}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={reduceMotion ? false : { width: 0 }}
                animate={{ width: `${Math.min(100, s.value)}%` }}
                transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeOut" }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
