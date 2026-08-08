import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { PrefsBar } from "@/components/game/PrefsBar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/experience/")({
  head: () => ({
    meta: [
      { title: "The 90-Second Tour — See Prism at Its Best" },
      {
        name: "description",
        content:
          "A guided route through Prism: solve one puzzle, watch the solver think, audit the generator's rejection pile, and read what the model got wrong.",
      },
      { property: "og:title", content: "The 90-Second Tour — See Prism at Its Best" },
      {
        property: "og:description",
        content:
          "Four stops, ninety seconds: play, discover, inspect the AI, and hold it accountable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExperiencePage,
});

interface Stop {
  seconds: string;
  title: string;
  what: string;
  why: string;
  cta: string;
  to: string;
  params?: Record<string, string>;
}

const STOPS: Stop[] = [
  {
    seconds: "0:00 – 0:25",
    title: "Solve one puzzle without reading anything",
    what: "Place a mirror, watch the beam bend, light the target. Hover any cell first — the dashed ghost beam shows exactly what a move would do before it costs you one.",
    why: "The whole game teaches through consequence. No tutorial text exists anywhere in the campaign.",
    cta: "Play level 1-1",
    to: "/play/$levelId",
    params: { levelId: "1-1" },
  },
  {
    seconds: "0:25 – 0:45",
    title: "Break the physics on purpose",
    what: "In the Light Laboratory, drag attenuation and refractive index while a live beam responds. Campaign physics stay frozen; this bench is yours.",
    why: "The simulation is real optics — energy loss, dispersion, scattering — not a lookup table of pretty lines.",
    cta: "Open the Laboratory",
    to: "/lab",
  },
  {
    seconds: "0:45 – 1:10",
    title: "Watch the solver think, then watch it reject",
    what: "The Intelligence Lab draws the actual breadth-first search tree: every expanded state, every dead branch. Hit Evolve and the rejection pile fills with candidates the pipeline killed and why.",
    why: "Most generated-content demos show you the wins. This one shows you the failures, measured.",
    cta: "Open the Intelligence Lab",
    to: "/intelligence",
  },
  {
    seconds: "1:10 – 1:30",
    title: "Hold the model accountable",
    what: "The calibration ledger compares what the model predicted about your solves against what actually happened — and says 'I don't know' when it has too little evidence to claim anything.",
    why: "An AI feature that can admit uncertainty is worth more than one that always answers.",
    cta: "See the Discovery Journal",
    to: "/discoveries",
  },
];

function ExperiencePage() {
  const [active, setActive] = useState(0);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 pb-24">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Home
          </Link>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight">
            The 90-second <span className="text-glow text-primary">tour</span>
          </h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Short on time? Follow these four stops in order and you will have seen everything Prism
            does that nothing else does.
          </p>
        </div>
        <PrefsBar />
      </header>

      <ol className="space-y-4">
        {STOPS.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-expanded={active === i}
              className={cn(
                "w-full rounded-2xl border p-5 text-left backdrop-blur transition-colors",
                active === i
                  ? "border-primary/50 bg-surface/80"
                  : "border-border bg-surface/40 hover:border-primary/40",
              )}
            >
              <div className="flex items-center gap-2 text-[11px] tracking-widest text-muted-foreground uppercase">
                <Clock className="h-3 w-3 text-primary" aria-hidden="true" />
                {s.seconds}
              </div>
              <h2 className="font-display mt-1 text-lg font-bold">
                {i + 1}. {s.title}
              </h2>
              {active === i && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="overflow-hidden"
                >
                  <p className="mt-2 text-sm text-muted-foreground">{s.what}</p>
                  <p className="mt-2 text-xs text-accent">Why it matters · {s.why}</p>
                </motion.div>
              )}
            </button>
            {active === i && (
              <div className="mt-2 pl-1">
                {s.params ? (
                  <Link
                    to={s.to}
                    params={s.params as never}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/50 bg-primary/15 px-4 text-sm font-medium transition-colors hover:bg-primary/25"
                  >
                    {s.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <Link
                    to={s.to}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/50 bg-primary/15 px-4 text-sm font-medium transition-colors hover:bg-primary/25"
                  >
                    {s.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
