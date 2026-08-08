import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Gauge, Sparkles, Timer, TriangleAlert, X } from "lucide-react";
import { formatDuration, type Analysis } from "@/game/analysis";
import { cn } from "@/lib/utils";

interface Props {
  analysis: Analysis | null;
  running: boolean;
  onClose: () => void;
  reduceMotion?: boolean;
}

const RATING_TONE: Record<string, string> = {
  Beginner: "text-beam-green",
  Intermediate: "text-beam-cyan",
  Advanced: "text-beam-yellow",
  Master: "text-beam-magenta",
  Expert: "text-beam-red",
};

function Row({ label, value, tone }: { label: string; value: string; tone?: string | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", tone)}>{value}</span>
    </div>
  );
}

export function ValidationModal({ analysis, running, onClose, reduceMotion }: Props) {
  const open = running || !!analysis;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="fixed inset-0 z-40 grid place-items-center bg-background/70 px-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Puzzle validation report"
          onClick={onClose}
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-surface/80 p-6 backdrop-blur-xl"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close validation report"
              className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            {running || !analysis ? (
              <div className="py-10 text-center">
                <motion.div
                  aria-hidden="true"
                  className="mx-auto h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary"
                  animate={reduceMotion ? {} : { rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                />
                <p className="mt-4 text-sm text-muted-foreground">
                  Searching the move space…
                </p>
              </div>
            ) : (
              <div aria-live="polite">
                <p className="font-display text-xs tracking-[0.3em] text-primary uppercase">
                  Validation report
                </p>
                <h2 className="mt-2 flex items-center gap-2 text-2xl font-extrabold">
                  {analysis.solvable ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-beam-green" aria-hidden="true" />
                      Solvable
                    </>
                  ) : (
                    <>
                      <TriangleAlert className="h-6 w-6 text-destructive" aria-hidden="true" />
                      {analysis.issues.length ? "Incomplete" : "Impossible"}
                    </>
                  )}
                </h2>

                {analysis.issues.length > 0 && (
                  <ul className="mt-3 space-y-1 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
                    {analysis.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                )}

                <div className="mt-4">
                  <Row
                    label="Solutions"
                    value={
                      !analysis.solvable
                        ? "None found"
                        : analysis.unique
                          ? "Unique solution"
                          : `${analysis.solutionCount}${analysis.solutionCount >= 64 ? "+" : ""} optimal solutions`
                    }
                  />
                  <Row
                    label="Minimum moves"
                    value={analysis.solvable ? `${analysis.minMoves}` : "—"}
                  />
                  <Row
                    label="Difficulty"
                    value={analysis.rating}
                    tone={RATING_TONE[analysis.rating]}
                  />
                  <Row
                    label="Estimated solve time"
                    value={formatDuration(analysis.estimatedSeconds)}
                  />
                  <Row
                    label="States searched"
                    value={`${analysis.statesExplored.toLocaleString()}${analysis.exhaustive ? "" : "+"}`}
                  />
                </div>

                {/* Confidence meter */}
                <div className="mt-5">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5" aria-hidden="true" /> Model confidence
                    </span>
                    <span className="tabular-nums">
                      {Math.round(analysis.confidence * 100)}%
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
                    role="meter"
                    aria-valuenow={Math.round(analysis.confidence * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Difficulty model confidence"
                  >
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      style={{ boxShadow: "var(--shadow-glow)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${analysis.confidence * 100}%` }}
                      transition={{ duration: reduceMotion ? 0 : 0.7, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Difficulty factors */}
                <div className="mt-5 rounded-2xl border border-border bg-surface-2/60 p-3">
                  <p className="mb-2 inline-flex items-center gap-1.5 text-xs tracking-widest text-muted-foreground uppercase">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Why this rating
                  </p>
                  <ul className="space-y-1.5">
                    {analysis.factors.map((f) => (
                      <li key={f.label} className="text-xs">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">{f.label}</span>
                          <span className="tabular-nums">{f.value}</span>
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface">
                          <motion.div
                            className="h-full rounded-full bg-accent/70"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(100, (f.weight / Math.max(1, analysis.difficultyScore)) * 100)}%`,
                            }}
                            transition={{ duration: reduceMotion ? 0 : 0.5 }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                  Computed locally by breadth-first search — no network calls.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
