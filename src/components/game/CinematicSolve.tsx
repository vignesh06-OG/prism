import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Film, Star, Trophy } from "lucide-react";
import { ReplayTimeline } from "@/components/game/ReplayTimeline";
import type { Board } from "@/game/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  title: string;
  moves: number;
  par: number;
  stars: number;
  frames: Board[];
  colorblind: boolean;
  reduceMotion?: boolean;
  actions: ReactNode;
}

const PARTICLES = 26;

/**
 * The victory sequence: slow-motion bloom over the board, a burst of light
 * particles, then the results card with an instant replay of the solve.
 */
export function CinematicSolve({
  open,
  title,
  moves,
  par,
  stars,
  frames,
  colorblind,
  reduceMotion = false,
  actions,
}: Props) {
  const [phase, setPhase] = useState<"bloom" | "card">(reduceMotion ? "card" : "bloom");
  const [tab, setTab] = useState<"summary" | "replay">("summary");

  useEffect(() => {
    if (!open) {
      setPhase(reduceMotion ? "card" : "bloom");
      setTab("summary");
      return;
    }
    if (reduceMotion) {
      setPhase("card");
      return;
    }
    const t = window.setTimeout(() => setPhase("card"), 1500);
    return () => window.clearTimeout(t);
  }, [open, reduceMotion]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cinematic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35 }}
          className={cn(
            "fixed inset-0 z-30 grid place-items-center px-4",
            phase === "card" ? "bg-background/85 backdrop-blur-sm" : "pointer-events-none",
          )}
          role={phase === "card" ? "dialog" : undefined}
          aria-modal={phase === "card" ? true : undefined}
          aria-label={`${title} solved`}
        >
          {/* Board illumination: a slow bloom that washes the whole scene. */}
          {!reduceMotion && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 45%, color-mix(in oklab, var(--primary) 55%, transparent), transparent 62%)",
              }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 0.95, 0.25], scale: [0.6, 1.25, 1.05] }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            />
          )}

          {/* Light particles */}
          {!reduceMotion && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              {Array.from({ length: PARTICLES }, (_, i) => {
                const angle = (i / PARTICLES) * Math.PI * 2;
                const dist = 180 + ((i * 37) % 220);
                return (
                  <motion.span
                    key={i}
                    className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full"
                    style={{
                      background: `var(--beam-${["red", "green", "blue", "yellow", "cyan", "magenta"][i % 6]})`,
                      boxShadow: "var(--shadow-glow)",
                    }}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                    animate={{
                      x: Math.cos(angle) * dist,
                      y: Math.sin(angle) * dist,
                      opacity: [0, 1, 0],
                      scale: [0.4, 1.6, 0.2],
                    }}
                    transition={{
                      duration: 1.7 + (i % 5) * 0.18,
                      ease: "easeOut",
                      delay: (i % 7) * 0.05,
                    }}
                  />
                );
              })}
            </div>
          )}

          <AnimatePresence>
            {phase === "card" && (
              <motion.div
                key="card"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 280, damping: 26 }}
                className="pointer-events-auto relative max-h-[88dvh] w-full max-w-sm overflow-y-auto rounded-3xl border border-primary/40 bg-surface/90 p-7 text-center backdrop-blur-xl"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                <p className="font-display text-xs tracking-[0.3em] text-primary uppercase">
                  {stars === 3 ? "Perfect route" : "Solved"}
                </p>
                <h2 className="mt-2 flex items-center justify-center gap-2 text-3xl font-extrabold">
                  <Trophy className="h-7 w-7 text-accent" aria-hidden="true" />
                  {title}
                </h2>

                <div
                  className="mt-4 flex justify-center gap-2"
                  aria-label={`${stars} of 3 stars`}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      initial={reduceMotion ? false : { scale: 0, rotate: -40 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 14,
                        delay: reduceMotion ? 0 : 0.12 * i,
                      }}
                    >
                      <Star
                        className={cn(
                          "h-8 w-8",
                          i < stars
                            ? "fill-accent text-accent drop-shadow-[0_0_10px_var(--accent)]"
                            : "text-muted-foreground/40",
                        )}
                        aria-hidden="true"
                      />
                    </motion.span>
                  ))}
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  {moves} {moves === 1 ? "move" : "moves"} · par {par}
                </p>

                <div className="mt-5 flex justify-center gap-1 rounded-full border border-border bg-surface-2/70 p-1 text-xs">
                  {(["summary", "replay"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      aria-pressed={tab === t}
                      className={cn(
                        "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 font-medium capitalize transition-colors",
                        tab === t
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t === "replay" && <Film className="h-3.5 w-3.5" aria-hidden="true" />}
                      {t}
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  {tab === "replay" ? (
                    <ReplayTimeline
                      frames={frames}
                      colorblind={colorblind}
                      reduceMotion={reduceMotion}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3">{actions}</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
