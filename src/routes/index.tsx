import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { HeroPuzzle } from "@/components/game/HeroPuzzle";
import { CHAPTERS } from "@/game/levels";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prism — A Puzzle Game Made of Light" },
      {
        name: "description",
        content:
          "Turn one mirror and watch white light separate into red, green and blue. Prism is a colour-mixing logic puzzle built on a real optical simulation.",
      },
      { property: "og:title", content: "Prism — A Puzzle Game Made of Light" },
      {
        property: "og:description",
        content:
          "Turn one mirror and watch white light separate into red, green and blue. Colour is the mechanic.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const SECONDARY = [
  { to: "/experience", label: "90-second tour" },
  { to: "/discoveries", label: "Discovery journal" },
  { to: "/studio", label: "Studio" },
  { to: "/sandbox", label: "Sandbox" },
  { to: "/lab", label: "Laboratory" },
  { to: "/intelligence", label: "Intelligence Lab" },
] as const;

function Landing() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const rise = {
    hidden: { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 28 },
    },
  };

  return (
    <main className="relative min-h-dvh overflow-hidden aurora">
      <motion.div
        className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:py-24"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }}
      >
        <div>
          <motion.p
            variants={rise}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-1.5 text-xs font-medium tracking-widest text-muted-foreground uppercase backdrop-blur"
          >
            Puzzle Masters Hackathon 2026
          </motion.p>

          <motion.h1
            variants={rise}
            className="mt-6 text-5xl leading-[0.95] font-extrabold sm:text-7xl"
          >
            Light is the
            <br />
            <span className="text-primary text-glow">only</span> mechanic.
          </motion.h1>

          <motion.p variants={rise} className="mt-6 max-w-md text-lg text-muted-foreground">
            Route beams through mirrors, splitters, filters and prisms until every
            target burns the exact colour it asks for. Twelve hand-built puzzles on a
            real optical simulation.
          </motion.p>

          <motion.div variants={rise} className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/play"
              className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.03] active:scale-95"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              Start playing
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              to="/experience"
              className="inline-flex min-h-12 items-center rounded-full border border-primary/45 bg-primary/10 px-6 text-sm font-medium backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/20"
            >
              Watch the 90-second tour
            </Link>
          </motion.div>
        </div>

        <motion.div variants={rise}>
          <HeroPuzzle reduceMotion={reduceMotion} />
        </motion.div>
      </motion.div>

      <section className="relative mx-auto max-w-6xl px-6 pb-20">
        <h2 className="sr-only">Campaign chapters</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CHAPTERS.map((c) => (
            <motion.li
              key={c.n}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
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

        <nav aria-label="Other Prism tools" className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="text-muted-foreground">Also inside:</span>
          {SECONDARY.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}

