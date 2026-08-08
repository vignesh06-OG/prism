import { motion } from "motion/react";
import { useMemo } from "react";
import { featureImportance, MODEL_CARD } from "@/game/photonmind/predict";
import { cn } from "@/lib/utils";

/**
 * Global feature importance for the difficulty regressor, plus the model card.
 * Both come straight from the frozen weights — nothing is illustrative.
 */
export function FeatureImportance({
  reduceMotion = false,
  className,
}: {
  reduceMotion?: boolean;
  className?: string;
}) {
  const rows = useMemo(() => featureImportance().slice(0, 10), []);

  return (
    <section
      className={cn("rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur", className)}
      aria-label="Model feature importance"
    >
      <header>
        <p className="font-display text-[11px] tracking-[0.28em] text-accent uppercase">
          Explainability
        </p>
        <h3 className="font-display text-lg font-bold">What the model learned to look at</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Importance = |weight| × feature spread across the training corpus. Green pushes difficulty
          up, red pulls it down.
        </p>
      </header>

      <ul className="mt-4 space-y-2.5">
        {rows.map((r, i) => (
          <li key={r.key}>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="tabular-nums text-foreground/70">{r.normalised.toFixed(2)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className={cn("h-full rounded-full", r.sign >= 0 ? "bg-beam-green" : "bg-beam-red")}
                initial={reduceMotion ? false : { width: 0 }}
                animate={{ width: `${r.normalised * 100}%` }}
                transition={{
                  duration: reduceMotion ? 0 : 0.6,
                  delay: reduceMotion ? 0 : i * 0.04,
                  ease: "easeOut",
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <dl className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-border bg-background/40 p-3 text-[11px]">
        {[
          ["Training corpus", `${MODEL_CARD.corpus.toLocaleString()} puzzles`],
          ["Held-out split", `${MODEL_CARD.test.toLocaleString()} puzzles`],
          ["Difficulty R²", MODEL_CARD.difficultyR2.toFixed(3)],
          ["Difficulty MAE", MODEL_CARD.difficultyMae.toFixed(2)],
          ["Solve-time R²", MODEL_CARD.timeR2.toFixed(3)],
          ["Hint classifier", `${(MODEL_CARD.hintAccuracy * 100).toFixed(1)}% accurate`],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-display font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[10px] text-muted-foreground/70">
        Labels come from the exhaustive BFS validator, so the model is distilling search into a
        closed-form estimate it can run every keystroke.
      </p>
    </section>
  );
}
