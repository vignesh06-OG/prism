import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Activity, Cpu, Dna, Play, Shuffle, Sparkles } from "lucide-react";
import { PrismBoard } from "@/components/game/PrismBoard";
import { GenomePanel } from "@/components/game/GenomePanel";
import { FeatureImportance } from "@/components/photonmind/FeatureImportance";
import { PredictionCard } from "@/components/photonmind/PredictionCard";
import { SearchVisualizer } from "@/components/photonmind/SearchVisualizer";
import { analyse, type Analysis } from "@/game/analysis";
import { evolvePuzzles } from "@/game/evolve";
import { LEVELS } from "@/game/levels";
import { predict } from "@/game/photonmind/predict";
import { traceSearch, type SearchTrace } from "@/game/photonmind/search";
import { trace } from "@/game/engine";
import { encodeBoard } from "@/game/share";
import type { Board } from "@/game/types";
import { cn } from "@/lib/utils";

type Source = { id: string; title: string; board: Board };

/**
 * Light Intelligence Lab — the research surface. Pick a puzzle, watch the
 * learned model estimate it instantly, then watch the exhaustive search prove
 * or disprove that estimate one frontier at a time.
 */
export default function IntelligenceLab({ reduceMotion = false }: { reduceMotion?: boolean }) {
  const campaign: Source[] = useMemo(
    () => LEVELS.map((l) => ({ id: l.id, title: l.name, board: l.board })),
    [],
  );
  const [evolved, setEvolved] = useState<Source[]>([]);
  const [seed, setSeed] = useState(7);
  const [evolving, setEvolving] = useState(false);
  const [activeId, setActiveId] = useState(campaign[0]?.id ?? "");

  const sources = useMemo(() => [...campaign, ...evolved], [campaign, evolved]);
  const active = sources.find((s) => s.id === activeId) ?? sources[0]!;

  const prediction = useMemo(() => predict(active.board), [active]);
  const [solver, setSolver] = useState<Analysis | null>(null);
  const [solverMs, setSolverMs] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState<SearchTrace | null>(null);
  const [thinking, setThinking] = useState(false);

  // Run the heavy search off the paint path so the UI never drops a frame.
  useEffect(() => {
    let cancelled = false;
    setSolver(null);
    setSearch(null);
    setThinking(true);
    const t = window.setTimeout(() => {
      const t0 = performance.now();
      const a = analyse(active.board);
      const ms = performance.now() - t0;
      const s = traceSearch(active.board);
      if (cancelled) return;
      setSolver(a);
      setSolverMs(ms);
      setSearch(s);
      setThinking(false);
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [active]);

  const evolve = useCallback(() => {
    setEvolving(true);
    window.setTimeout(() => {
      const { kept } = evolvePuzzles({ seed, targetComplexity: 55, width: 7, height: 7 });
      const next = kept.map((c, i) => ({
        id: `evo-${seed}-${i}`,
        title: `Evolved ${seed}·${i + 1}`,
        board: c.board,
      }));
      setEvolved(next);
      if (next[0]) setActiveId(next[0].id);
      setSeed((s) => s + 1);
      setEvolving(false);
    }, 30);
  }, [seed]);

  const result = useMemo(() => trace(active.board), [active]);

  return (
    <div className="space-y-6">
      {/* Corpus picker */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-[11px] tracking-[0.28em] text-muted-foreground uppercase">
          Specimen
        </span>
        <div className="flex flex-wrap gap-1.5">
          {sources.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              aria-pressed={s.id === active.id}
              className={cn(
                "min-h-9 rounded-full border px-3 text-xs transition-all",
                s.id === active.id
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {s.title}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={evolve}
          disabled={evolving}
          className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent/20 disabled:opacity-60"
        >
          <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
          {evolving ? "Evolving…" : "Evolve new specimens"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section
            className="relative overflow-hidden rounded-3xl border border-border bg-surface/50 p-4 backdrop-blur"
            aria-label="Specimen board"
          >
            <div className="flex items-center justify-between gap-3 pb-3">
              <div>
                <h2 className="font-display text-lg font-bold">{active.title}</h2>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {encodeBoard(active.board)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                <Activity className="h-3 w-3 text-primary" aria-hidden="true" />
                {result.segments.length} beam edges
              </span>
            </div>
            <PrismBoard
              board={active.board}
              result={result}
              onActivate={() => {}}
              colorblind={false}
              placing={false}
              reduceMotion={reduceMotion}
              readOnly
            />
          </section>

          <section
            className="rounded-3xl border border-border bg-surface/50 p-5 backdrop-blur"
            aria-label="Search visualisation"
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-[11px] tracking-[0.28em] text-primary uppercase">
                  Deterministic solver
                </p>
                <h3 className="font-display text-lg font-bold">Watch the search think</h3>
                <p className="mt-1 max-w-prose text-xs text-muted-foreground">
                  Each ring is one move deeper. Every dot is a real board state the validator
                  expanded; red branches died, cyan is the route it proved optimal.
                </p>
              </div>
              <Cpu className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            </header>

            <AnimatePresence mode="wait">
              {thinking || !search ? (
                <motion.div
                  key="thinking"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid h-64 place-items-center text-sm text-muted-foreground"
                  role="status"
                >
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4 animate-pulse text-primary" aria-hidden="true" />
                    Expanding the frontier…
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <SearchVisualizer
                    trace={search}
                    reduceMotion={reduceMotion}
                    className="mx-auto mt-2 max-w-md"
                  />
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                    {[
                      ["States expanded", search.expanded.toLocaleString()],
                      ["Solution depth", search.solutionId === null ? "not found" : `${search.depth}`],
                      ["Nodes drawn", `${search.nodes.length}`],
                      ["Search time", `${search.milliseconds} ms`],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-border bg-background/40 p-2">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="font-display font-bold tabular-nums">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        <div className="space-y-6">
          <PredictionCard
            prediction={prediction}
            solver={solver}
            {...(solverMs !== undefined ? { solverMs } : {})}
            reduceMotion={reduceMotion}
          />
          <GenomePanel board={active.board} reduceMotion={reduceMotion} />
          <FeatureImportance reduceMotion={reduceMotion} />

          <section className="rounded-2xl border border-border bg-surface/70 p-5 text-xs backdrop-blur">
            <header className="flex items-center gap-2">
              <Dna className="h-4 w-4 text-accent" aria-hidden="true" />
              <h3 className="font-display text-sm font-bold">How PhotonMind works</h3>
            </header>
            <ol className="mt-3 space-y-2 text-muted-foreground">
              <li>
                <span className="text-foreground">1 · Search.</span> A breadth-first validator
                proves solvability and finds the optimal move count. Exact, but expensive.
              </li>
              <li>
                <span className="text-foreground">2 · Learn.</span> Thousands of generated puzzles
                were labelled by that validator offline; a ridge regressor and a logistic classifier
                were fit to 16 board features.
              </li>
              <li>
                <span className="text-foreground">3 · Predict.</span> In the app the model estimates
                difficulty, solve time and hint risk without any search at all.
              </li>
              <li>
                <span className="text-foreground">4 · Explain.</span> Every prediction exposes its
                per-feature contributions and is checked against the solver, so you can see when the
                model is wrong.
              </li>
            </ol>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
              <Play className="h-3 w-3" aria-hidden="true" /> Nothing here calls a network. The
              model ships as frozen weights in the bundle.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
