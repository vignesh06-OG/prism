/**
 * Campaign difficulty audit.
 *
 * For every level: BFS minimum solution depth, states explored, optimal
 * solution count, plus the beam-level genome and the PhotonMind human
 * difficulty prediction. Used to verify the campaign curve actually rises.
 *
 * Run: bunx tsx scripts/validate-levels.ts   (or: bun scripts/validate-levels.ts)
 */
import { LEVELS } from "../src/game/levels";
import { analyse } from "../src/game/analysis";
import { genome } from "../src/game/genome";
import { predict } from "../src/game/photonmind/predict";

const pad = (s: string | number, n: number) => String(s).padEnd(n);

let failures = 0;
let prevScore = -Infinity;
const rows: string[] = [];

for (const level of LEVELS) {
  const a = analyse(level.board);
  const g = genome(level.board, a.minMoves);
  const p = predict(level.board);

  const ok = a.solvable && a.issues.length === 0;
  if (!ok) failures++;
  if (a.solvable && a.minMoves !== level.par) {
    failures++;
    rows.push(`  !! ${level.id} par=${level.par} but solver minMoves=${a.minMoves}`);
  }

  rows.push(
    [
      pad(level.id, 6),
      pad(level.name.slice(0, 26), 28),
      pad(ok ? "OK" : "FAIL", 6),
      pad(`par ${level.par}`, 8),
      pad(`min ${a.minMoves}`, 8),
      pad(`sols ${a.solutionCount}`, 10),
      pad(`states ${a.statesExplored}`, 14),
      pad(`solver ${a.difficultyScore}`, 13),
      pad(`ml ${p.difficulty}`, 8),
      pad(`cplx ${g.complexity}`, 10),
      pad(a.rating, 13),
      `conf ${(p.confidence * 100).toFixed(0)}%`,
    ].join(""),
  );

  if (a.difficultyScore < prevScore - 6) {
    rows.push(`  ~~ ${level.id} dips below the previous level (${a.difficultyScore} < ${prevScore})`);
  }
  prevScore = a.difficultyScore;
}

console.log(rows.join("\n"));
console.log(failures ? `\n${failures} problem(s) found.` : "\nAll levels solvable and par-accurate.");
process.exit(failures ? 1 : 0);
