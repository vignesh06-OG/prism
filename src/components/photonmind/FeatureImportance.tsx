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

      <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
        <p className="font-display text-[11px] tracking-[0.28em] text-muted-foreground uppercase">
          Measured against the obvious alternatives
        </p>
        <table className="mt-2 w-full text-[11px]">
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="py-1 text-left font-normal">
                Predictor
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                Difficulty MAE
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                Hint accuracy
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            <tr className="border-t border-border/60">
              <td className="py-1">Predict the average</td>
              <td className="py-1 text-right">
                {MODEL_CARD.baselines.difficultyMeanMae.toFixed(2)}
              </td>
              <td className="py-1 text-right">
                {(MODEL_CARD.baselines.hintMajorityAccuracy * 100).toFixed(1)}%
              </td>
            </tr>
            <tr className="border-t border-border/60">
              <td className="py-1">Piece-count rule</td>
              <td className="py-1 text-right">
                {MODEL_CARD.baselines.difficultyPieceMae.toFixed(2)}
              </td>
              <td className="py-1 text-right text-muted-foreground">—</td>
            </tr>
            <tr className="border-t border-border/60 text-primary">
              <td className="py-1 font-semibold">PhotonMind</td>
              <td className="py-1 text-right font-semibold">
                {MODEL_CARD.difficultyMae.toFixed(2)}
              </td>
              <td className="py-1 text-right font-semibold">
                {(MODEL_CARD.hintAccuracy * 100).toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {(MODEL_CARD.difficultyLift * 100).toFixed(0)}% lower difficulty error than the best
          hand-written rule, and {(MODEL_CARD.hintLift * 100).toFixed(1)} points above the
          majority-class classifier. It also runs in{" "}
          {(MODEL_CARD.latency.mlMs * 1000).toFixed(0)}µs against{" "}
          {MODEL_CARD.latency.bfsMs.toFixed(2)}ms for the exhaustive solver —{" "}
          {MODEL_CARD.speedup.toFixed(0)}× faster, which is what makes live per-keystroke
          estimation possible.
        </p>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground/70">
        Labels come from the exhaustive BFS validator, so this is a distillation model: it learns
        to approximate search, not to guess human behaviour. Player-facing calibration is tracked
        separately and only claims confidence once real solves back it up.
      </p>

    </section>
  );
}
