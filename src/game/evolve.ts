/**
 * AI Puzzle Evolution — a deterministic generate-and-test loop. Candidates are
 * mutated from a seeded PRNG, traced by the same engine the game uses, verified
 * by the BFS solver, and scored by their genome. Unsolvable, trivial or
 * degenerate layouts are discarded. No language model is involved: the "AI" is
 * search plus a fitness function over the simulation.
 */
import { analyse, type Analysis } from "./analysis";
import { genome, type Genome } from "./genome";
import { reflect } from "./engine";
import { DELTA, key, type Board, type Dir, type Piece } from "./types";

export interface Candidate {
  board: Board;
  analysis: Analysis;
  genome: Genome;
  fitness: number;
  generation: number;
}

export interface EvolveOptions {
  seed?: number;
  /** Candidates to grow and test. */
  population?: number;
  width?: number;
  height?: number;
  /** Desired difficulty band, 0–100. */
  targetComplexity?: number;
}

/** mulberry32 — tiny deterministic PRNG so a seed always regrows the same set. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let uid = 0;
const piece = (p: Omit<Piece, "id">): Piece => ({ id: `g${(uid++).toString(36)}`, ...p });


/**
 * Grows a candidate by construction, not by chance: it walks a beam from an
 * emitter, bends it at mirrors, ends the run on a target, then scrambles a few
 * mirrors so the player has real moves to find. Construction guarantees the
 * layout is reachable; the BFS solver still has the final say.
 */
function grow(rand: () => number, width: number, height: number, gen: number): Board {
  const cells: Record<string, Piece> = {};
  const used = new Set<string>();
  const pathCells = new Set<string>();

  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;

  // Start on an edge, firing inward.
  const side = Math.floor(rand() * 4) as 0 | 1 | 2 | 3;
  let x: number;
  let y: number;
  let dir: Dir;
  if (side === 0) {
    x = Math.floor(rand() * width);
    y = height - 1;
    dir = 0;
  } else if (side === 1) {
    x = 0;
    y = Math.floor(rand() * height);
    dir = 1;
  } else if (side === 2) {
    x = Math.floor(rand() * width);
    y = 0;
    dir = 2;
  } else {
    x = width - 1;
    y = Math.floor(rand() * height);
    dir = 3;
  }

  cells[key(x, y)] = piece({ kind: "emitter", rot: dir, color: 7, fixed: true });
  used.add(key(x, y));
  pathCells.add(key(x, y));

  const mirrorKeys: string[] = [];
  const bends = 1 + Math.floor(rand() * Math.min(3, 1 + gen));

  const runTo = (steps: number): boolean => {
    for (let i = 0; i < steps; i++) {
      const [dx, dy] = DELTA[dir];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
      if (used.has(key(nx, ny))) return false;
      x = nx;
      y = ny;
      pathCells.add(key(x, y));
    }
    return true;
  };

  for (let b = 0; b < bends; b++) {
    const steps = 1 + Math.floor(rand() * 3);
    if (!runTo(steps)) break;
    const rot = rand() < 0.5 ? 0 : 1;
    const k = key(x, y);
    cells[k] = piece({ kind: "mirror", rot });
    used.add(k);
    mirrorKeys.push(k);
    dir = reflect(dir, rot);
  }

  // Final straight run into the target.
  if (!runTo(1 + Math.floor(rand() * 3))) {
    const [dx, dy] = DELTA[dir];
    if (
      x + dx < 0 ||
      y + dy < 0 ||
      x + dx >= width ||
      y + dy >= height ||
      used.has(key(x + dx, y + dy))
    ) {
      return { width, height, cells, tray: [] }; // dead layout; the solver rejects it
    }
  }
  const targetKey = key(x, y);
  if (used.has(targetKey)) return { width, height, cells, tray: [] };
  cells[targetKey] = piece({ kind: "target", rot: 0, color: 7, fixed: true });
  used.add(targetKey);

  // Decoration: walls only where they cannot touch the solution path.
  const walls = Math.floor(rand() * 3);
  for (let i = 0; i < walls; i++) {
    const wx = Math.floor(rand() * width);
    const wy = Math.floor(rand() * height);
    const k = key(wx, wy);
    if (pathCells.has(k) || used.has(k)) continue;
    cells[k] = piece({ kind: "wall", rot: 0, fixed: true });
    used.add(k);
  }

  // Scramble: flip mirrors and, sometimes, lift one into the tray.
  const tray: Piece[] = [];
  if (mirrorKeys.length) {
    const flips = 1 + Math.floor(rand() * mirrorKeys.length);
    for (let i = 0; i < flips; i++) {
      const k = pick(mirrorKeys);
      const p = cells[k]!;
      cells[k] = { ...p, rot: (p.rot + 1) % 2 };
    }
    if (rand() < 0.3) {
      const k = pick(mirrorKeys);
      const p = cells[k];
      if (p) {
        delete cells[k];
        tray.push(p);
      }
    }
  }

  return { width, height, cells, tray };
}

/** Fitness rewards a real, discoverable, non-trivial solution. */
function score(analysis: Analysis, g: Genome, targetComplexity: number): number {
  if (!analysis.solvable) return -1;
  if (analysis.minMoves === 0) return -1; // already solved on load
  const depth = Math.min(6, analysis.minMoves) * 12;
  const nearness = 100 - Math.abs(g.complexity - targetComplexity);
  const elegance = analysis.solutionCount <= 3 ? 22 : Math.max(0, 22 - analysis.solutionCount);
  return Math.round(depth * 0.5 + nearness * 0.5 + elegance + g.beamInteractions * 0.8);
}

/**
 * Grows a population, keeps only the puzzles that survive validation and
 * returns them best-first. Same seed ⇒ same puzzles, every time.
 */
export function evolvePuzzles({
  seed = 1,
  population = 24,
  width = 7,
  height = 7,
  targetComplexity = 55,
}: EvolveOptions = {}): { kept: Candidate[]; tested: number; rejected: number } {
  const rand = rng(seed);
  const kept: Candidate[] = [];
  let rejected = 0;

  for (let i = 0; i < population; i++) {
    const generation = 1 + Math.floor(i / 8);
    const board = grow(rand, width, height, generation);
    const analysis = analyse(board);
    if (!analysis.solvable || analysis.issues.length || analysis.minMoves === 0) {
      rejected++;
      continue;
    }
    const g = genome(board, analysis.minMoves);
    const fitness = score(analysis, g, targetComplexity);
    if (fitness < 0) {
      rejected++;
      continue;
    }
    kept.push({ board, analysis, genome: g, fitness, generation });
  }

  kept.sort((a, b) => b.fitness - a.fitness);
  return { kept: kept.slice(0, 6), tested: population, rejected };
}

/**
 * Raw sampler used by the offline PhotonMind trainer: returns every grown
 * layout, verified or not, so the learner sees hard negatives too.
 */
export function sampleBoards(
  seed: number,
  count: number,
  width = 7,
  height = 7,
): Board[] {
  const rand = rng(seed);
  const out: Board[] = [];
  for (let i = 0; i < count; i++) {
    out.push(grow(rand, width, height, 1 + Math.floor(rand() * 3)));
  }
  return out;
}
