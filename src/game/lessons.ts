/**
 * ONE takeaway per level.
 *
 * The victory card is not a textbook: each level closes with a single named
 * concept, one accurate sentence about it, and — only where the history is
 * genuinely attributable — who established it. Where a result has no honest
 * single author, the attribution is omitted rather than invented.
 */
export interface Lesson {
  concept: string;
  statement: string;
  /** Omitted when no single, verifiable attribution exists. */
  discoveredBy?: string;
}

const REFLECTION: Lesson = {
  concept: "Reflection",
  statement:
    "A ray leaves a mirror at the same angle it arrived, both measured from the line perpendicular to the surface.",
  discoveredBy: "Hero of Alexandria (1st c.), explained optically by Ibn al-Haytham (c. 1021)",
};

export const LESSONS: Record<string, Lesson> = {
  "1-1": REFLECTION,
  "1-2": {
    concept: "Law of reflection",
    statement:
      "The incoming ray, the reflected ray and the surface normal all lie in one plane — reflection never twists light out of its own plane.",
    discoveredBy: "Ibn al-Haytham, Book of Optics (c. 1021)",
  },
  "1-3": {
    concept: "Path reasoning",
    statement:
      "A beam's route is a chain: changing one element changes everything downstream of it, and nothing upstream.",
  },
  "2-1": {
    concept: "Partial transmission",
    statement:
      "A partly reflecting surface sends some light onward and reflects the rest, dividing the energy between two paths.",
    discoveredBy: "Quantified by Augustin-Jean Fresnel (1820s)",
  },
  "2-2": {
    concept: "Selective absorption",
    statement:
      "A colour filter transmits its own band and absorbs the rest. It can only remove light from a beam, never add to it.",
  },
  "2-3": {
    concept: "Dispersion",
    statement:
      "Refractive index depends on wavelength, so a prism sends each colour of white light off in a slightly different direction.",
    discoveredBy: "Isaac Newton's prism experiments (1660s)",
  },
  "3-1": {
    concept: "Additive colour mixing",
    statement:
      "Overlapping beams add: red and green make yellow, and all three primaries together make white.",
    discoveredBy: "Thomas Young (1801) and James Clerk Maxwell (1855–61)",
  },
  "3-2": {
    concept: "Additive colour mixing",
    statement: "Green and blue light landing together read as cyan — no pigment is involved.",
    discoveredBy: "James Clerk Maxwell (1855–61)",
  },
  "3-3": {
    concept: "Spectral order",
    statement:
      "Shorter wavelengths refract more, so violet always bends further than red through the same glass.",
    discoveredBy: "Isaac Newton (1660s)",
  },
  "4-1": {
    concept: "Total internal reflection",
    statement:
      "Beyond the critical angle, light meeting a less dense medium is reflected entirely — none of it escapes.",
    discoveredBy: "Demonstrated in guided water jets by Daniel Colladon (1842)",
  },
  "4-2": {
    concept: "Recombination",
    statement:
      "The colours split out of white light can be brought back together, and they reconstitute white.",
    discoveredBy: "Isaac Newton's second prism experiment (1660s)",
  },
  "4-3": {
    concept: "Colour channels as logic",
    statement:
      "Additive light behaves like an OR over red, green and blue: a channel is present if any beam supplies it.",
  },
  "5-1": {
    concept: "Optical reciprocity",
    statement:
      "Light paths run both ways. A device that splits one beam into several will combine those beams if you send them back along the same routes.",
    discoveredBy: "Hermann von Helmholtz (1856)",
  },
};

export const getLesson = (levelId: string): Lesson | undefined => LESSONS[levelId];
