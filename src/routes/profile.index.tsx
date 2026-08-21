import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Etch, RailSection } from "@/components/chrome/instrument";
import { LEVELS } from "@/game/levels";
import { loadProgress } from "@/game/progress";
import { readLaws } from "@/game/lightlaws";
import { loadDiscovered } from "@/game/discoveries";
import { MISSIONS } from "@/game/missions";
import {
  loadMissions,
  loadStreak,
  nextMilestone,
  streakBroken,
  type MissionRecords,
  type Streak,
} from "@/game/streak";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile/")({
  head: () => ({
    meta: [
      { title: "My Light — Prism" },
      {
        name: "description",
        content:
          "Your Prism record: light laws discovered, puzzles solved, field missions completed and your current Light Streak.",
      },
      { property: "og:title", content: "My Light — Prism" },
      {
        property: "og:description",
        content: "Light laws discovered, puzzles solved and your current Light Streak.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

/** A photon ring that closes as the streak approaches its next milestone. */
function StreakRing({ current, target }: { current: number; target: number }) {
  const frac = Math.max(0, Math.min(1, target ? current / target : 0));
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32" role="img" aria-label={`Light streak ${current} days`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="2" className="text-white/10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`}
        transform="rotate(-90 60 60)"
        style={{ filter: "drop-shadow(0 0 6px var(--primary))" }}
      />
      <text x="60" y="58" textAnchor="middle" className="fill-foreground font-display" fontSize="26" fontWeight="800">
        {current}
      </text>
      <text x="60" y="74" textAnchor="middle" className="fill-current text-muted-foreground" fontSize="9" letterSpacing="2">
        DAYS
      </text>
    </svg>
  );
}

function Profile() {
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [missions, setMissions] = useState<MissionRecords>({});
  const [streak, setStreak] = useState<Streak>({ current: 0, best: 0, lastDay: null });
  const [discovered, setDiscovered] = useState<string[]>([]);

  useEffect(() => {
    setProgress(loadProgress());
    setMissions(loadMissions());
    setStreak(loadStreak());
    setDiscovered(loadDiscovered());
  }, []);

  const laws = readLaws(discovered);
  const known = laws.filter((l) => l.known).length;
  const solved = Object.keys(progress).length;
  const atPar = LEVELS.filter((l) => progress[l.id] !== undefined && progress[l.id]! <= l.par).length;
  const broken = streakBroken(streak);
  const shownStreak = broken ? 0 : streak.current;

  return (
    <main className="chamber grain relative min-h-dvh px-6 py-10 sm:py-14">
      <div className="relative z-10 mx-auto max-w-3xl">
        <Link
          to="/play"
          className="inline-flex min-h-11 items-center gap-2 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Campaign index
        </Link>

        <header className="mt-4">
          <Etch>Player record</Etch>
          <h1 className="mt-2 font-display text-4xl leading-none font-extrabold tracking-[-0.03em] sm:text-5xl">
            My Light
          </h1>
        </header>

        <section className="bench-top mt-8 flex flex-wrap items-center gap-6 pt-6">
          <StreakRing current={shownStreak} target={nextMilestone(shownStreak)} />
          <div className="min-w-0 flex-1">
            <Etch tone="primary">Light streak</Etch>
            {broken ? (
              <div className="mt-1.5 text-sm">
                <p className="font-display font-bold">The light went dark.</p>
                <p className="text-muted-foreground">
                  Your discoveries remain. Solve one puzzle to restart the beam.
                </p>
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">
                {shownStreak === 0
                  ? "Solve anything today to start the beam."
                  : `${nextMilestone(shownStreak) - shownStreak} more day${
                      nextMilestone(shownStreak) - shownStreak === 1 ? "" : "s"
                    } to the ${nextMilestone(shownStreak)}-day ring.`}
              </p>
            )}
            <p className="mt-2 font-display text-xs tabular-nums text-muted-foreground">
              Best streak {streak.best} day{streak.best === 1 ? "" : "s"}
            </p>
          </div>
        </section>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <RailSection label="Light laws discovered" meta={`${known}/${laws.length}`}>
            <ul className="space-y-1.5">
              {laws.map((l) => (
                <li key={l.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={cn(l.known ? "text-foreground" : "text-muted-foreground")}>
                    {l.name}
                  </span>
                  <span className={cn("font-display text-xs", l.known ? "text-primary" : "text-muted-foreground")}>
                    {l.known ? "✓" : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </RailSection>

          <div className="space-y-6">
            <RailSection label="Campaign" meta={`${solved}/${LEVELS.length}`}>
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[0.625rem] tracking-[0.18em] text-muted-foreground uppercase">
                    Solved
                  </dt>
                  <dd className="font-display text-2xl font-extrabold tabular-nums">{solved}</dd>
                </div>
                <div>
                  <dt className="text-[0.625rem] tracking-[0.18em] text-muted-foreground uppercase">
                    At par or better
                  </dt>
                  <dd className="font-display text-2xl font-extrabold tabular-nums text-primary">
                    {atPar}
                  </dd>
                </div>
              </dl>
            </RailSection>

            <RailSection
              label="Field missions"
              meta={`${Object.keys(missions).length}/${MISSIONS.length}`}
            >
              <ul className="space-y-1.5">
                {MISSIONS.map((m) => (
                  <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <Link
                      to="/missions/$missionId"
                      params={{ missionId: m.id }}
                      className="truncate hover:text-primary"
                    >
                      {m.title}
                    </Link>
                    <span className="font-display text-xs tabular-nums text-muted-foreground">
                      {missions[m.id] ? `${missions[m.id]!.score}` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </RailSection>
          </div>
        </div>
      </div>
    </main>
  );
}
