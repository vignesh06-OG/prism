import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Sparkle } from "lucide-react";
import { CHAPTERS, LEVELS } from "@/game/levels";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prism — A Puzzle Game Made of Light" },
      {
        name: "description",
        content:
          "Bend, split and mix beams of light to solve 12 hand-built logic puzzles. Prism is a colour-mixing puzzle game with an adaptive hint tutor.",
      },
      { property: "og:title", content: "Prism — A Puzzle Game Made of Light" },
      {
        property: "og:description",
        content:
          "Bend, split and mix beams of light to solve hand-built logic puzzles. Colour is the mechanic.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const rise = {
    hidden: { opacity: 0, y: 22 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 28 },
    },
  };

  const beams = [
    { c: "var(--beam-red)", d: "M -100 120 L 1600 420" },
    { c: "var(--beam-cyan)", d: "M -100 320 L 1600 60" },
    { c: "var(--beam-magenta)", d: "M -100 520 L 1600 260" },
  ];

  return (
    <main className="relative min-h-dvh overflow-hidden aurora">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 1440 600"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <filter id="heroGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        {beams.map((b, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.18, duration: 0.6 }}
          >
            <motion.path
              d={b.d}
              stroke={b.c}
              strokeWidth={14}
              fill="none"
              filter="url(#heroGlow)"
              opacity={0.5}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.15 + i * 0.18, duration: 1.4, ease: "easeOut" }}
            />
            <motion.path
              d={b.d}
              stroke={b.c}
              strokeWidth={2}
              fill="none"
              opacity={0.9}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.15 + i * 0.18, duration: 1.4, ease: "easeOut" }}
            />
          </motion.g>
        ))}
      </svg>

      <motion.div
        className="relative mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-6 py-20"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } }}
      >
        <motion.p
          variants={rise}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-1.5 text-xs font-medium tracking-widest text-muted-foreground uppercase backdrop-blur"
        >
          <Sparkle className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Puzzle Masters Hackathon 2026
        </motion.p>

        <motion.h1
          variants={rise}
          className="mt-8 text-6xl leading-[0.95] font-extrabold sm:text-8xl"
        >
          Light is the
          <br />
          <span className="text-primary text-glow">only</span> mechanic.
        </motion.h1>

        <motion.p variants={rise} className="mt-6 max-w-xl text-lg text-muted-foreground">
          Prism is a logic puzzle about routing beams. Turn mirrors, split rays, strip
          colour with filters and shatter white light through a prism until every target
          burns the exact shade it asks for.
        </motion.p>

        <motion.div variants={rise} className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            to="/play"
            className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.03] active:scale-95"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            Start playing
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
          <Link
            to="/studio"
            className="inline-flex min-h-11 items-center rounded-full border border-primary/45 bg-primary/10 px-6 text-sm font-medium backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/20"
          >
            Open Prism Studio
          </Link>
          <Link
            to="/intelligence"
            className="inline-flex min-h-11 items-center rounded-full border border-accent/50 bg-accent/12 px-6 text-sm font-medium backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/20"
          >
            Light Intelligence Lab
          </Link>
          <Link
            to="/sandbox"
            className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface/60 px-6 text-sm font-medium backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-2"
          >
            Light sandbox
          </Link>
          <Link
            to="/lab"
            className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface/60 px-6 text-sm font-medium backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-2"
          >
            Light Laboratory
          </Link>
          <Link
            to="/play/$levelId"
            params={{ levelId: LEVELS[LEVELS.length - 1]!.id }}
            className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface/60 px-6 text-sm font-medium backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-2"
          >
            Jump to the hardest one
          </Link>
        </motion.div>

        <ul className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CHAPTERS.map((c) => (
            <motion.li
              key={c.n}
              variants={rise}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur"
            >
              <p className="font-display text-sm text-primary">Chapter {c.n}</p>
              <p className="mt-1 font-display text-lg font-bold">{c.name}</p>
              <p className="mt-2 text-sm text-muted-foreground">{c.blurb}</p>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </main>
  );
}
