import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { HeroPuzzle } from "@/components/game/HeroPuzzle";
import { Etch } from "@/components/chrome/instrument";
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

/**
 * The entrance to the chamber.
 *
 * Deliberately not a landing page: no badge pill, no centred hero stack, no
 * three-up feature cards. The apparatus itself is the hero and it bleeds off
 * the right edge of the canvas, so the first thing the eye meets is light in
 * a dark room. The chapter index below is an optical bench — hairline-divided
 * columns with etched numerals — rather than a grid of cards.
 */
function Landing() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const rise = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 28 },
    },
  };

  return (
    <main className="chamber grain relative min-h-dvh overflow-x-hidden">
      <motion.div
        className="relative z-10 mx-auto grid w-full max-w-[86rem] items-center gap-y-12 px-6 pt-14 pb-16 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-x-16 lg:pt-24 lg:pr-0 lg:pb-24"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } }}
      >
        <div className="lg:pb-6">
          <motion.div variants={rise}>
            <Etch>Prism · optical logic</Etch>
          </motion.div>

          {/* Power-on: one beam sweeps the title and leaves it lit. It runs
              once, occupies no layout box, and is skipped entirely for
              reduced-motion visitors — who simply arrive to a lit headline. */}
          <motion.div variants={rise} className="relative mt-5">
            <motion.h1
              className="font-display text-[clamp(2.75rem,7vw,4.5rem)] leading-[0.92] font-extrabold tracking-[-0.03em]"
              initial={reduceMotion ? false : { opacity: 0.32 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.42, ease: "easeOut" }}
            >
              Light is the
              <br />
              <span className="text-primary text-glow">only</span> mechanic.
            </motion.h1>

            {!reduceMotion && (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-[22%] mix-blend-screen"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 55%, transparent), transparent)",
                  filter: "blur(6px)",
                }}
                initial={{ left: "-25%", opacity: 0 }}
                animate={{ left: ["-25%", "105%"], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.9, delay: 0.15, ease: "easeInOut" }}
              />
            )}
          </motion.div>

          {/* A fibre, not a divider: the rule under the title is the same
              material as the beams on the board. */}
          <motion.div variants={rise} className="fibre mt-7 max-w-sm">
            <span
              className="absolute inset-y-0 left-0 w-1/3 bg-primary"
              style={{ boxShadow: "0 0 12px 1px var(--primary)" }}
            />
          </motion.div>

          <motion.p
            variants={rise}
            className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground"
          >
            Route beams through mirrors, splitters, filters and prisms until every
            target burns the exact colour it asks for. Thirteen hand-built puzzles
            on a real optical simulation — no lives, no timers, no luck.
          </motion.p>

          <motion.div variants={rise} className="mt-9 flex flex-wrap items-center gap-2.5">
            <Link
              to="/play"
              className="group inline-flex min-h-12 items-center gap-2.5 rounded-sm bg-primary px-7 text-[0.9375rem] font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
              style={{ boxShadow: "0 0 32px -6px var(--primary)" }}
            >
              Enter the chamber
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              to="/experience"
              className="optic-control inline-flex min-h-12 items-center px-6 text-[0.9375rem]"
            >
              Watch the 90-second tour
            </Link>
          </motion.div>
        </div>

        {/* The apparatus bleeds past the canvas edge — it is a piece of a
            larger rig you are looking into, not an illustration in a card. */}
        <motion.div variants={rise} className="relative lg:-mr-24 xl:-mr-32">
          <div
            className="pointer-events-none absolute -inset-24 -z-10"
            style={{
              background:
                "radial-gradient(closest-side, oklch(0.78 0.16 195 / 0.16), transparent 72%)",
            }}
            aria-hidden="true"
          />
          <HeroPuzzle reduceMotion={reduceMotion} />
        </motion.div>
      </motion.div>

      {/* Chapter index as an optical bench: hairline channels, etched numerals,
          no card ever closes around the content. */}
      <section className="relative z-10 mx-auto max-w-[86rem] px-6 pb-20">
        <h2 className="etch">The campaign · four chapters</h2>
        <ul className="mt-5 grid border-t border-[var(--hairline)] sm:grid-cols-2 lg:grid-cols-4">
          {CHAPTERS.map((c) => (
            <motion.li
              key={c.n}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="group relative border-b border-[var(--hairline)] py-6 pr-6 sm:border-b-0 lg:border-l lg:border-[var(--hairline)] lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
            >
              <span
                className="absolute top-0 left-0 h-px w-0 bg-primary transition-[width] duration-500 ease-out group-hover:w-full lg:left-6 lg:first:left-0"
                style={{ boxShadow: "0 0 10px 1px var(--primary)" }}
                aria-hidden="true"
              />
              <p className="font-display text-3xl leading-none font-extrabold text-muted-foreground/30 tabular-nums transition-colors duration-300 group-hover:text-primary">
                {String(c.n).padStart(2, "0")}
              </p>
              <p className="mt-3 font-display text-base font-bold">{c.name}</p>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                {c.blurb}
              </p>
            </motion.li>
          ))}
        </ul>

        <nav
          aria-label="Other Prism tools"
          className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--hairline)] pt-5"
        >
          <Etch>Also inside</Etch>
          {SECONDARY.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="text-[0.8125rem] text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
