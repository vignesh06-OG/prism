/**
 * Offline PhotonMind trainer.
 *
 *   bun run scripts/train-photonmind.ts
 *
 * Generates thousands of puzzles, labels them with the exhaustive BFS solver,
 * trains three lightweight models by gradient descent (two ridge regressors and
 * one logistic classifier), evaluates on a held-out split and writes the frozen
 * weights to src/game/photonmind/model.ts. Nothing about this runs in the app:
 * the shipped bundle only carries the numbers this script produces.
 */
import { writeFileSync } from "node:fs";
import { analyse } from "../src/game/analysis";
import { sampleBoards } from "../src/game/evolve";
import { extractFeatures, normalise, FEATURE_KEYS } from "../src/game/photonmind/features";

const SIZES: [number, number][] = [
  [5, 5],
  [6, 6],
  [7, 7],
  [8, 8],
  [9, 9],
];
const PER_SIZE = 900;

interface Row {
  x: number[];
  difficulty: number;
  seconds: number;
  hint: number;
}

console.log("Generating puzzles…");
const rows: Row[] = [];
let generated = 0;
for (const [w, h] of SIZES) {
  const boards = sampleBoards(1337 + w * 101 + h, PER_SIZE, w, h);
  for (const board of boards) {
    generated++;
    const a = analyse(board);
    if (!a.solvable || a.issues.length) continue;
    rows.push({
      x: normalise(extractFeatures(board)),
      difficulty: a.difficultyScore,
      seconds: a.estimatedSeconds,
      hint: a.minMoves >= 3 || (a.unique && a.minMoves >= 2) ? 1 : 0,
    });
  }
  console.log(`  ${w}x${h}: ${rows.length} labelled so far (${generated} generated)`);
}

// Deterministic shuffle so re-running the trainer reproduces the same split.
let s = 42;
const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (let i = rows.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [rows[i], rows[j]] = [rows[j]!, rows[i]!];
}
const split = Math.floor(rows.length * 0.8);
const train = rows.slice(0, split);
const test = rows.slice(split);
const D = FEATURE_KEYS.length;

const dot = (w: number[], x: number[]) => {
  let t = 0;
  for (let i = 0; i < D; i++) t += w[i]! * x[i]!;
  return t;
};

function fitRidge(target: (r: Row) => number, epochs = 4000, lr = 0.08, l2 = 1e-4) {
  const w = new Array<number>(D).fill(0);
  let b = 0;
  const scale = Math.max(...train.map(target), 1);
  for (let e = 0; e < epochs; e++) {
    const gw = new Array<number>(D).fill(0);
    let gb = 0;
    for (const r of train) {
      const err = dot(w, r.x) + b - target(r) / scale;
      for (let i = 0; i < D; i++) gw[i]! += err * r.x[i]!;
      gb += err;
    }
    const n = train.length;
    for (let i = 0; i < D; i++) w[i]! -= lr * (gw[i]! / n + l2 * w[i]!);
    b -= lr * (gb / n);
  }
  return { w, b, scale };
}

function fitLogistic(epochs = 3000, lr = 0.3, l2 = 1e-4) {
  const w = new Array<number>(D).fill(0);
  let b = 0;
  for (let e = 0; e < epochs; e++) {
    const gw = new Array<number>(D).fill(0);
    let gb = 0;
    for (const r of train) {
      const p = 1 / (1 + Math.exp(-(dot(w, r.x) + b)));
      const err = p - r.hint;
      for (let i = 0; i < D; i++) gw[i]! += err * r.x[i]!;
      gb += err;
    }
    const n = train.length;
    for (let i = 0; i < D; i++) w[i]! -= lr * (gw[i]! / n + l2 * w[i]!);
    b -= lr * (gb / n);
  }
  return { w, b };
}

console.log(`Training on ${train.length} puzzles, holding out ${test.length}…`);
const diff = fitRidge((r) => r.difficulty);
const time = fitRidge((r) => r.seconds);
const hint = fitLogistic();

const metrics = (m: { w: number[]; b: number; scale: number }, target: (r: Row) => number) => {
  const ys = test.map(target);
  const mean = ys.reduce((a, c) => a + c, 0) / Math.max(1, ys.length);
  let sse = 0;
  let sst = 0;
  let abs = 0;
  test.forEach((r, i) => {
    const pred = (dot(m.w, r.x) + m.b) * m.scale;
    const y = ys[i]!;
    sse += (pred - y) ** 2;
    sst += (y - mean) ** 2;
    abs += Math.abs(pred - y);
  });
  return { mae: abs / Math.max(1, test.length), r2: sst ? 1 - sse / sst : 0 };
};

const dm = metrics(diff, (r) => r.difficulty);
const tm = metrics(time, (r) => r.seconds);
let correct = 0;
for (const r of test) {
  const p = 1 / (1 + Math.exp(-(dot(hint.w, r.x) + hint.b)));
  if ((p >= 0.5 ? 1 : 0) === r.hint) correct++;
}
const acc = correct / Math.max(1, test.length);

// ---------------------------------------------------------------------------
// Baselines. A learned model is only worth shipping if it beats the obvious
// alternatives, so every headline number is reported against two of them:
//   1. mean/majority — predict the training average (or the dominant class);
//   2. piece-count rule — the single most intuitive hand-written heuristic,
//      fitted as a one-variable least-squares line.
// ---------------------------------------------------------------------------
const PIECES_IDX = FEATURE_KEYS.indexOf("pieces");

const meanBaseline = (target: (r: Row) => number) => {
  const mu = train.reduce((a, r) => a + target(r), 0) / Math.max(1, train.length);
  const abs = test.reduce((a, r) => a + Math.abs(mu - target(r)), 0);
  return abs / Math.max(1, test.length);
};

const pieceCountBaseline = (target: (r: Row) => number) => {
  // Ordinary least squares on the single "pieces" feature.
  const xs = train.map((r) => r.x[PIECES_IDX]!);
  const ys = train.map(target);
  const mx = xs.reduce((a, c) => a + c, 0) / Math.max(1, xs.length);
  const my = ys.reduce((a, c) => a + c, 0) / Math.max(1, ys.length);
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i]! - my);
    den += (x - mx) ** 2;
  });
  const slope = den ? num / den : 0;
  const intercept = my - slope * mx;
  const abs = test.reduce(
    (a, r) => a + Math.abs(slope * r.x[PIECES_IDX]! + intercept - target(r)),
    0,
  );
  return abs / Math.max(1, test.length);
};

const majority = train.reduce((a, r) => a + r.hint, 0) / Math.max(1, train.length) >= 0.5 ? 1 : 0;
const majorityAcc =
  test.filter((r) => r.hint === majority).length / Math.max(1, test.length);

const baselines = {
  difficultyMeanMae: meanBaseline((r) => r.difficulty),
  difficultyPieceMae: pieceCountBaseline((r) => r.difficulty),
  secondsMeanMae: meanBaseline((r) => r.seconds),
  secondsPieceMae: pieceCountBaseline((r) => r.seconds),
  hintMajorityAccuracy: majorityAcc,
};

// ---------------------------------------------------------------------------
// The real value of the model is latency: it replaces an exhaustive BFS with a
// 16-multiply dot product. Measure both on the same held-out boards.
// ---------------------------------------------------------------------------
const timedBoards = sampleBoards(999_331, 60, 7, 7);
let t0 = performance.now();
for (const b of timedBoards) analyse(b);
const bfsMs = (performance.now() - t0) / timedBoards.length;
t0 = performance.now();
for (const b of timedBoards) {
  const x = normalise(extractFeatures(b));
  dot(diff.w, x);
}
const mlMs = (performance.now() - t0) / timedBoards.length;

// Feature std on the training split drives the importance chart.
const std = FEATURE_KEYS.map((_, i) => {
  const col = train.map((r) => r.x[i]!);
  const m = col.reduce((a, c) => a + c, 0) / Math.max(1, col.length);
  return Math.sqrt(col.reduce((a, c) => a + (c - m) ** 2, 0) / Math.max(1, col.length));
});

const arr = (a: number[]) => `[${a.map((v) => v.toFixed(6)).join(", ")}]`;

const out = `/**
 * PhotonMind — frozen model weights.
 *
 * GENERATED FILE. Produced by scripts/train-photonmind.ts on a corpus of
 * ${rows.length} solver-labelled puzzles. Do not hand-edit; retrain instead.
 */
export const MODEL = {
  trainedOn: ${rows.length},
  trainSize: ${train.length},
  testSize: ${test.length},
  difficulty: { w: ${arr(diff.w)}, b: ${diff.b.toFixed(6)}, scale: ${diff.scale}, mae: ${dm.mae.toFixed(3)}, r2: ${dm.r2.toFixed(4)} },
  solveSeconds: { w: ${arr(time.w)}, b: ${time.b.toFixed(6)}, scale: ${time.scale}, mae: ${tm.mae.toFixed(3)}, r2: ${tm.r2.toFixed(4)} },
  hintRisk: { w: ${arr(hint.w)}, b: ${hint.b.toFixed(6)}, accuracy: ${acc.toFixed(4)} },
  featureStd: ${arr(std)},
  /** Honest comparison against the obvious non-learned alternatives. */
  baselines: {
    difficultyMeanMae: ${baselines.difficultyMeanMae.toFixed(3)},
    difficultyPieceMae: ${baselines.difficultyPieceMae.toFixed(3)},
    secondsMeanMae: ${baselines.secondsMeanMae.toFixed(3)},
    secondsPieceMae: ${baselines.secondsPieceMae.toFixed(3)},
    hintMajorityAccuracy: ${baselines.hintMajorityAccuracy.toFixed(4)},
  },
  /** Mean per-board wall time, measured on 60 unseen 7x7 boards. */
  latency: { bfsMs: ${bfsMs.toFixed(3)}, mlMs: ${mlMs.toFixed(4)} },
} as const;
`;

writeFileSync("src/game/photonmind/model.ts", out);
console.log(
  `Baselines: difficulty mean MAE=${baselines.difficultyMeanMae.toFixed(2)} piece-rule MAE=${baselines.difficultyPieceMae.toFixed(2)} · hint majority=${(majorityAcc * 100).toFixed(1)}% · BFS ${bfsMs.toFixed(2)}ms vs ML ${mlMs.toFixed(3)}ms\n` +
  `Done. difficulty R²=${dm.r2.toFixed(3)} MAE=${dm.mae.toFixed(2)} · time R²=${tm.r2.toFixed(3)} · hint acc=${(acc * 100).toFixed(1)}%`,
);
