import { motion } from "motion/react";
import type { Decision } from "@/game/photonmind/director";
import { RailSection } from "@/components/chrome/instrument";
import { cn } from "@/lib/utils";

interface Props {
  decision: Decision;
  onRequestSolution?: (() => void) | undefined;
  reduceMotion?: boolean | undefined;
  className?: string | undefined;
}

const STATE_TONE: Record<Decision["state"], string> = {
  FLOWING: "text-beam-green",
  EXPLORING: "text-beam-cyan",
  UNCERTAIN: "text-accent",
  STRUGGLING: "text-accent",
  STUCK: "text-beam-red",
};

/**
 * The face of the Game Director, built as an instrument rather than a card.
 * It always shows the same three things — the state it read, the rung it
 * chose, and the evidence behind that choice — whether it decided to speak or
 * to stay quiet. A dormant director is a dim indicator, not a loud panel.
 */
export function DirectorPanel({
  decision,
  onRequestSolution,
  reduceMotion = false,
  className,
}: Props) {
  return (
    <RailSection
      label="PhotonMind"
      tone={decision.silent ? "muted" : "primary"}
      className={className}
      meta={
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              STATE_TONE[decision.state].replace("text-", "bg-"),
              !reduceMotion && !decision.silent && "lens-breathe",
            )}
            aria-hidden="true"
          />
          <span
            className={cn(
              "font-display text-[0.5625rem] tracking-[0.18em] uppercase",
              STATE_TONE[decision.state],
            )}
          >
            {decision.state}
          </span>
        </span>
      }
    >
      <div aria-live="polite" aria-label="PhotonMind director">
        <motion.p
          key={decision.headline}
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
          className="font-display text-[0.8125rem] leading-snug font-bold text-balance"
        >
          {decision.headline}
        </motion.p>
        <p className="mt-1 text-[0.6875rem] leading-relaxed text-muted-foreground">
          {decision.body}
        </p>

        <p className="mt-2.5 font-display text-[0.5625rem] tracking-[0.18em] text-muted-foreground/70 uppercase">
          Rung {decision.rung} · {decision.rungLabel}
        </p>
        <ul className="mt-1.5 space-y-1 text-[0.6875rem] leading-tight text-muted-foreground/85">
          {decision.evidence.slice(0, 3).map((e, i) => (
            <motion.li
              key={e}
              initial={reduceMotion ? false : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduceMotion ? 0 : i * 0.05 }}
              className="border-l border-primary/35 pl-2"
            >
              {e}
            </motion.li>
          ))}
        </ul>

        {decision.rung >= 3 && decision.rung < 5 && onRequestSolution ? (
          <button
            type="button"
            onClick={onRequestSolution}
            className="optic-control mt-2.5 inline-flex min-h-9 w-full items-center justify-center px-3 text-[0.6875rem]"
          >
            Show the solver&rsquo;s route
          </button>
        ) : null}

        <p className="mt-2 text-[0.625rem] leading-tight text-muted-foreground/55">
          Behaviour read on-device. The deterministic solver, not the model, is the
          source of truth.
        </p>
      </div>
    </RailSection>
  );
}
