import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { AchievementsPanel } from "@/components/game/AchievementsPanel";
import { loadUnlocked } from "@/game/achievements";
import { CHAPTERS, LEVELS } from "@/game/levels";
import { loadProgress } from "@/game/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/play/")({
  head: () => ({
    meta: [
      { title: "Choose a Puzzle — Prism" },
      {
        name: "description",
        content:
          "Twelve hand-built light puzzles across four chapters: Reflection, Refraction, Chromatics and Cathedral.",
      },
      { property: "og:title", content: "Choose a Puzzle — Prism" },
      {
        property: "og:description",
        content: "Twelve hand-built light puzzles across four chapters.",
      },
    ],
  }),
  component: LevelSelect,
});

function LevelSelect() {
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [unlocked, setUnlocked] = useState<string[]>([]);
  useEffect(() => {
    setProgress(loadProgress());
    setUnlocked(loadUnlocked());
  }, []);

  return (
    <main className="min-h-dvh aurora px-6 py-14">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Link>
        <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">Puzzles</h1>
        <p className="mt-2 text-muted-foreground">
          Solved {Object.keys(progress).length} of {LEVELS.length}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/intelligence"
            className="inline-flex min-h-11 items-center rounded-full border border-primary/50 bg-primary/12 px-5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/20"
          >
            Light Intelligence Lab
          </Link>
          <Link
            to="/lab"
            className="inline-flex min-h-11 items-center rounded-full border border-accent/40 bg-accent/10 px-5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/20"
          >
            Light Laboratory
          </Link>
          <Link
            to="/studio"
            className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface/60 px-5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-2"
          >
            Prism Studio
          </Link>
        </div>

        <AchievementsPanel unlocked={unlocked} className="mt-8" />

        <div className="mt-10 space-y-10">
          {CHAPTERS.map((chapter) => (
            <section key={chapter.n}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl font-bold">
                    {chapter.n}. {chapter.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{chapter.blurb}</p>
                </div>
              </div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {LEVELS.filter((l) => l.chapter === chapter.n).map((level, i) => {
                  const best = progress[level.id];
                  return (
                    <motion.li
                      key={level.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.04 * i,
                        type: "spring",
                        stiffness: 320,
                        damping: 28,
                      }}
                    >
                      <Link
                        to="/play/$levelId"
                        params={{ levelId: level.id }}
                        className={cn(
                          "group block rounded-2xl border bg-surface/60 p-4 backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:bg-surface-2 active:scale-[0.98]",
                          best !== undefined
                            ? "border-primary/40 hover:border-primary"
                            : "border-border hover:border-primary/50",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display font-semibold">{level.name}</span>
                          {best !== undefined ? (
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 transition-transform duration-200 group-hover:scale-110">
                              <Check className="h-3.5 w-3.5 text-primary" aria-label="Solved" />
                            </span>
                          ) : (
                            <Lock
                              className="h-4 w-4 shrink-0 text-muted-foreground opacity-40"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Par {level.par}
                          {best !== undefined ? ` · your best ${best}` : ""}
                        </p>
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
