import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

interface Props {
  /** Number of drifting motes. Kept low: this layer must never cost frames. */
  density?: number;
}

/**
 * Ambient light-leak backdrop: two slow drifting bloom fields plus a handful of
 * floating motes. Pure CSS transforms (GPU compositing only) and fully static
 * on the server, so it costs nothing at hydration and holds 60fps.
 */
export function AmbientBackdrop({ density = 14 }: Props) {
  const reduce = useReducedMotion();

  const motes = useMemo(
    () =>
      // Deterministic positions — no Math.random at module or render scope.
      Array.from({ length: density }, (_, i) => {
        const t = (i + 1) / (density + 1);
        return {
          left: `${(t * 97 + i * 13) % 100}%`,
          top: `${(t * 61 + i * 29) % 100}%`,
          size: 2 + ((i * 7) % 4),
          delay: (i % 7) * 1.1,
          duration: 14 + (i % 5) * 4,
        };
      }),
    [density],
  );

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_-10%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_70%)]" />
      <motion.div
        className="absolute -left-24 top-1/4 h-[36rem] w-[36rem] rounded-full opacity-[0.16] blur-3xl"
        style={{ background: "var(--beam-cyan)" }}
        animate={reduce ? {} : { x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-32 bottom-0 h-[32rem] w-[32rem] rounded-full opacity-[0.14] blur-3xl"
        style={{ background: "var(--beam-magenta)" }}
        animate={reduce ? {} : { x: [0, -50, 0], y: [0, 30, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      />
      {!reduce &&
        motes.map((m, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-foreground/40"
            style={{ left: m.left, top: m.top, width: m.size, height: m.size }}
            animate={{ y: [0, -26, 0], opacity: [0.08, 0.4, 0.08] }}
            transition={{
              duration: m.duration,
              delay: m.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
    </div>
  );
}
