/**
 * Light Streak + Field Mission records.
 *
 * Same defensive posture as `progress.ts`: localStorage is user-writable, so
 * everything read back is validated by shape, type and range before it can
 * reach React state. A broken streak is never punished — the discoveries that
 * earned it stay.
 */

const STREAK_KEY = "prism.streak.v1";
const MISSION_KEY = "prism.missions.v1";
const INTEREST_KEY = "prism.interests.v1";

export const MILESTONES = [3, 7, 14, 30, 50, 100] as const;

export interface Streak {
  current: number;
  best: number;
  /** ISO yyyy-mm-dd of the last active local day. */
  lastDay: string | null;
}

const EMPTY: Streak = { current: 0, best: 0, lastDay: null };
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const parse = (raw: string | null): unknown => {
  if (!raw || raw.length > 20_000) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const num = (v: unknown, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0;

/** Local calendar day, so a streak matches the player's own sense of "today". */
export function today(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const dayBefore = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() - 1);
  return today(dt);
};

export function loadStreak(): Streak {
  if (typeof window === "undefined") return { ...EMPTY };
  const p = parse(window.localStorage.getItem(STREAK_KEY));
  if (!isObj(p)) return { ...EMPTY };
  const lastDay = typeof p["lastDay"] === "string" && DAY.test(p["lastDay"]) ? p["lastDay"] : null;
  return { current: num(p["current"], 9999), best: num(p["best"], 9999), lastDay };
}

/** Call once per meaningful solve. Idempotent within a day. */
export function touchStreak(): Streak {
  const s = loadStreak();
  const now = today();
  if (s.lastDay === now) return s;
  const next: Streak = {
    current: s.lastDay && dayBefore(now) === s.lastDay ? s.current + 1 : 1,
    best: 0,
    lastDay: now,
  };
  next.best = Math.max(s.best, next.current);
  try {
    window.localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — a streak is a nicety, never a blocker */
  }
  return next;
}

/** True when the last active day is older than yesterday: the light went dark. */
export function streakBroken(s: Streak): boolean {
  if (!s.lastDay || s.current === 0) return false;
  const now = today();
  return s.lastDay !== now && s.lastDay !== dayBefore(now);
}

export const nextMilestone = (current: number) =>
  MILESTONES.find((m) => m > current) ?? MILESTONES[MILESTONES.length - 1]!;

/* ---------------------------- mission records --------------------------- */

export interface MissionRecord {
  score: number;
  hintsUsed: number;
  formulaFound: boolean;
}

export type MissionRecords = Record<string, MissionRecord>;

const MISSION_ID = /^[a-z0-9-]{1,32}$/;

export function loadMissions(): MissionRecords {
  if (typeof window === "undefined") return {};
  const p = parse(window.localStorage.getItem(MISSION_KEY));
  if (!isObj(p)) return {};
  const out: MissionRecords = {};
  let n = 0;
  for (const id of Object.keys(p)) {
    if (n++ > 100 || !MISSION_ID.test(id)) continue;
    const r = p[id];
    if (!isObj(r)) continue;
    out[id] = {
      score: num(r["score"], 200),
      hintsUsed: num(r["hintsUsed"], 5),
      formulaFound: r["formulaFound"] === true,
    };
  }
  return out;
}

export function recordMission(id: string, rec: MissionRecord): MissionRecords {
  const all = loadMissions();
  if (!MISSION_ID.test(id)) return all;
  const prev = all[id];
  all[id] =
    prev && prev.score >= rec.score
      ? { ...prev, formulaFound: prev.formulaFound || rec.formulaFound }
      : rec;
  try {
    window.localStorage.setItem(MISSION_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  return all;
}

/* ------------------------------- interests ------------------------------ */

export const INTERESTS = ["SCIENCE", "REAL WORLD", "ANIMALS"] as const;
export type Interest = (typeof INTERESTS)[number];

export function loadInterests(): Interest[] {
  if (typeof window === "undefined") return [];
  const p = parse(window.localStorage.getItem(INTEREST_KEY));
  if (!Array.isArray(p)) return [];
  return p.filter((v): v is Interest => INTERESTS.includes(v as Interest)).slice(0, 3);
}

export function saveInterests(list: Interest[]) {
  try {
    window.localStorage.setItem(INTEREST_KEY, JSON.stringify(list.slice(0, 3)));
  } catch {
    /* ignore */
  }
}
