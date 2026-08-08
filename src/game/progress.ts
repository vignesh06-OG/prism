/**
 * Local persistence for solves and accessibility preferences.
 *
 * Everything read back from localStorage is treated as untrusted input: it is
 * user-writable, survives across sessions and is trivially editable from the
 * console. Each value is parsed defensively (own-property reads only, no
 * prototype keys, type + range checks, bounded size) so a tampered store can
 * never inject unexpected shapes into React state or crash a render.
 */

const KEY = "prism.progress.v1";
const PREFS = "prism.prefs.v1";

/** levelId -> best move count */
export type Progress = Record<string, number>;

const MAX_ENTRIES = 500;
const MAX_MOVES = 9999;
const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);
const LEVEL_ID = /^[0-9]{1,2}-[0-9]{1,2}$/;

function safeParse(raw: string | null): unknown {
  if (!raw || raw.length > 20_000) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function loadProgress(): Progress {
  if (typeof window === "undefined") return {};
  const parsed = safeParse(window.localStorage.getItem(KEY));
  if (!isPlainObject(parsed)) return {};

  const clean: Progress = {};
  let count = 0;
  for (const id of Object.keys(parsed)) {
    if (count >= MAX_ENTRIES) break;
    if (FORBIDDEN.has(id) || !LEVEL_ID.test(id)) continue;
    const moves = parsed[id];
    if (typeof moves !== "number" || !Number.isFinite(moves)) continue;
    const rounded = Math.round(moves);
    if (rounded < 0 || rounded > MAX_MOVES) continue;
    clean[id] = rounded;
    count++;
  }
  return clean;
}

export function recordSolve(levelId: string, moves: number): Progress {
  const progress = loadProgress();
  if (!LEVEL_ID.test(levelId)) return progress;
  const value = Math.min(MAX_MOVES, Math.max(0, Math.round(moves)));
  const best = progress[levelId];
  if (best === undefined || value < best) progress[levelId] = value;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* storage unavailable or full — progress is a nicety, never a blocker */
  }
  return progress;
}

export interface Prefs {
  colorblind: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
}

const DEFAULT_PREFS: Prefs = {
  colorblind: false,
  reduceMotion: false,
  highContrast: false,
};

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  const parsed = safeParse(window.localStorage.getItem(PREFS));
  if (!isPlainObject(parsed)) return { ...DEFAULT_PREFS };
  return {
    colorblind: parsed["colorblind"] === true,
    reduceMotion: parsed["reduceMotion"] === true,
    highContrast: parsed["highContrast"] === true,
  };
}

export function savePrefs(prefs: Prefs) {
  try {
    window.localStorage.setItem(
      PREFS,
      JSON.stringify({
        colorblind: prefs.colorblind === true,
        reduceMotion: prefs.reduceMotion === true,
        highContrast: prefs.highContrast === true,
      }),
    );
  } catch {
    /* storage unavailable */
  }
}

