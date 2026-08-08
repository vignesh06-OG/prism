import { motion } from "motion/react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PrismBoard } from "@/components/game/PrismBoard";
import { trace } from "@/game/engine";
import type { Board, ColorMask } from "@/game/types";
import { cn } from "@/lib/utils";

interface Props {
  frames: Board[];
  colorblind: boolean;
  reduceMotion?: boolean;
  /** Frame duration in ms. */
  speed?: number;
  compact?: boolean;
}

/** Scrubbable timeline replay of every move the player made. */
export function ReplayTimeline({
  frames,
  colorblind,
  reduceMotion = false,
  speed = 850,
  compact = false,
}: Props) {
  const last = Math.max(0, frames.length - 1);
  const [index, setIndex] = useState(last);
  const [playing, setPlaying] = useState(false);

  useEffect(() => setIndex(last), [last]);

  useEffect(() => {
    if (!playing) return;
    if (index >= last) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setIndex((i) => Math.min(last, i + 1)), speed);
    return () => window.clearTimeout(t);
  }, [playing, index, last, speed]);

  const board = frames[Math.min(index, last)] ?? frames[0]!;
  const result = useMemo(() => trace(board), [board]);

  const lit: string[] = [];
  const misrouted: string[] = [];
  for (const [k, piece] of Object.entries(board.cells)) {
    if (piece.kind !== "target") continue;
    const got: ColorMask = result.hits[k] ?? 0;
    if (got === (piece.color ?? 7)) lit.push(k);
    else if (got !== 0) misrouted.push(k);
  }

  const play = () => {
    if (index >= last) setIndex(0);
    setPlaying(true);
  };

  return (
    <div className={cn("w-full", compact && "mx-auto max-w-xs")}>
      <PrismBoard
        board={board}
        result={result}
        onActivate={() => {}}
        colorblind={colorblind}
        placing={false}
        readOnly
        reduceMotion={reduceMotion}
        litKeys={lit}
        misroutedKeys={misrouted}
      />

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          aria-label="Previous move"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface/70 transition-colors hover:bg-surface-2"
        >
          <SkipBack className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => (playing ? setPlaying(false) : play())}
          aria-label={playing ? "Pause replay" : "Play replay"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/50 bg-primary/15 text-primary transition-colors hover:bg-primary/25"
        >
          {playing ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(last, i + 1))}
          aria-label="Next move"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface/70 transition-colors hover:bg-surface-2"
        >
          <SkipForward className="h-4 w-4" aria-hidden="true" />
        </button>

        <label className="flex min-w-0 flex-1 items-center gap-2">
          <span className="sr-only">Scrub replay timeline</span>
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={index}
            onChange={(e) => {
              setPlaying(false);
              setIndex(Number(e.target.value));
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-primary"
          />
        </label>
        <motion.span
          key={index}
          initial={reduceMotion ? false : { scale: 0.85, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className="shrink-0 text-xs tabular-nums text-muted-foreground"
        >
          {index}/{last}
        </motion.span>
      </div>
    </div>
  );
}
