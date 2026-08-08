/**
 * PhotonMind — frozen model weights.
 *
 * GENERATED FILE. Produced by scripts/train-photonmind.ts on a corpus of
 * 2581 solver-labelled puzzles. Do not hand-edit; retrain instead.
 */
export const MODEL = {
  trainedOn: 2581,
  trainSize: 2064,
  testSize: 517,
  difficulty: { w: [0.018221, -0.004091, 0.770716, 0.064450, 0.064450, 0.085933, 0.402920, 0.000000, 0.000000, 0.000000, -0.002337, 0.059821, -0.279333, 0.000000, -0.231517, 0.068504], b: 0.266662, scale: 90, mae: 5.058, r2: 0.6630 },
  solveSeconds: { w: [0.011034, -0.007948, 0.727806, 0.071645, 0.071645, 0.095527, 0.360242, 0.000000, 0.000000, 0.000000, 0.000063, 0.035890, -0.279726, 0.000000, -0.235779, 0.048820], b: 0.296208, scale: 244, mae: 13.598, r2: 0.6496 },
  hintRisk: { w: [-0.416374, -1.432895, 9.147562, -0.184082, -0.184082, -0.245443, 2.091802, 0.000000, 0.000000, 0.000000, 0.131318, 0.739893, -4.625693, 0.000000, -3.144428, -0.011833], b: -0.789223, accuracy: 0.8453 },
  featureStd: [0.162036, 0.047876, 0.075418, 0.000000, 0.000000, 0.000000, 0.072276, 0.000000, 0.000000, 0.000000, 0.097742, 0.053132, 0.044335, 0.000000, 0.274919, 0.089289],
  /** Honest comparison against the obvious non-learned alternatives. */
  baselines: {
    difficultyMeanMae: 9.945,
    difficultyPieceMae: 9.575,
    secondsMeanMae: 26.340,
    secondsPieceMae: 25.223,
    hintMajorityAccuracy: 0.7118,
  },
  /** Mean per-board wall time, measured on 60 unseen 7x7 boards. */
  latency: { bfsMs: 0.365, mlMs: 0.0192 },
} as const;
