/**
 * The Living Rulebook — "Light Laws".
 *
 * Prism never states its rules up front. A law only appears in the rulebook
 * once the *simulation itself* has produced the phenomenon that proves it, as
 * reported by the deterministic event log in `discoveries.detect()`. Nothing
 * unlocks from "you finished level 3": the player has to have caused the thing.
 *
 * Each law is therefore a claim the player can already verify from something
 * they watched happen on their own board.
 */
import { loadDiscovered } from "./discoveries";

export interface LightLaw {
  id: string;
  /** Roman-numeral ordering used in the rulebook UI. */
  numeral: string;
  name: string;
  /** The law, in one sentence the player could have written themselves. */
  statement: string;
  /** What the engine had to actually do before this law is granted. */
  provenBy: string;
  /** Discovery ids — any one of these proves the law. */
  requires: string[];
}

export const LIGHT_LAWS: LightLaw[] = [
  {
    id: "propagation",
    numeral: "I",
    name: "Propagation",
    statement: "Light travels in a straight line until something changes its path.",
    provenBy: "a beam crossed the board and ended somewhere",
    requires: ["propagation"],
  },
  {
    id: "reflection",
    numeral: "II",
    name: "Reflection",
    statement: "A mirror redirects a beam — predictably, and the same way every time.",
    provenBy: "your beam bounced off a mirror",
    requires: ["reflection", "chain"],
  },
  {
    id: "splitting",
    numeral: "III",
    name: "Division",
    statement: "One path can become several without becoming something new.",
    provenBy: "a splitter or prism divided your beam",
    requires: ["split", "dispersion"],
  },
  {
    id: "colour",
    numeral: "IV",
    name: "Channels",
    statement: "Different channels can occupy the same system at the same time.",
    provenBy: "two channels shared one board",
    requires: ["mixing", "white"],
  },
  {
    id: "filtering",
    numeral: "V",
    name: "Subtraction",
    statement: "A filter can remove a channel without removing the path.",
    provenBy: "light passed a filter and came out changed",
    requires: ["filter", "absorb"],
  },
  {
    id: "superposition",
    numeral: "VI",
    name: "Superposition",
    statement: "Several channels can satisfy one target together that none could satisfy alone.",
    provenBy: "a target accepted a colour built from two arriving beams",
    requires: ["superposition"],
  },
  {
    id: "reciprocity",
    numeral: "VII",
    name: "Reciprocity",
    statement: "A rule you were taught in one direction may also work in the other.",
    provenBy: "a dividing piece was run backwards and merged channels instead",
    requires: ["reciprocity"],
  },
];

export const LAW_COUNT = LIGHT_LAWS.length;

export interface LawState extends LightLaw {
  known: boolean;
}

/** Resolves the rulebook against whatever the player has genuinely caused. */
export function readLaws(discovered: string[] = loadDiscovered()): LawState[] {
  const set = new Set(discovered);
  return LIGHT_LAWS.map((law) => ({
    ...law,
    known: law.requires.some((r) => set.has(r)),
  }));
}

export const knownLawCount = (discovered?: string[]) =>
  readLaws(discovered).filter((l) => l.known).length;
