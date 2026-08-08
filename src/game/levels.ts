import { BLUE, GREEN, RED, WHITE, key, type Board, type Level, type Piece } from "./types";

let uid = 0;
const p = (piece: Omit<Piece, "id">): Piece => ({ id: `p${++uid}`, ...piece });

const emitter = (rot: number, color = WHITE) =>
  p({ kind: "emitter", rot, color, fixed: true });
const target = (color = WHITE) => p({ kind: "target", rot: 0, color, fixed: true });
const mirror = (rot: number) => p({ kind: "mirror", rot });
const splitter = (rot: number) => p({ kind: "splitter", rot });
const filter = (color: number) => p({ kind: "filter", rot: 0, color });
const prism = () => p({ kind: "prism", rot: 0 });
const wall = () => p({ kind: "wall", rot: 0, fixed: true });

interface Spec {
  width: number;
  height: number;
  cells: Array<[number, number, Piece]>;
  tray?: Piece[];
}

const board = (spec: Spec): Board => ({
  width: spec.width,
  height: spec.height,
  cells: Object.fromEntries(spec.cells.map(([x, y, piece]) => [key(x, y), piece])),
  tray: spec.tray ?? [],
});

/**
 * The campaign is a designed difficulty curve, not a pile of puzzles.
 *
 *   1-1 … 1-3   Discovery      — "I understand how Prism works."
 *   2-1 … 2-3   Transformation — "I know the rules, now I have to think."
 *   3-1 … 3-3   Systems        — "I must plan the whole network first."
 *   4-1 … 4-2   Mastery        — "This is genuinely difficult."
 *   4-3         Culmination    — "I finally mastered the system."
 *
 * Every level carries a distinct cognitive identity (`concept`) so difficulty
 * grows through reasoning, never through board size or filler pieces. Pars are
 * the BFS optimum, verified by scripts/validate-levels.ts.
 */
export const LEVELS: Level[] = [
  {
    id: "1-1",
    chapter: 1,
    index: 1,
    name: "Angle of Incidence",
    concept: "Reflection",
    tier: "Gentle",
    teaches: "Tap a mirror to turn it. Light bends where the mirror faces.",
    hint: "The mirror only has two positions. Try the other one.",
    par: 1,
    board: board({
      width: 5,
      height: 5,
      cells: [
        [0, 2, emitter(1)],
        [2, 2, mirror(1)],
        [2, 0, target()],
      ],
    }),
  },
  {
    id: "1-2",
    chapter: 1,
    index: 2,
    name: "The Law of Reflection",
    concept: "Chaining two reflections",
    tier: "Gentle",
    teaches: "A beam can be handed from one mirror to the next.",
    hint: "Send the beam down the far edge first, then back along the bottom.",
    par: 2,
    board: board({
      width: 6,
      height: 6,
      cells: [
        [0, 0, emitter(1)],
        [4, 0, mirror(0)],
        [4, 4, mirror(1)],
        [0, 4, target()],
        [2, 2, wall()],
        [3, 3, wall()],
      ],
    }),
  },
  {
    id: "1-3",
    chapter: 1,
    index: 3,
    name: "The Mirror That Was Right",
    concept: "Reading the existing path — restraint",
    tier: "Gentle",
    teaches: "Not every mirror is wrong. Read the path before you touch it.",
    hint: "One of the three mirrors is already aimed correctly. Find it, then leave it alone.",
    par: 2,
    board: board({
      width: 7,
      height: 5,
      cells: [
        [0, 0, emitter(1)],
        [5, 0, mirror(1)],
        [5, 3, mirror(1)],
        [1, 3, mirror(0)],
        [1, 1, target()],
        [3, 2, wall()],
      ],
    }),
  },
  {
    id: "2-1",
    chapter: 2,
    index: 1,
    name: "Partial Transmission",
    concept: "One beam, two destinations",
    tier: "Testing",
    teaches: "A splitter lets light pass through and bounce at the same time.",
    hint: "The splitter feeds both halves of the room — then the upper beam still needs turning.",
    par: 2,
    board: board({
      width: 7,
      height: 5,
      cells: [
        [0, 2, emitter(1)],
        [3, 2, splitter(1)],
        [6, 2, target()],
        [3, 0, mirror(1)],
        [6, 0, target()],
      ],
    }),
  },
  {
    id: "2-2",
    chapter: 2,
    index: 2,
    name: "Selective Absorption",
    concept: "Choosing what to remove from white",
    tier: "Testing",
    teaches: "Filters keep only their own colour. Drag one from the tray onto the grid.",
    hint: "Each target wants a pure colour. Put the matching filter somewhere in its path.",
    par: 2,
    board: board({
      width: 7,
      height: 6,
      cells: [
        [0, 1, emitter(1)],
        [3, 1, splitter(1)],
        [6, 1, target(RED)],
        [3, 5, target(GREEN)],
      ],
      tray: [filter(RED), filter(GREEN)],
    }),
  },
  {
    id: "2-3",
    chapter: 2,
    index: 3,
    name: "Dispersion",
    concept: "Placing the transformation, then routing its output",
    tier: "Testing",
    teaches: "A prism shatters white light: red runs straight, green peels up, blue peels down.",
    hint: "Place the prism so all three components have a clear run — then look at where blue lands.",
    par: 2,
    board: board({
      width: 7,
      height: 7,
      cells: [
        [0, 3, emitter(1)],
        [6, 3, target(RED)],
        [3, 0, target(GREEN)],
        [3, 6, mirror(0)],
        [6, 6, target(BLUE)],
      ],
      tray: [prism()],
    }),
  },
  {
    id: "3-1",
    chapter: 3,
    index: 1,
    name: "Additive Superposition",
    concept: "One beam owing two debts",
    tier: "Demanding",
    teaches:
      "Beams that arrive together add. Red plus green plus blue is white again — and one beam can serve two targets at once.",
    hint: "White needs all three channels. But red is also the only source the second target can ever use, so it has to do both jobs.",
    par: 3,
    board: board({
      width: 7,
      height: 7,
      cells: [
        [0, 3, emitter(1, RED)],
        [0, 0, emitter(1, GREEN)],
        [0, 6, emitter(1, BLUE)],
        [3, 3, splitter(0)],
        [3, 5, target(RED)],
        [6, 0, mirror(0)],
        [6, 6, mirror(1)],
        [6, 3, target(WHITE)],
      ],
    }),

  },
  {
    id: "3-2",
    chapter: 3,
    index: 2,
    name: "Cyanotype",
    concept: "Split, transform each half, recombine",
    tier: "Demanding",
    hint: "The target cannot be reached by one beam. Ask what two beams would have to carry.",
    par: 3,
    board: board({
      width: 8,
      height: 7,
      cells: [
        [0, 1, emitter(1)],
        [2, 1, splitter(0)],
        [5, 1, filter(GREEN)],
        [7, 1, target(GREEN | BLUE)],
        [2, 3, filter(BLUE)],
        [2, 5, mirror(0)],
        [7, 5, mirror(1)],
        [4, 4, wall()],
      ],
    }),
  },
  {
    id: "3-3",
    chapter: 3,
    index: 3,
    name: "Spectral Order",
    concept: "Three dependent deliveries from one source",
    tier: "Demanding",
    hint: "The prism does the sorting; each component then needs its own carrier. Solve them one colour at a time.",
    par: 3,
    board: board({
      width: 9,
      height: 7,
      cells: [
        [0, 3, emitter(1)],
        [4, 3, prism()],
        [8, 3, target(RED)],
        [4, 0, mirror(1)],
        [8, 0, mirror(0)],
        [8, 1, target(GREEN)],
        [4, 6, mirror(1)],
        [0, 6, target(BLUE)],
        [6, 5, wall()],
      ],
    }),
  },
  {
    id: "4-1",
    chapter: 4,
    index: 1,
    name: "Total Internal Path",
    concept: "A four-stage route with no spare moves",
    tier: "Master",
    hint: "Walk the perimeter clockwise in your head before touching anything: right, bottom, left, then inward.",
    par: 4,
    board: board({
      width: 9,
      height: 8,
      cells: [
        [0, 0, emitter(1)],
        [7, 0, mirror(0)],
        [7, 6, mirror(1)],
        [1, 6, mirror(0)],
        [1, 1, mirror(1)],
        [5, 1, target(WHITE)],
        [4, 2, wall()],
        [5, 4, wall()],
        [3, 5, wall()],
      ],
    }),
  },
  {
    id: "4-2",
    chapter: 4,
    index: 2,
    name: "The Whole Spectrum",
    concept: "One dispersion feeding three independent chains",
    tier: "Master",
    hint: "Red is already free. Green and blue each need their own carrier, and blue needs two.",
    par: 4,
    board: board({
      width: 9,
      height: 9,
      cells: [
        [0, 4, emitter(1)],
        [3, 4, prism()],
        [7, 4, mirror(1)],
        [7, 2, target(RED)],
        [3, 1, mirror(1)],
        [8, 1, target(GREEN)],
        [3, 7, splitter(0)],
        [8, 7, mirror(0)],
        [8, 8, target(BLUE)],
        [5, 6, wall()],
        [6, 3, wall()],
      ],
    }),
  },
  {
    id: "4-3",
    chapter: 4,
    index: 3,
    name: "Chromatic Lock",
    concept: "Backward reasoning across two sources",
    tier: "Master",
    hint: "Start at the white lock and work backwards: white needs red, green and blue arriving together — and only one of them comes from the prism's straight line.",
    par: 5,
    board: board({
      width: 9,
      height: 9,
      cells: [
        [0, 4, emitter(1)],
        [3, 4, prism()],
        [7, 4, mirror(0)],
        [7, 6, target(RED)],
        [3, 1, mirror(1)],
        [8, 1, target(WHITE)],
        [3, 7, mirror(0)],
        [8, 7, mirror(1)],
        [0, 0, emitter(1, RED)],
        [8, 0, mirror(0)],
        [5, 2, wall()],
        [1, 6, wall()],
      ],
    }),
  },
];

export const getLevel = (id: string) => LEVELS.find((l) => l.id === id);
export const nextLevel = (id: string) => {
  const i = LEVELS.findIndex((l) => l.id === id);
  return i >= 0 ? LEVELS[i + 1] : undefined;
};

/**
 * The campaign reads as a scientific journey rather than a list of stages:
 * each chapter is a phenomenon, each level the experiment that demonstrates it.
 */
export const CHAPTERS = [
  {
    n: 1,
    name: "Reflection",
    subtitle: "Discover light",
    blurb:
      "Light travels in straight lines until a surface turns it. Three experiments: bend one beam, chain two mirrors, and learn to read a path before you disturb it.",
  },
  {
    n: 2,
    name: "Refraction & Absorption",
    subtitle: "Understand light",
    blurb:
      "White light is a bundle of wavelengths. Splitters duplicate a beam, filters absorb what they are not, and prisms separate every component at once.",
  },
  {
    n: 3,
    name: "Superposition",
    subtitle: "Combine light",
    blurb:
      "Where beams meet, their channels add. From here a target is rarely reachable by a single beam — you have to design the whole network before the first move.",
  },
  {
    n: 4,
    name: "Optical Systems",
    subtitle: "Master light",
    blurb:
      "Long optical paths, several sources and no spare moves. The final lock has to be solved backwards, from the colour it demands to the light that can supply it.",
  },
];
