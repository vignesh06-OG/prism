import { useState } from "react";
import { motion } from "motion/react";
import type { Level } from "@/game/types";

type Depth = "casual" | "curious" | "advanced";

const TABS: { id: Depth; label: string }[] = [
  { id: "casual", label: "In short" },
  { id: "curious", label: "A bit deeper" },
  { id: "advanced", label: "Model vs. real optics" },
];


/**
 * The reveal. It arrives only after the player has already solved it, and it
 * explains the principle they just used — at whatever depth they want.
 */
export function PrincipleReveal({
  reveal,
  reduceMotion = false,
}: {
  reveal: NonNullable<Level["reveal"]>;
  reduceMotion?: boolean;
}) {
  const [depth, setDepth] = useState<Depth>("casual");

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduceMotion ? 0 : 0.4, duration: 0.4 }}
      className="w-full rounded-2xl border border-primary/35 bg-primary/[0.06] p-4 text-left"
    >
      <p className="font-display text-[0.65rem] tracking-[0.3em] text-primary uppercase">
        You discovered
      </p>

      <h3 className="mt-1 font-display text-lg font-bold">{reveal.principle}</h3>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setDepth(t.id)}
            aria-pressed={depth === t.id}
            className={
              depth === t.id
                ? "min-h-9 rounded-full border border-primary bg-primary/15 px-3 text-xs font-medium"
                : "min-h-9 rounded-full border border-border px-3 text-xs text-muted-foreground transition-colors hover:bg-surface-2"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <p
        key={depth}
        aria-live="polite"
        className="mt-3 text-sm leading-relaxed text-muted-foreground"
      >
        {reveal[depth]}
      </p>
    </motion.div>
  );
}
