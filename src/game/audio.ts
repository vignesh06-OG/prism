/**
 * Adaptive procedural audio. There are no audio files: a small Web Audio graph
 * plays an evolving pad whose harmony follows the state of the light, while
 * reflections, splits, colour mixes and target hits fire short synthesised
 * voices. It is created lazily on first user gesture so it never blocks SSR or
 * violates autoplay policy.
 */

const SCALE = [0, 3, 5, 7, 10, 12, 15]; // minor pentatonic-ish, always consonant
const BASE = 174.61; // F3

export type Voice = "reflect" | "split" | "mix" | "target" | "solve" | "place";

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  padGain: GainNode;
  filter: BiquadFilterNode;
  oscs: OscillatorNode[];
}

let engine: Engine | null = null;
let enabled = false;

function build(): Engine | null {
  if (typeof window === "undefined") return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 700;
  filter.Q.value = 0.6;
  filter.connect(master);

  const padGain = ctx.createGain();
  padGain.gain.value = 0.18;
  padGain.connect(filter);

  // Three detuned drones form the harmonic bed.
  const oscs = [0, 7, 12].map((semi, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? "sine" : "triangle";
    o.frequency.value = BASE * 2 ** (semi / 12);
    o.detune.value = i * 4;
    const g = ctx.createGain();
    g.gain.value = i === 0 ? 0.5 : 0.22;
    o.connect(g).connect(padGain);
    o.start();
    return o;
  });

  return { ctx, master, padGain, filter, oscs };
}

export function audioEnabled() {
  return enabled;
}

export async function setAudioEnabled(on: boolean) {
  enabled = on;
  if (on) {
    engine ??= build();
    if (!engine) return;
    if (engine.ctx.state === "suspended") await engine.ctx.resume();
    engine.master.gain.cancelScheduledValues(engine.ctx.currentTime);
    engine.master.gain.exponentialRampToValueAtTime(0.28, engine.ctx.currentTime + 1.2);
  } else if (engine) {
    engine.master.gain.cancelScheduledValues(engine.ctx.currentTime);
    engine.master.gain.exponentialRampToValueAtTime(0.0001, engine.ctx.currentTime + 0.4);
  }
}

/**
 * Feeds live simulation telemetry into the music bed: more beams open the
 * filter, more colour mixing brightens the harmony, solving lifts everything.
 */
export function updateAmbience(state: {
  beams: number;
  splits: number;
  mixes: number;
  lit: number;
  targets: number;
  solved: boolean;
}) {
  if (!engine || !enabled) return;
  const { ctx, filter, padGain, oscs } = engine;
  const t = ctx.currentTime;
  const density = Math.min(1, state.beams / 24);
  const progress = state.targets ? state.lit / state.targets : 0;

  filter.frequency.cancelScheduledValues(t);
  filter.frequency.linearRampToValueAtTime(
    500 + density * 1800 + progress * 1400 + (state.solved ? 1600 : 0),
    t + 0.6,
  );
  padGain.gain.linearRampToValueAtTime(0.14 + progress * 0.12, t + 0.6);

  // The top drone climbs the scale as colours mix — harmony tracks the light.
  const top = oscs[2];
  if (top) {
    const step = SCALE[Math.min(SCALE.length - 1, state.mixes + (state.solved ? 2 : 0))] ?? 12;
    top.frequency.linearRampToValueAtTime(BASE * 2 ** (step / 12) * 2, t + 0.8);
  }
}

const VOICES: Record<Voice, { freq: number; type: OscillatorType; dur: number; gain: number }> = {
  reflect: { freq: 880, type: "triangle", dur: 0.12, gain: 0.14 },
  split: { freq: 1174, type: "square", dur: 0.1, gain: 0.08 },
  mix: { freq: 1318, type: "sine", dur: 0.22, gain: 0.14 },
  target: { freq: 1567, type: "sine", dur: 0.5, gain: 0.2 },
  solve: { freq: 2093, type: "sine", dur: 1.1, gain: 0.24 },
  place: { freq: 523, type: "triangle", dur: 0.1, gain: 0.12 },
};

/** Fires a short synthesised note for a gameplay event. */
export function playVoice(voice: Voice, detune = 0) {
  if (!engine || !enabled) return;
  const { ctx, filter } = engine;
  const spec = VOICES[voice];
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = spec.type;
  o.frequency.value = spec.freq;
  o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(spec.gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + spec.dur);
  o.connect(g).connect(filter);
  o.start(t);
  o.stop(t + spec.dur + 0.05);
}

export function disposeAudio() {
  if (!engine) return;
  for (const o of engine.oscs) {
    try {
      o.stop();
    } catch {
      /* already stopped */
    }
  }
  void engine.ctx.close();
  engine = null;
  enabled = false;
}
