import { motion } from "motion/react";
import { CheckCircle2, FlaskConical, XCircle } from "lucide-react";
import type { PipelineStep, Verdict } from "@/game/evolve";
import { cn } from "@/lib/utils";

interface Props {
  log: PipelineStep[];
  running?: boolean;
  reduceMotion?: boolean;
  className?: string;
}

const STAGES = [
  "Generate",
  "Simulate",
  "Solve",
  "Measure",
  "Predict",
  "Judge",
] as const;

const TONE: Record<Verdict, string> = {
  kept: "border-primary/50 bg-primary/10",
  impossible: "border-destructive/40 bg-destructive/10",
  trivial: "border-border bg-surface-2/60",
  ambiguous: "border-accent/40 bg-accent/10",
  overcooked: "border-accent/40 bg-accent/10",
  unbalanced: "border-border bg-surface-2/60",
};

const LABEL: Record<Verdict, string> = {
  kept: "Promoted",
  impossible: "Rejected · impossible",
  trivial: "Rejected · trivial",
  ambiguous: "Rejected · ambiguous",
  overcooked: "Rejected · over-complex",
  unbalanced: "Rejected · unbalanced",
};

/**
 * The generator's audit trail. Most puzzle games hide generation behind a
 * button; here every candidate the pipeline threw away is visible, with the
 * measurement that killed it.
 */
export function EvolutionPipeline({ log, running = false, reduceMotion = false, className }: Props) {
  const kept = log.filter((l) => l.verdict === "kept").length;
  const totalMs = Math.round(log.reduce((a, l) => a + l.ms, 0));

  return (
    <section
      className={cn(
        "rounded-3xl border border-border bg-surface/50 p-5 backdrop-blur",
        className,
      )}
      aria-label="Puzzle generation pipeline"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[11px] tracking-[0.28em] text-accent uppercase">
            Generate → validate → judge
          </p>
          <h3 className="font-display text-lg font-bold">The rejection pile</h3>
          <p className="mt-1 max-w-prose text-xs text-muted-foreground">
            Every candidate is simulated by the game engine, solved exhaustively, measured, then
            kept or killed. The interesting part is what gets killed.
          </p>
        </div>
        <FlaskConical className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
      </header>

      <ol className="mt-4 flex flex-wrap items-center gap-1.5 text-[10px] tracking-widest uppercase">
        {STAGES.map((s, i) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="rounded-full border border-border bg-background/40 px-2 py-1 text-muted-foreground">
              {s}
            </span>
            {i < STAGES.length - 1 && <span className="text-muted-foreground/50">→</span>}
          </li>
        ))}
      </ol>

      {log.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground" role="status">
          {running ? "Growing candidates…" : "Run the generator to watch candidates live or die."}
        </p>
      ) : (
        <>
          <p className="mt-4 text-xs text-muted-foreground">
            <span className="font-display font-bold text-foreground tabular-nums">{kept}</span> kept
            of{" "}
            <span className="font-display font-bold text-foreground tabular-nums">{log.length}</span>{" "}
            tested · {totalMs} ms of real search
          </p>
          <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {log.map((step, i) => (
              <motion.li
                key={step.index}
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduceMotion ? 0 : Math.min(i * 0.02, 0.4) }}
                className={cn(
                  "flex items-start gap-2 rounded-xl border p-2.5 text-[11px]",
                  TONE[step.verdict],
                )}
              >
                {step.verdict === "kept" ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <p className="font-display font-bold">
                    #{step.index + 1} · gen {step.generation} · {LABEL[step.verdict]}
                  </p>
                  <p className="text-muted-foreground">{step.reason}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/80 tabular-nums">
                    depth {step.minMoves < 0 ? "—" : step.minMoves} · solutions{" "}
                    {step.solutionCount} · complexity {step.complexity} · fitness {step.fitness} ·{" "}
                    {step.ms} ms
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
