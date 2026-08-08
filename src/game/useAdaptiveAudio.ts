import { useEffect, useMemo, useRef } from "react";
import { playVoice, updateAmbience } from "@/game/audio";
import type { TraceResult } from "@/game/types";

const popcount = (n: number) => (n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1);

/**
 * Bridges the simulation to the procedural score: harmony follows beam
 * density and colour work, and each new interaction fires a short voice.
 */
export function useAdaptiveAudio(result: TraceResult, lit: number, enabled: boolean) {
  const prev = useRef({ reflections: 0, splits: 0, lit: 0, solved: false });

  const stats = useMemo(() => {
    const reflections = result.events.filter((e) => e.kind === "reflect").length;
    const splits = result.events.filter((e) => e.kind === "split" || e.kind === "disperse").length;
    const mixes = result.segments.filter((s) => popcount(s.color) > 1).length;
    return { reflections, splits, mixes };
  }, [result]);

  useEffect(() => {
    if (!enabled) return;
    updateAmbience({
      beams: result.segments.length,
      splits: stats.splits,
      mixes: Math.min(6, stats.mixes),
      lit,
      targets: result.targetCount,
      solved: result.solved,
    });

    const p = prev.current;
    if (stats.reflections > p.reflections) playVoice("reflect", (stats.reflections % 5) * 40);
    if (stats.splits > p.splits) playVoice("split", (stats.splits % 4) * 60);
    if (stats.mixes > 0 && stats.splits !== p.splits) playVoice("mix");
    if (lit > p.lit) playVoice("target", (lit % 4) * 80);
    if (result.solved && !p.solved) playVoice("solve");

    prev.current = {
      reflections: stats.reflections,
      splits: stats.splits,
      lit,
      solved: result.solved,
    };
  }, [enabled, lit, result, stats]);
}
