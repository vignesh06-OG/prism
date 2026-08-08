import { AnimatePresence, motion } from "motion/react";
import { Radio } from "lucide-react";
import { colorVar } from "@/game/engine";
import type { BeamEvent, TraceResult } from "@/game/types";
import { cn } from "@/lib/utils";

interface Props {
  result: TraceResult;
  reduceMotion?: boolean;
  className?: string;
  limit?: number;
}

const LABEL: Record<BeamEvent["kind"], string> = {
  emit: "EMIT",
  reflect: "REFLECT",
  split: "SPLIT",
  disperse: "DISPERSE",
  filter: "FILTER",
  absorb: "ABSORB",
  attenuate: "ATTENUATE",
  scatter: "SCATTER",
  hit: "HIT",
  escape: "ESCAPE",
};

/**
 * Developer Commentary Mode — narrates every decision the tracer made on the
 * current board, in the order it made it. Doubles as a live teaching tool.
 */
export function CommentaryPanel({ result, reduceMotion = false, className, limit = 14 }: Props) {
  const events = result.events.slice(0, limit);

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-surface/60 p-4 backdrop-blur-sm",
        className,
      )}
      aria-label="Engine commentary"
    >
      <header className="mb-3 flex items-center gap-2">
        <Radio className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Engine commentary
        </h2>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {result.events.length} decisions
        </span>
      </header>

      <ol className="max-h-64 space-y-1.5 overflow-y-auto pr-1 text-xs" aria-live="polite">
        <AnimatePresence initial={false}>
          {events.map((e, i) => (
            <motion.li
              key={`${e.kind}-${e.cell}-${i}-${e.color}`}
              initial={reduceMotion ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, delay: reduceMotion ? 0 : i * 0.012 }}
              className="flex items-start gap-2 rounded-lg bg-surface-2/50 px-2.5 py-1.5"
            >
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ background: colorVar(e.color) }}
                aria-hidden="true"
              />
              <span className="font-mono text-[10px] tracking-wider text-accent">{LABEL[e.kind]}</span>
              <span className="text-muted-foreground">{e.text}</span>
              <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/70">
                {Math.round(e.intensity * 100)}%
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
        {!events.length && (
          <li className="text-muted-foreground">No light in flight yet — place an emitter.</li>
        )}
      </ol>
    </section>
  );
}
