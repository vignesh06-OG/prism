import { motion } from "motion/react";
import { Flag, Sparkles, Split, Target as TargetIcon, Undo2, Zap } from "lucide-react";
import { useMemo } from "react";
import { trace } from "@/game/engine";
import type { Board } from "@/game/types";
import { cn } from "@/lib/utils";

interface Props {
  /** Every board state the player passed through. */
  timeline: Board[];
  className?: string;
  reduceMotion?: boolean;
}

interface SolveEvent {
  index: number;
  label: string;
  detail: string;
  icon: typeof Zap;
  tone: "neutral" | "good" | "great";
}

const popcount = (n: number) => (n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1);

/**
 * Interactive Puzzle Timeline — distils a solve into the moments that mattered
 * (first light, first split, first mixed target, each target lit, the solve).
 */
export function SolveTimeline({ timeline, className, reduceMotion = false }: Props) {
  const events = useMemo<SolveEvent[]>(() => {
    const out: SolveEvent[] = [];
    let prevLit = 0;
    let sawBeam = false;
    let sawSplit = false;
    let sawMix = false;

    timeline.forEach((board, index) => {
      const res = trace(board);
      if (!sawBeam && res.segments.length) {
        sawBeam = true;
        out.push({ index, label: "First light", detail: `${res.segments.length} beam edges in flight`, icon: Zap, tone: "neutral" });
      }
      const splits = res.events.filter((e) => e.kind === "split" || e.kind === "disperse").length;
      if (!sawSplit && splits > 0) {
        sawSplit = true;
        out.push({ index, label: "Beam divided", detail: `${splits} split${splits > 1 ? "s" : ""} in the path`, icon: Split, tone: "neutral" });
      }
      const mixed = res.segments.some((s) => popcount(s.color) > 1);
      if (!sawMix && mixed) {
        sawMix = true;
        out.push({ index, label: "Colours mixed", detail: "Two channels now share an edge", icon: Sparkles, tone: "good" });
      }
      if (res.solvedCount > prevLit) {
        out.push({
          index,
          label: `Target lit (${res.solvedCount}/${res.targetCount})`,
          detail: "Exact colour delivered",
          icon: TargetIcon,
          tone: "good",
        });
      } else if (res.solvedCount < prevLit) {
        out.push({ index, label: "Target lost", detail: "A previous route was broken", icon: Undo2, tone: "neutral" });
      }
      prevLit = res.solvedCount;
      if (res.solved && index === timeline.length - 1) {
        out.push({ index, label: "Solved", detail: `${index} move${index === 1 ? "" : "s"} total`, icon: Flag, tone: "great" });
      }
    });
    return out;
  }, [timeline]);

  return (
    <section
      className={cn("rounded-2xl border border-border bg-surface/60 p-4 backdrop-blur-sm", className)}
      aria-label="Solve timeline"
    >
      <h2 className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        Solve timeline
      </h2>
      <ol className="relative space-y-2.5 border-l border-border/70 pl-4">
        {events.map((e, i) => (
          <motion.li
            key={`${e.label}-${e.index}-${i}`}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, delay: reduceMotion ? 0 : i * 0.04 }}
            className="relative"
          >
            <span
              className={cn(
                "absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                e.tone === "great"
                  ? "bg-accent"
                  : e.tone === "good"
                    ? "bg-primary"
                    : "bg-muted-foreground/60",
              )}
              aria-hidden="true"
            />
            <div className="flex items-center gap-2 text-sm">
              <e.icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">{e.label}</span>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                move {e.index}
              </span>
            </div>
            <p className="pl-5.5 text-xs text-muted-foreground">{e.detail}</p>
          </motion.li>
        ))}
        {!events.length && (
          <li className="text-xs text-muted-foreground">Make a move to start the timeline.</li>
        )}
      </ol>
    </section>
  );
}
