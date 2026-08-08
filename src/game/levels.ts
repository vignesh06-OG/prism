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

export const LEVELS: Level[] = [
  {
    id: "1-1",
    chapter: 1,
    index: 1,
    name: "Angle of Incidence",
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
    name: "Partial Transmission",
    teaches: "A splitter lets light pass through and bounce at the same time.",
    hint: "One splitter feeds both targets — face it so the reflection points up.",
    par: 1,
    board: board({
      width: 6,
      height: 5,
      cells: [
        [0, 2, emitter(1)],
        [3, 2, splitter(1)],
        [5, 2, target()],
        [3, 0, target()],
      ],
    }),
  },
  {
    id: "2-1",
    chapter: 2,
    index: 1,
    name: "Selective Absorption",
    teaches: "Filters keep only their own colour. Drag one from the tray onto the grid.",
    hint: "Each target wants a pure colour. Put the matching filter in its path.",
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
    id: "2-2",
    chapter: 2,
    index: 2,
    name: "Dispersion",
    teaches: "A prism shatters white light: red runs straight, green and blue peel away.",
    hint: "Place the prism where all three exits have a clear run.",
    par: 1,
    board: board({
      width: 7,
      height: 7,
      cells: [
        [0, 3, emitter(1)],
        [6, 3, target(RED)],
        [3, 0, target(GREEN)],
        [3, 6, target(BLUE)],
      ],
      tray: [prism()],
    }),
  },
  {
    id: "2-3",
    chapter: 2,
    index: 3,
    name: "The Long Blue Wavelength",
    hint: "Blue has to survive the whole trip — the filter strips it, the two mirrors carry it home.",
    par: 2,
    board: board({
      width: 7,
      height: 7,
      cells: [
        [0, 0, emitter(1)],
        [3, 0, filter(BLUE)],
        [6, 0, mirror(0)],
        [6, 5, mirror(1)],
        [1, 5, target(BLUE)],
        [4, 3, wall()],
        [2, 2, wall()],
      ],
    }),
  },
  {
    id: "3-1",
    chapter: 3,
    index: 1,
    name: "Additive Superposition",
    teaches: "Two beams landing together mix. Red plus green makes yellow.",
    hint: "Both beams must arrive at the same target.",
    par: 1,
    board: board({
      width: 7,
      height: 5,
      cells: [
        [0, 2, emitter(1, RED)],
        [0, 0, emitter(1, GREEN)],
        [5, 0, mirror(0)],
        [5, 2, target(RED | GREEN)],
      ],
    }),
  },
  {
    id: "3-2",
    chapter: 3,
    index: 2,
    name: "Cyanotype",
    hint: "Split the white beam, strip one half to green and the other to blue, then land both on the same target.",
    par: 3,
    board: board({
      width: 8,
      height: 6,
      cells: [
        [0, 1, emitter(1)],
        [2, 1, splitter(0)],
        [7, 1, target(GREEN | BLUE)],
        [4, 1, filter(GREEN)],
        [2, 4, filter(BLUE)],
        [7, 5, mirror(0)],
      ],
      tray: [mirror(0)],
    }),
  },
  {
    id: "3-3",
    chapter: 3,
    index: 3,
    name: "Spectral Order",
    hint: "The prism does the sorting; the mirrors do the delivering.",
    par: 2,
    board: board({
      width: 9,
      height: 7,
      cells: [
        [0, 3, emitter(1)],
        [4, 3, prism()],
        [8, 3, target(RED)],
        [4, 0, mirror(1)],
        [4, 6, mirror(1)],
        [8, 0, target(GREEN)],
        [0, 6, target(BLUE)],
      ],
    }),
  },
  {
    id: "4-1",
    chapter: 4,
    index: 1,
    name: "Total Internal Path",
    hint: "Run the beam clockwise around the hall: right edge down, bottom edge back, then up into the lantern.",
    par: 3,
    board: board({
      width: 9,
      height: 8,
      cells: [
        [0, 0, emitter(1)],
        [7, 0, mirror(0)],
        [7, 6, mirror(1)],
        [1, 6, mirror(0)],
        [1, 3, target(WHITE)],
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
    hint: "The prism aims red straight at its target. Green needs a mirror above it; blue needs the splitter turned.",
    par: 3,
    board: board({
      width: 9,
      height: 9,
      cells: [
        [0, 4, emitter(1)],
        [3, 4, prism()],
        [8, 4, target(RED)],
        [8, 1, target(GREEN)],
        [3, 7, splitter(0)],
        [8, 7, target(BLUE)],
        [6, 6, wall()],
        [6, 2, wall()],
      ],
      tray: [mirror(1)],
    }),
  },
  {
    id: "4-3",
    chapter: 4,
    index: 3,
    name: "Aurora",
    hint: "Magenta needs red and blue arriving at the same target. Both edges fold inward at column seven.",
    par: 2,
    board: board({
      width: 9,
      height: 9,
      cells: [
        [0, 0, emitter(1, RED)],
        [0, 8, emitter(1, BLUE)],
        [6, 0, mirror(0)],
        [6, 8, mirror(1)],
        [6, 4, target(RED | BLUE)],
        [3, 3, wall()],
        [4, 6, wall()],
        [8, 2, wall()],
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
    subtitle: "How light changes direction",
    blurb:
      "Light travels in straight lines until a surface turns it. Mirrors and half-silvered splitters give you the first control over its path.",
  },
  {
    n: 2,
    name: "Refraction & Absorption",
    subtitle: "How matter takes light apart",
    blurb:
      "White light is a bundle of wavelengths. Filters absorb what they are not; prisms bend each component by a different amount and separate them.",
  },
  {
    n: 3,
    name: "Superposition",
    subtitle: "How colours combine",
    blurb:
      "Where two beams meet, their channels add. Red and green make yellow, green and blue make cyan — colour stops being decoration and becomes a resource.",
  },
  {
    n: 4,
    name: "Optical Systems",
    subtitle: "How it all works together",
    blurb:
      "Long optical paths, tight geometry and no spare moves. Every phenomenon you have met, working in one instrument.",
  },
];
