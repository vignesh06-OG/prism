import { motion } from "motion/react";
import { BrainCircuit, Gauge, Timer, TriangleAlert } from "lucide-react";
import type { Prediction } from "@/game/photonmind/predict";
import type { Analysis } from "@/game/analysis";
import { cn } from "@/lib/utils";

interface Props {
  prediction: Prediction;
  /** Ground truth from the exhaustive solver, when it has finished. */
  solver?: Analysis | null;
  solverMs?: number;
  reduceMotion?: boolean;
  className?: string;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * The signature ML panel: what the learned model predicted, what the
 * exhaustive search actually found, and how far apart the two are.
 */
export function PredictionCard({
  prediction,
  solver,
  solverMs,
  reduceMotion = false,
  className,
}: Props) {
  const error = solver?.solvable ? Math.abs(prediction.difficulty - solver.difficultyScore) : null;
  const speedup =
    solverMs && prediction.microseconds
      ? Math.max(1, Math.round((solverMs * 1000) / prediction.microseconds))
      : null;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/30 bg-surface/70 p-5 backdrop-blur",
        className,
      )}
      aria-label="PhotonMind prediction"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--primary)" }}
      />
      <header className="relative flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[11px] tracking-[0.28em] text-primary uppercase">
            PhotonMind
          </p>
          <h3 className="font-display text-lg font-bold">Learned difficulty estimate</h3>
        </div>
        <BrainCircuit className="h-5 w-5 text-primary" aria-hidden="true" />
      </header>

      <div className="relative mt-4 grid grid-cols-3 gap-3">
        {[
          { icon: Gauge, label: "Difficulty", value: `${prediction.difficulty}`, sub: prediction.rating },
          { icon: Timer, label: "Solve cost", value: `${prediction.solveSeconds}s`, sub: "solver-derived proxy" },
          {
            icon: TriangleAlert,
            label: "Hint risk",
            value: pct(prediction.hintRisk),
            sub: prediction.hintRisk > 0.6 ? "likely stuck" : "should flow",
          },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : i * 0.07 }}
            className="rounded-xl border border-border bg-surface-2/60 p-3"
          >
            <m.icon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <p className="mt-1.5 font-display text-xl font-extrabold tabular-nums">{m.value}</p>
            <p className="text-[11px] text-muted-foreground">{m.label}</p>
            <p className="text-[10px] text-muted-foreground/70">{m.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="relative mt-4">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Model confidence</span>
          <span className="tabular-nums text-foreground/80">{pct(prediction.confidence)}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={reduceMotion ? false : { width: 0 }}
            animate={{ width: pct(prediction.confidence) }}
            transition={{ duration: reduceMotion ? 0 : 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="relative mt-4 rounded-xl border border-border bg-background/40 p-3 text-[11px]">
        <p className="font-display tracking-widest text-muted-foreground uppercase">
          Prediction vs. exhaustive search
        </p>
        {solver ? (
          <ul className="mt-2 space-y-1">
            <li className="flex justify-between">
              <span className="text-muted-foreground">Solver difficulty</span>
              <span className="tabular-nums">{solver.difficultyScore}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Absolute error</span>
              <span className={cn("tabular-nums", (error ?? 0) > 15 ? "text-beam-red" : "text-beam-green")}>
                {error === null ? "—" : error}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">States expanded by search</span>
              <span className="tabular-nums">{solver.statesExplored.toLocaleString()}</span>
            </li>
            {speedup && (
              <li className="flex justify-between">
                <span className="text-muted-foreground">Model speed advantage</span>
                <span className="tabular-nums text-primary">{speedup.toLocaleString()}×</span>
              </li>
            )}
          </ul>
        ) : (
          <p className="mt-2 text-muted-foreground">Running the exhaustive solver…</p>
        )}
      </div>

      <div className="relative mt-4">
        <p className="font-display text-[11px] tracking-widest text-muted-foreground uppercase">
          Why this number
        </p>
        <ul className="mt-2 space-y-1.5">
          {prediction.contributions.slice(0, 5).map((c) => (
            <li key={c.key}>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">
                  {c.label} <span className="text-foreground/60">({c.raw})</span>
                </span>
                <span
                  className={cn("tabular-nums", c.effect >= 0 ? "text-beam-green" : "text-beam-red")}
                >
                  {c.effect >= 0 ? "+" : ""}
                  {c.effect.toFixed(1)}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  className={cn("h-full rounded-full", c.effect >= 0 ? "bg-accent" : "bg-destructive")}
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width: `${Math.min(100, c.share * 160)}%` }}
                  transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeOut" }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
