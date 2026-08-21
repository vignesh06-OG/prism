import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { readLaws } from "@/game/lightlaws";
import { LEVELS } from "@/game/levels";
import { cn } from "@/lib/utils";

interface Props {
  progress: Record<string, number>;
  discovered: string[];
  reduceMotion?: boolean;
  className?: string;
}

/**
 * The ending. Not a "you win" card: a record of what the player worked out,
 * accumulated from things they actually caused the simulation to do.
 */
export function LightLabComplete({
  progress,
  discovered,
  reduceMotion = false,
  className,
}: Props) {
  const laws = readLaws(discovered).filter((l) => l.known);
  const masters = LEVELS.filter((l) => l.master);
  const mastersSolved = masters.filter((l) => progress[l.id] !== undefined);
  const solved = LEVELS.filter((l) => progress[l.id] !== undefined);
  const atPar = solved.filter((l) => (progress[l.id] ?? Infinity) <= l.par);

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-primary/40 bg-surface/70 p-6 backdrop-blur sm:p-8",
        className,
      )}
      aria-label="The Light Lab is complete"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--primary)" }}
      />
      <p className="relative font-display text-[11px] tracking-[0.3em] text-primary uppercase">
        The Light Lab
      </p>
      <h2 className="relative mt-1 font-display text-3xl font-extrabold text-balance sm:text-4xl">
        Complete.
      </h2>

      <dl className="relative mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Laws discovered", value: `${laws.length}` },
          { label: "Puzzles solved", value: `${solved.length}/${LEVELS.length}` },
          { label: "Solved at par", value: `${atPar.length}` },
          { label: "Master Trials", value: `${mastersSolved.length}/${masters.length}` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface-2/50 p-3">
            <dd className="font-display text-2xl font-extrabold tabular-nums">{s.value}</dd>
            <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
          </div>
        ))}
      </dl>

      <ul className="relative mt-6 space-y-2">
        {laws.map((law, i) => (
          <motion.li
            key={law.id}
            initial={reduceMotion ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.05 * i }}
            className="flex gap-3 rounded-xl border border-border/70 bg-background/40 px-3 py-2"
          >
            <span className="font-display text-xs text-primary tabular-nums">{law.numeral}</span>
            <span className="min-w-0 text-sm">
              <span className="font-semibold">{law.name}. </span>
              <span className="text-muted-foreground">{law.statement}</span>
            </span>
          </motion.li>
        ))}
      </ul>

      <p className="relative mt-6 max-w-xl font-display text-lg leading-snug font-bold text-balance">
        You learned the rules.
        <br />
        Then you learned when to question them.
      </p>

      <div className="relative mt-5 flex flex-wrap gap-2">
        <Link
          to="/discoveries"
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95"
        >
          Read the full rulebook
        </Link>
        {masters[0] ? (
          <Link
            to="/play/$levelId"
            params={{ levelId: masters[masters.length - 1]!.id }}
            className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm transition-colors hover:bg-surface-2"
          >
            Replay the final Master Trial
          </Link>
        ) : null}
      </div>
    </motion.section>
  );
}
