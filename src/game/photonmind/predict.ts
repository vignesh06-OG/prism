/**
 * PhotonMind — inference and explanation.
 *
 * Runs the frozen linear/logistic models over a board's features and, more
 * importantly, explains itself: every prediction ships with the per-feature
 * contributions that produced it, so a reader can audit the number instead of
 * trusting it.
 */
import { extractFeatures, normalise, FEATURE_KEYS, FEATURE_LABELS, type FeatureKey, type FeatureVector } from "./features";
import { MODEL } from "./model";
import type { Board } from "../types";

export interface Contribution {
  key: FeatureKey;
  label: string;
  raw: number;
  /** Signed effect of this feature on the prediction, in output units. */
  effect: number;
  /** Share of the total absolute effect, 0–1. */
  share: number;
}

export interface Prediction {
  features: FeatureVector;
  difficulty: number;
  rating: string;
  solveSeconds: number;
  hintRisk: number;
  /** 0–1, from how far the inputs sit inside the training distribution. */
  confidence: number;
  contributions: Contribution[];
  /** Microseconds the model needed — contrast this with the solver. */
  microseconds: number;
}

const dot = (w: readonly number[], x: number[]) =>
  w.reduce((sum, wi, i) => sum + wi * (x[i] ?? 0), 0);

export const ratingOf = (score: number) =>
  score < 26 ? "Beginner" : score < 46 ? "Intermediate" : score < 70 ? "Advanced" : score < 96 ? "Master" : "Expert";

export function predict(board: Board): Prediction {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const features = extractFeatures(board);
  const x = normalise(features);

  const difficulty = Math.max(
    0,
    Math.round((dot(MODEL.difficulty.w, x) + MODEL.difficulty.b) * MODEL.difficulty.scale),
  );
  const solveSeconds = Math.max(
    5,
    Math.round((dot(MODEL.solveSeconds.w, x) + MODEL.solveSeconds.b) * MODEL.solveSeconds.scale),
  );
  const hintRisk = 1 / (1 + Math.exp(-(dot(MODEL.hintRisk.w, x) + MODEL.hintRisk.b)));

  const effects = FEATURE_KEYS.map(
    (_, i) => (MODEL.difficulty.w[i] ?? 0) * (x[i] ?? 0) * MODEL.difficulty.scale,
  );
  const total = effects.reduce((a, c) => a + Math.abs(c), 0) || 1;
  const contributions: Contribution[] = FEATURE_KEYS.map((k, i) => ({
    key: k,
    label: FEATURE_LABELS[k],
    raw: features[k],
    effect: effects[i] ?? 0,
    share: Math.abs(effects[i] ?? 0) / total,
  })).sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));

  // Inputs far outside the training spread are extrapolation; say so.
  const extrapolation =
    x.reduce((worst, v, i) => {
      const sd = MODEL.featureStd[i] ?? 0.001;
      return Math.max(worst, sd > 0 ? Math.abs(v) / (sd * 6) : 0);
    }, 0) || 1;
  const confidence = Math.max(0.35, Math.min(0.95, 0.92 - Math.max(0, extrapolation - 1) * 0.3));

  const t1 = typeof performance !== "undefined" ? performance.now() : 0;
  return {
    features,
    difficulty,
    rating: ratingOf(difficulty),
    solveSeconds,
    hintRisk,
    confidence,
    contributions,
    microseconds: Math.max(1, Math.round((t1 - t0) * 1000)),
  };
}

/** Global importance: |weight| × feature spread on the training corpus. */
export function featureImportance() {
  const rows = FEATURE_KEYS.map((k, i) => ({
    key: k,
    label: FEATURE_LABELS[k],
    value: Math.abs(MODEL.difficulty.w[i] ?? 0) * (MODEL.featureStd[i] ?? 0),
    sign: Math.sign(MODEL.difficulty.w[i] ?? 0),
  }));
  const max = Math.max(...rows.map((r) => r.value), 1e-6);
  return rows
    .map((r) => ({ ...r, normalised: r.value / max }))
    .sort((a, b) => b.value - a.value);
}

export const MODEL_CARD = {
  corpus: MODEL.trainedOn,
  train: MODEL.trainSize,
  test: MODEL.testSize,
  difficultyR2: MODEL.difficulty.r2,
  difficultyMae: MODEL.difficulty.mae,
  timeR2: MODEL.solveSeconds.r2,
  hintAccuracy: MODEL.hintRisk.accuracy,
  features: FEATURE_KEYS.length,
  baselines: MODEL.baselines,
  latency: MODEL.latency,
  /** Error reduction against the best non-learned alternative, 0…1. */
  difficultyLift:
    1 -
    MODEL.difficulty.mae /
      Math.min(MODEL.baselines.difficultyMeanMae, MODEL.baselines.difficultyPieceMae),
  hintLift: MODEL.hintRisk.accuracy - MODEL.baselines.hintMajorityAccuracy,
  speedup: MODEL.latency.bfsMs / Math.max(1e-6, MODEL.latency.mlMs),
};

