import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock, Sparkles } from "lucide-react";
import { PrefsBar } from "@/components/game/PrefsBar";
import {
  DISCOVERIES,
  depthText,
  loadDepth,
  loadDiscovered,
  saveDepth,
  type Depth,
} from "@/game/discoveries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/discoveries/")({
  head: () => ({
    meta: [
      { title: "Discovery Journal — What You Learned About Light | Prism" },
      {
        name: "description",
        content:
          "Every optical phenomenon you uncovered by experimenting in Prism, explained at three depths with the real-world technology built on it.",
      },
      { property: "og:title", content: "Discovery Journal — What You Learned About Light" },
      {
        property: "og:description",
        content:
          "Reflection, dispersion, additive mixing, total internal reflection and scattering — unlocked by playing, not by reading.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoveriesPage,
});

const DEPTHS: { id: Depth; label: string; blurb: string }[] = [
  { id: "beginner", label: "Plain", blurb: "What happened, in everyday words." },
  { id: "curious", label: "Curious", blurb: "The rule behind it." },
  { id: "explorer", label: "Explorer", blurb: "The physics, named properly." },
];

function DiscoveriesPage() {
  const [depth, setDepth] = useState<Depth>("curious");
  const [found, setFound] = useState<string[]>([]);

  useEffect(() => {
    setDepth(loadDepth());
    setFound(loadDiscovered());
  }, []);

  const foundSet = new Set(found);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 pb-24">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Home
          </Link>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight">
            Discovery <span className="text-glow text-primary">Journal</span>
          </h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Nothing here was taught to you. Each entry unlocked the moment you made the phenomenon
            happen on a board — {foundSet.size} of {DISCOVERIES.length} so far.
          </p>
        </div>
        <PrefsBar />
      </header>

      <div
        className="mb-6 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Explanation depth"
      >
        <span className="font-display text-[11px] tracking-[0.28em] text-muted-foreground uppercase">
          Depth
        </span>
        {DEPTHS.map((d) => (
          <button
            key={d.id}
            type="button"
            aria-pressed={depth === d.id}
            onClick={() => {
              setDepth(d.id);
              saveDepth(d.id);
            }}
            title={d.blurb}
            className={cn(
              "min-h-9 rounded-full border px-3 text-xs transition-all",
              depth === d.id
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {DISCOVERIES.map((d) => {
          const unlocked = foundSet.has(d.id);
          return (
            <li
              key={d.id}
              className={cn(
                "rounded-2xl border p-5 backdrop-blur transition-colors",
                unlocked
                  ? "border-primary/40 bg-surface/70"
                  : "border-border bg-surface/30 text-muted-foreground",
              )}
            >
              <header className="flex items-start gap-2">
                {unlocked ? (
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <h2 className="font-display text-sm font-bold">
                  {unlocked ? d.title : "Undiscovered"}
                </h2>
              </header>
              {unlocked ? (
                <>
                  <p className="mt-2 text-xs">{depthText(d, depth)}</p>
                  <p className="mt-3 text-[11px] text-accent">Try this · {d.tryThis}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    In the world · {d.realWorld}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs">
                  Keep experimenting. This one reveals itself the first time you make it happen.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Nothing to read first.{" "}
        <Link to="/sandbox" className="text-primary underline-offset-4 hover:underline">
          Go break some light
        </Link>
        .
      </p>
    </div>
  );
}
