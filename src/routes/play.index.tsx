import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { AchievementsPanel } from "@/components/game/AchievementsPanel";
import { Etch, Fibre } from "@/components/chrome/instrument";
import { loadUnlocked } from "@/game/achievements";
import { CHAPTERS, LEVELS } from "@/game/levels";
import { loadProgress } from "@/game/progress";
import { loadDiscovered } from "@/game/discoveries";
import { LightLabComplete } from "@/components/game/LightLabComplete";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/play/")({
  head: () => ({
    meta: [
      { title: "Choose a Puzzle — Prism" },
      {
        name: "description",
        content:
          "Thirteen hand-built light puzzles across four chapters: Reflection, Refraction, Superposition and Optical Systems.",
      },
      { property: "og:title", content: "Choose a Puzzle — Prism" },
      {
        property: "og:description",
        content: "Thirteen hand-built light puzzles across four chapters.",
      },
    ],
  }),
  component: LevelSelect,
});

const TOOLS = [
  { to: "/missions", label: "Field missions" },
  { to: "/profile", label: "My Light" },
  { to: "/discoveries", label: "Discovery journal" },
  { to: "/intelligence", label: "Intelligence Lab" },
  { to: "/lab", label: "Light Laboratory" },
  { to: "/studio", label: "Prism Studio" },
] as const;

/**
 * The puzzle index as an optical bench.
 *
 * Each chapter is a run of the rig: a vertical fibre with a node per puzzle.
 * A solved node is lit, an unsolved one is dark glass. Nothing is a card, so
 * the list reads as apparatus you are walking along rather than a dashboard
 * you are filtering.
 */
function LevelSelect() {
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [discovered, setDiscovered] = useState<string[]>([]);
  useEffect(() => {
    setProgress(loadProgress());
    setUnlocked(loadUnlocked());
    setDiscovered(loadDiscovered());
  }, []);

  const solvedTotal = Object.keys(progress).length;
  const campaignComplete = LEVELS.every((l) => progress[l.id] !== undefined);

  return (
    <main className="chamber grain relative min-h-dvh px-6 py-10 sm:py-14">
      <div className="relative z-10 mx-auto max-w-4xl">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Chamber entrance
        </Link>

        <header className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0">
            <Etch>Campaign index</Etch>
            <h1 className="mt-2 font-display text-4xl leading-none font-extrabold tracking-[-0.03em] sm:text-5xl">
              Puzzles
            </h1>
          </div>
          <p className="shrink-0 font-display text-sm tabular-nums text-muted-foreground">
            <span className="text-2xl leading-none font-extrabold text-foreground">
              {solvedTotal}
            </span>
            <span className="ml-1">/ {LEVELS.length} solved</span>
          </p>
        </header>

        <Fibre value={solvedTotal / LEVELS.length} className="mt-4" />

        {campaignComplete ? (
          <LightLabComplete progress={progress} discovered={discovered} className="mt-8" />
        ) : null}

        <nav aria-label="Prism tools" className="mt-6 flex flex-wrap gap-1.5">
          {TOOLS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="optic-control inline-flex min-h-10 items-center px-4 text-[0.8125rem]"
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <AchievementsPanel unlocked={unlocked} className="mt-8" />

        <div className="mt-12 space-y-11">
          {CHAPTERS.map((chapter) => {
            const levels = LEVELS.filter((l) => l.chapter === chapter.n);
            const done = levels.filter((l) => progress[l.id] !== undefined).length;
            return (
              <section key={chapter.n}>
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-4 border-b border-[var(--hairline)] pb-3">
                  <span className="font-display text-2xl leading-none font-extrabold text-muted-foreground/30 tabular-nums">
                    {String(chapter.n).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg leading-tight font-bold">
                      {chapter.name}
                    </h2>
                    <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      {chapter.blurb}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-display text-[0.6875rem] tabular-nums",
                      done === levels.length ? "text-primary" : "text-muted-foreground/70",
                    )}
                  >
                    {done}/{levels.length}
                  </span>
                </div>

                {/* The chapter run: one fibre, one node per puzzle. */}
                <ul className="relative mt-1 ml-[0.4375rem] border-l border-[var(--hairline)]">
                  {levels.map((level, i) => {
                    const best = progress[level.id];
                    const solved = best !== undefined;
                    return (
                      <motion.li
                        key={level.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.03 * i,
                          type: "spring",
                          stiffness: 320,
                          damping: 28,
                        }}
                      >
                        <Link
                          to="/play/$levelId"
                          params={{ levelId: level.id }}
                          className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--hairline)] py-3.5 pl-6 transition-colors duration-200 hover:bg-primary/[0.04]"
                        >
                          {/* Node on the fibre — lit when the puzzle is solved. */}
                          <span
                            className={cn(
                              "absolute left-0 h-2 w-2 -translate-x-1/2 translate-y-[1.1rem] rounded-full transition-all duration-300",
                              solved
                                ? "bg-primary"
                                : "bg-surface-2 ring-1 ring-[var(--hairline-strong)] group-hover:bg-primary/40",
                            )}
                            style={solved ? { boxShadow: "0 0 10px 1px var(--primary)" } : undefined}
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span className="truncate font-display text-[0.9375rem] font-semibold transition-colors group-hover:text-primary">
                                {level.name}
                              </span>
                              {level.tier ? (
                                <span className="etch shrink-0 text-[0.5rem] text-muted-foreground/60">
                                  {level.tier}
                                </span>
                              ) : null}
                            </span>
                            {level.concept ? (
                              <span className="mt-0.5 block truncate text-[0.75rem] text-muted-foreground">
                                {level.concept}
                              </span>
                            ) : null}
                          </span>

                          <span className="flex shrink-0 items-center gap-3.5 font-display text-[0.6875rem] tabular-nums text-muted-foreground">
                            <span>
                              par {level.par}
                              {solved ? (
                                <span className="text-foreground"> · best {best}</span>
                              ) : null}
                            </span>
                            {solved ? (
                              <Check className="h-3.5 w-3.5 text-primary" aria-label="Solved" />
                            ) : (
                              <Lock
                                className="h-3.5 w-3.5 opacity-30"
                                aria-hidden="true"
                              />
                            )}
                          </span>
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
