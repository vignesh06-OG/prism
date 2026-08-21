/**
 * The Discovery layer.
 *
 * Prism never front-loads optics theory. Instead the engine watches what the
 * player *actually caused to happen* in the simulation and, the first time a
 * real optical phenomenon shows up in the trace, unlocks a card explaining the
 * thing they just did. Discovery precedes explanation — always.
 *
 * Detection reads only the deterministic event log produced by `trace()`, so a
 * card can never fire for something the simulation did not really model.
 */
import type { Board, ColorMask, TraceResult } from "./types";

export type Depth = "beginner" | "curious" | "explorer";

export interface Discovery {
  id: string;
  /** What the player saw happen, in their words. */
  title: string;
  /** Three depths of the same truth — the game adapts to curiosity, not age. */
  beginner: string;
  curious: string;
  explorer: string;
  /** A concrete experiment to run next. */
  tryThis: string;
  /** Where this shows up outside the game. */
  realWorld: string;
}

export const DISCOVERIES: Discovery[] = [
  {
    id: "reflection",
    title: "Light bounces at a predictable angle",
    beginner: "A mirror sends light off in a new direction — and it always turns the same way.",
    curious:
      "The beam leaves at the same angle it arrived, measured from the mirror's surface. Turn the mirror a quarter turn and the exit direction flips.",
    explorer:
      "This is the law of reflection: the angle of incidence equals the angle of reflection, about the surface normal. Prism's grid samples that law at 45°, which is why every bounce is a clean 90° turn.",
    tryThis: "Chain two mirrors and see if you can send a beam back the way it came.",
    realWorld: "Periscopes, laser scanners in supermarket checkouts, and reflector telescopes.",
  },
  {
    id: "mixing",
    title: "Two colours of light made a third",
    beginner: "When two coloured beams land on the same target, they add up into a new colour.",
    curious:
      "Red + green reads as yellow, red + blue as magenta, green + blue as cyan. Light adds; it does not blend like paint.",
    explorer:
      "Additive colour mixing: your retina has three cone types, and overlapping wavelengths stimulate combinations of them. 'Yellow' here contains no yellow wavelength at all — your visual system infers it.",
    tryThis: "Light one target with three beams at once and watch what colour it demands.",
    realWorld: "Every phone, laptop and TV screen builds all its colour from red, green and blue.",
  },
  {
    id: "white",
    title: "All three colours together make white",
    beginner: "Red, green and blue arriving together produce white light.",
    curious:
      "White is not a colour of its own here — it is the sum of the full set. Remove any one component and the white collapses back to a mix.",
    explorer:
      "A roughly flat spectral power distribution across the visible band is perceived as achromatic. Prism models this as a bitmask union of R, G and B channels.",
    tryThis: "Break a white beam apart with a prism, then rebuild it from the pieces.",
    realWorld: "White LEDs, studio lighting, and the calibration of camera white balance.",
  },
  {
    id: "split",
    title: "One beam became two",
    beginner: "A splitter sends part of the light one way and part of it another.",
    curious:
      "The colour is preserved on both outputs, but the energy is shared — each branch carries less intensity than the original beam.",
    explorer:
      "A beam splitter partially transmits and partially reflects at a coated interface. Prism tracks the intensity split so long branches eventually fall below the visibility floor.",
    tryThis: "Feed both halves of a split into two different targets at once.",
    realWorld: "Interferometers, fibre-optic network taps, and the beam paths inside DSLR cameras.",
  },
  {
    id: "dispersion",
    title: "A prism pulled a colour apart",
    beginner: "White light entered the prism and came out as separate colours.",
    curious:
      "The prism sorts light by its components and sends each one along its own path — that is why a single input produced several coloured outputs.",
    explorer:
      "Dispersion: refractive index varies with wavelength, so each wavelength bends by a different amount. Newton's 1666 experiment used exactly this to prove white light is composite.",
    tryThis: "Disperse a white beam and then recombine two of the outputs on one target.",
    realWorld: "Rainbows, spectrometers, and the spectral analysis astronomers use to read stars.",
  },
  {
    id: "filter",
    title: "A filter removed part of the light",
    beginner: "The beam kept going, but came out a different colour — something was taken away.",
    curious:
      "Filters are subtractive: they let their own colour through and absorb everything else. A red filter on white light leaves red.",
    explorer:
      "Absorptive filters have a wavelength-dependent transmission curve. Nothing is converted — the blocked energy becomes heat in the filter substrate.",
    tryThis: "Put two different filters in a row and predict what survives.",
    realWorld: "Photography filters, fluorescence microscopes, and stage lighting gels.",
  },
  {
    id: "absorb",
    title: "The light simply stopped",
    beginner: "A beam ran into something that swallowed it completely.",
    curious:
      "If a filter has no component in common with the beam, nothing at all gets through. The path ends there.",
    explorer:
      "Complete absorption: the material's absorption band covers the incoming spectrum, so transmitted intensity approaches zero. In the engine this is a bitmask intersection of zero.",
    tryThis: "Send a pure blue beam into a red filter and watch the path terminate.",
    realWorld: "Optical isolators, camera lens coatings, and blackout materials in telescopes.",
  },
  {
    id: "scatter",
    title: "Fog spread the beam out",
    beginner: "The light became softer and wider instead of staying a sharp line.",
    curious:
      "Scattering redirects light in many directions at once, so the beam loses definition and strength as it crosses the medium.",
    explorer:
      "Mie and Rayleigh scattering by suspended particles. Rayleigh's wavelength⁻⁴ dependence is why the sky is blue and why sunsets shift red.",
    tryThis: "Route a beam through fog and check the intensity readout in the inspector.",
    realWorld: "Weather LIDAR, fog lamps, and medical imaging through scattering tissue.",
  },
  {
    id: "attenuation",
    title: "Long paths lose energy",
    beginner: "The further the light travelled, the dimmer it got.",
    curious:
      "Every bounce and every material crossing costs a little energy. A short route delivers a brighter beam than a scenic one.",
    explorer:
      "Beer–Lambert attenuation: intensity decays exponentially with path length through an absorbing medium, plus a per-reflection loss at each non-ideal mirror.",
    tryThis: "Solve the same puzzle twice — once the long way, once the short way — and compare.",
    realWorld: "Why undersea fibre-optic cables need repeaters every few tens of kilometres.",
  },
  {
    id: "chain",
    title: "You built a five-bounce route",
    beginner: "Light can be steered a very long way if every turn is set up correctly.",
    curious:
      "Each mirror only decides one turn, but the chain of turns is what carries light to somewhere it could never reach directly.",
    explorer:
      "Guided propagation by repeated reflection — the same principle that keeps light inside a fibre core by total internal reflection at every wall interaction.",
    tryThis: "See how many bounces you can make before the beam fades out.",
    realWorld: "Fibre optics, light pipes in car headlights, and endoscopes.",
  },
  {
    id: "propagation",
    title: "Light keeps going until something stops it",
    beginner: "A beam travels in a straight line until a piece changes its path.",
    curious:
      "Nothing in the engine curves a beam. Every direction change you see is a piece deciding it — which means every path is something you can predict.",
    explorer:
      "Rectilinear propagation in a homogeneous medium: with no index gradient, the ray equation reduces to a straight line, and all path changes come from discrete interfaces.",
    tryThis: "Clear a lane and watch how far one beam runs untouched.",
    realWorld: "Shadows, laser alignment rigs, and surveying with a sight line.",
  },
  {
    id: "superposition",
    title: "Two beams satisfied one target together",
    beginner: "A target lit up from two beams arriving at once — neither was enough alone.",
    curious:
      "The target checks the total set of channels it receives. Two separate deliveries can add up to exactly what it demands.",
    explorer:
      "Linear superposition: fields add independently, so the delivered channel set is the union of the incident sets. Prism models this as a bitwise OR at the receiving cell.",
    tryThis: "Take away one of the two beams and watch the target reject the remainder.",
    realWorld: "Stage lighting mixes, projector colour channels, and interference experiments.",
  },
  {
    id: "reciprocity",
    title: "You ran a splitting piece backwards",
    beginner: "A piece that normally divides light instead merged several beams into one.",
    curious:
      "Nothing about the piece changed — you changed which side the light entered from. The rule reads the same in both directions.",
    explorer:
      "Optical reciprocity (Helmholtz): the transmission between two points is unchanged when source and detector are exchanged, so a divider is also a combiner.",
    tryThis: "Drive three channels into one edge and see what single path leaves.",
    realWorld: "Fibre couplers, antenna reciprocity, and combiner optics in projectors.",
  },
];


export const DISCOVERY_BY_ID = new Map(DISCOVERIES.map((d) => [d.id, d]));

const bits = (m: ColorMask) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1);

/**
 * Returns the ids of every phenomenon actually present in this trace. Pure and
 * deterministic: same board, same discoveries.
 */
export function detect(result: TraceResult, board: Board): string[] {
  const found = new Set<string>();
  let reflects = 0;

  for (const e of result.events) {
    switch (e.kind) {
      case "reflect":
        reflects++;
        found.add("reflection");
        break;
      case "split":
        found.add("split");
        break;
      case "disperse":
        found.add("dispersion");
        break;
      case "filter":
        found.add("filter");
        break;
      case "absorb":
        found.add("absorb");
        break;
      case "scatter":
        found.add("scatter");
        break;
      case "attenuate":
        found.add("attenuation");
        break;
      default:
        break;
    }
  }
  if (reflects >= 5) found.add("chain");

  // Law I: something actually travelled. Cheapest possible proof, but it is
  // still a proof — read off the trace, not off the level definition.
  if (result.segments.length > 0) found.add("propagation");

  // Colour discoveries are read off delivered light, not off pieces, so they
  // only fire once the player has genuinely combined beams.
  for (const [k, piece] of Object.entries(board.cells)) {
    if (piece.kind !== "target") continue;
    const got = result.hits[k] ?? 0;
    const [tx, ty] = k.split(",").map(Number);
    // Real mixing means two beams of *different* colour arriving here — not one
    // white beam that already carried three components from the emitter.
    const incoming = result.segments.filter(
      (s) => (s.x2 === tx && s.y2 === ty) || (s.x1 === tx && s.y1 === ty),
    );
    const hues = new Set(incoming.map((s) => s.color));
    const combined = hues.size > 1;
    if (bits(got) > 1 && combined) found.add("mixing");
    if (got === 7 && combined) found.add("white");
    // Law VI: the target is *satisfied*, and no single arriving beam could have
    // done it alone. That is superposition, not merely mixing.
    if (
      got === (piece.color ?? 7) &&
      bits(got) > 1 &&
      incoming.length > 1 &&
      incoming.every((s) => bits(s.color) < bits(got))
    ) {
      found.add("superposition");
    }
  }
  for (const s of result.segments) {
    if (bits(s.color) > 1 && (s.meta?.sources.length ?? 1) > 1) found.add("mixing");
    if (s.color === 7 && (s.meta?.sources.length ?? 1) > 1) found.add("white");
  }

  // Law VII: a dividing piece used in reverse. Proof is a splitter or prism
  // where several narrower channels arrive and one wider channel leaves.
  for (const [k, piece] of Object.entries(board.cells)) {
    if (piece.kind !== "splitter" && piece.kind !== "prism") continue;
    const [cx, cy] = k.split(",").map(Number);
    const touching = result.segments.filter(
      (s) => (s.x1 === cx && s.y1 === cy) || (s.x2 === cx && s.y2 === cy),
    );
    if (touching.length < 3) continue;
    const widest = Math.max(...touching.map((s) => bits(s.color)));
    const narrow = touching.filter((s) => bits(s.color) < widest);
    const narrowUnion = narrow.reduce((m, s) => m | s.color, 0);
    if (widest > 1 && narrow.length >= 2 && bits(narrowUnion) >= widest) {
      found.add("reciprocity");
    }
  }

  return [...found];
}


/* ------------------------------------------------------------------ */
/* Persistence — untrusted localStorage, parsed defensively.            */
/* ------------------------------------------------------------------ */

const KEY = "prism.discoveries.v1";
const DEPTH_KEY = "prism.depth.v1";
const VALID = new Set(DISCOVERIES.map((d) => d.id));

export function loadDiscovered(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw || raw.length > 4_000) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && VALID.has(v)).slice(0, 64);
  } catch {
    return [];
  }
}

/** Adds ids and returns only the ones that are genuinely new. */
export function recordDiscoveries(ids: string[]): string[] {
  if (typeof window === "undefined") return [];
  const known = new Set(loadDiscovered());
  const fresh = ids.filter((id) => VALID.has(id) && !known.has(id));
  if (!fresh.length) return [];
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...known, ...fresh]));
  } catch {
    /* storage full — discovery is a nicety, never a blocker */
  }
  return fresh;
}

export function loadDepth(): Depth {
  if (typeof window === "undefined") return "beginner";
  const raw = window.localStorage.getItem(DEPTH_KEY);
  return raw === "curious" || raw === "explorer" ? raw : "beginner";
}

export function saveDepth(depth: Depth) {
  try {
    window.localStorage.setItem(DEPTH_KEY, depth);
  } catch {
    /* ignore */
  }
}

export const depthText = (d: Discovery, depth: Depth) =>
  depth === "explorer" ? d.explorer : depth === "curious" ? d.curious : d.beginner;
