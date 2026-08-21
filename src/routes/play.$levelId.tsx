import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  Settings2,

  Lightbulb,
  RotateCcw,
  Radio,
  Sparkles,
  TriangleAlert,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Etch, Fibre, Readout } from "@/components/chrome/instrument";
import { AchievementToast } from "@/components/game/AchievementToast";
import { AmbientBackdrop } from "@/components/game/AmbientBackdrop";
import { CinematicSolve } from "@/components/game/CinematicSolve";
import { MasterIntro } from "@/components/game/MasterIntro";
import { PrincipleReveal } from "@/components/game/PrincipleReveal";
import { CommentaryPanel } from "@/components/game/CommentaryPanel";
import { DiscoveryToast } from "@/components/game/DiscoveryToast";
import { LawsRail } from "@/components/game/LawsRail";
import { PrismBoard } from "@/components/game/PrismBoard";
import { CoachPanel } from "@/components/photonmind/CoachPanel";
import { DirectorPanel } from "@/components/photonmind/DirectorPanel";
import { SolveTimeline } from "@/components/game/SolveTimeline";
import { evaluate, type Achievement } from "@/game/achievements";
import { setAudioEnabled } from "@/game/audio";
import { useAdaptiveAudio } from "@/game/useAdaptiveAudio";
import { colorGlyph, colorName, trace } from "@/game/engine";
import { getLesson } from "@/game/lessons";
import { getLevel, nextLevel } from "@/game/levels";
import { loadPrefs, recordSolve, savePrefs } from "@/game/progress";
import {
  detect,
  loadDepth,
  loadDiscovered,
  recordDiscoveries,
  saveDepth,
  type Depth,
} from "@/game/discoveries";
import { previewMove, useGame } from "@/game/useGame";
import { usePlayerModel } from "@/game/photonmind/usePlayerModel";
import { direct } from "@/game/photonmind/director";
import { predict } from "@/game/photonmind/predict";
import { forwardBiasOf, recordSolveRow } from "@/game/photonmind/calibration";
import { analyse } from "@/game/analysis";
import type { Board } from "@/game/types";
import type { Level, Piece } from "@/game/types";
import { cn } from "@/lib/utils";



export const Route = createFileRoute("/play/$levelId")({
  head: ({ params }) => {
    const level = getLevel(params.levelId);
    const title = level ? `${level.name} — Prism` : "Puzzle — Prism";
    const description = level
      ? `Chapter ${level.chapter}, puzzle ${level.index}. Route the beams and light every target in ${level.par} moves.`
      : "Route beams of light through mirrors, splitters and prisms.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(level ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: PlayLevel,
});

const trayLabel = (piece: Piece) => {
  switch (piece.kind) {
    case "mirror":
      return "Mirror";
    case "splitter":
      return "Splitter";
    case "prism":
      return "Prism";
    case "filter":
      return `${colorName(piece.color ?? 7)} filter`;
    default:
      return piece.kind;
  }
};

/**
 * The first nudge scales with the level's difficulty band: early puzzles get a
 * mechanical prompt, late puzzles get a way of thinking — never a move.
 */
const firstNudge = (level: Level) => {
  switch (level.tier) {
    case "Master":
      return "Reason backwards. Start at a target, name the colour it demands, and ask which transformation could possibly produce it.";
    case "Demanding":
      return "Plan the whole network before you move — a target here is rarely reachable by a single beam.";
    case "Testing":
      return "Ask what each target actually needs, not just where it sits. The colour is the constraint.";
    default:
      return "Read the targets first — each glyph tells you the exact colour it needs.";
  }
};


function PlayLevel() {
  const { levelId } = Route.useParams();
  const level = getLevel(levelId);
  if (!level) return <MissingLevel />;
  return <LevelScreen key={level.id} levelId={level.id} />;
}

function MissingLevel() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">That puzzle doesn't exist</h1>
        <Link to="/play" className="mt-4 inline-block text-primary underline">
          Back to the puzzle list
        </Link>
      </div>
    </main>
  );
}

function LevelScreen({ levelId }: { levelId: string }) {
  const level = getLevel(levelId)!;
  const navigate = useNavigate();
  const game = useGame(level);
  const [hintLevel, setHintLevel] = useState(0);
  const [prefs, setPrefs] = useState({ colorblind: false, reduceMotion: false, highContrast: false });
  const [showTeach, setShowTeach] = useState(!!level.teaches);
  // Master Trials open on a title card instead of a tutorial.
  const [introOpen, setIntroOpen] = useState(!!level.master);
  // Authored trials carry their own ladder of hints; every other level keeps
  // the two-step tutor (a way of thinking, then the level's own nudge).
  const hints = useMemo(
    () => level.hints ?? [firstNudge(level), level.hint],
    [level],
  );
  const [celebrated, setCelebrated] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [commentary, setCommentary] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const [audioOn, setAudioOn] = useState(false);
  const [unlocked, setUnlocked] = useState<Achievement[]>([]);
  const undosRef = useRef(0);
  const startedAt = useRef(Date.now());
  const player = usePlayerModel(level.par);
  const [solutionBoard, setSolutionBoard] = useState<Board | null>(null);
  const [hoverCell, setHoverCell] = useState<string | null>(null);
  const [depth, setDepth] = useState<Depth>("beginner");
  const [freshDiscoveries, setFreshDiscoveries] = useState<string[]>([]);
  const [discovered, setDiscovered] = useState<string[]>([]);
  // Director telemetry that the game loop does not already track.
  const [resets, setResets] = useState(0);
  const [solutionRequested, setSolutionRequested] = useState(false);
  const [idleMs, setIdleMs] = useState(0);
  const lastMoveAt = useRef(Date.now());
  const next = nextLevel(levelId);
  const rm = prefs.reduceMotion;

  useEffect(() => {
    setPrefs(loadPrefs());
    setDepth(loadDepth());
    setDiscovered(loadDiscovered());
  }, []);

  // Idle clock — coarse on purpose: the director only needs tens of seconds,
  // and a slow tick keeps this off the interaction path.
  useEffect(() => {
    lastMoveAt.current = Date.now();
    setIdleMs(0);
    if (game.result.solved) return;
    const id = window.setInterval(() => setIdleMs(Date.now() - lastMoveAt.current), 5_000);
    return () => window.clearInterval(id);
  }, [game.moves, game.result.solved]);

  useAdaptiveAudio(game.result, game.litKeys.length, audioOn);


  /**
   * "What if?" — trace the board the hovered move *would* produce and show it
   * as a ghost. Curiosity is free: nothing is committed, nothing is spent.
   */
  const ghost = useMemo(() => {
    if (!hoverCell || game.result.solved) return null;
    const [x, y] = hoverCell.split(",").map(Number) as [number, number];
    const board = previewMove(game.board, x, y, game.selectedTrayId);
    if (!board) return null;
    const res = trace(board);
    const delta = res.solvedCount - game.result.solvedCount;
    return {
      segments: res.segments,
      delta,
      verdict:
        delta > 0
          ? `This move lights ${delta} more target${delta > 1 ? "s" : ""}.`
          : delta < 0
            ? `This move would unlight ${-delta} target${delta < -1 ? "s" : ""}.`
            : "Same targets lit — but the light takes a different road.",
    };
  }, [hoverCell, game.board, game.selectedTrayId, game.result.solved, game.result.solvedCount]);

  // Discovery layer: the engine reports what genuinely happened in the trace,
  // and only unseen phenomena unlock a card.
  useEffect(() => {
    // Discoveries are earned, never granted: nothing unlocks from the board a
    // level ships with — the player has to have changed something.
    if (game.moves === 0) return;
    const fresh = recordDiscoveries(detect(game.result, game.board));
    if (fresh.length) {
      setFreshDiscoveries((prev) => [...prev, ...fresh]);
      setDiscovered((prev) => [...prev, ...fresh]);
    }
  }, [game.result, game.board, game.moves]);


  // The model commits to a prediction before the attempt, so the calibration
  // ledger compares a real forecast against a real outcome.
  const forecast = useMemo(() => predict(level.board), [level.board]);


  // PhotonMind observes the move stream locally; nothing leaves the device.
  const lastRecorded = useRef(0);
  useEffect(() => {
    if (game.moves === lastRecorded.current || !game.lastTouched) return;
    lastRecorded.current = game.moves;
    player.record(game.lastTouched, game.result.solvedCount);
  }, [game.moves, game.lastTouched, game.result.solvedCount, player]);

  // Solve the level once, off the paint path, so the coach can reason about
  // which cells actually matter without ever showing the answer.
  useEffect(() => {
    let cancelled = false;
    setSolutionBoard(null);
    const t = window.setTimeout(() => {
      const a = analyse(level.board);
      if (!cancelled) setSolutionBoard(a.solutionBoard);
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [level]);

  // Stop the audio graph when the player leaves the puzzle.
  useEffect(() => () => void setAudioEnabled(false), []);

  const mixedLit = useMemo(
    () =>
      game.litKeys.filter((k) => {
        const c = game.board.cells[k]?.color ?? 7;
        return (c & 1) + ((c >> 1) & 1) + ((c >> 2) & 1) > 1;
      }).length,
    [game.litKeys, game.board],
  );

  useEffect(() => {
    if (game.result.solved && !celebrated) {
      setCelebrated(true);
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      const progress = recordSolve(level.id, game.moves);
      const perfect = Object.entries(progress).filter(([, m]) => m <= level.par).length;
      setUnlocked(
        evaluate({
          levelId: level.id,
          moves: game.moves,
          par: level.par,
          seconds,
          undos: undosRef.current,
          hintsUsed: hintLevel,
          mixedTargets: mixedLit,
          splits: game.result.events.filter((e) => e.kind === "split" || e.kind === "disperse")
            .length,
          reflections: game.result.events.filter((e) => e.kind === "reflect").length,
          totalSolved: Object.keys(progress).length,
          perfectSolves: perfect,
        }),
      );

      // Forecast vs reality — the row that keeps the model honest.
      const emitters: string[] = [];
      const targets: string[] = [];
      for (const [k, p] of Object.entries(level.board.cells)) {
        if (p.kind === "emitter") emitters.push(k);
        if (p.kind === "target") targets.push(k);
      }
      recordSolveRow({
        levelId: level.id,
        predictedDifficulty: forecast.difficulty,
        predictedSeconds: forecast.solveSeconds,
        modelConfidence: forecast.confidence,
        seconds,
        moves: game.moves,
        par: level.par,
        undos: undosRef.current,
        hints: hintLevel,
        forwardBias: forwardBiasOf(player.touchedCells, emitters, targets),
      });
    }
  }, [game.result, game.moves, level, celebrated, hintLevel, mixedLit, forecast, player.touchedCells]);


  const restart = useCallback(() => {
    game.reset();
    undosRef.current = 0;
    startedAt.current = Date.now();
    setUnlocked([]);
    setHintLevel(0);
    lastRecorded.current = 0;
    player.clear();
    setCelebrated(false);
    setNudgeDismissed(false);
    setResets((r) => r + 1);
    setSolutionRequested(false);
  }, [game, player]);


  // Keyboard shortcuts — desktop players never have to reach for the mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA"].includes(el.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === "u") {
        undosRef.current += 1;
        game.undo();
      }
      else if (k === "r") restart();
      else if (k === "h") setHintLevel((h) => Math.min(h + 1, hints.length));
      else if (k === "escape") setShowTeach(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, restart, hints.length]);

  const togglePref = (k: "colorblind" | "reduceMotion") => {
    const updated = { ...prefs, [k]: !prefs[k] };
    setPrefs(updated);
    savePrefs(updated);
  };

  const { solvedCount, targetCount, solved } = game.result;
  const misrouted = game.misroutedKeys.length;
  const stars = Math.max(0, 3 - Math.max(0, game.moves - level.par));
  const progress = targetCount ? solvedCount / targetCount : 0;

  /**
   * The Game Director. Pure, cheap, and recomputed only from telemetry the
   * game already holds — it never runs the solver on the interaction path.
   */
  const decision = useMemo(
    () =>
      direct({
        moves: game.moves,
        par: level.par,
        undos: undosRef.current,
        resets,
        idleMs,
        hintsRequested: hintLevel,
        solutionRequested,
        solvedCount,
        targetCount,
        misrouted,
        behaviour: player.behaviour,
        solution: solutionBoard,
        board: game.board,
      }),
    [
      game.moves,
      game.board,
      level.par,
      resets,
      idleMs,
      hintLevel,
      solutionRequested,
      solvedCount,
      targetCount,
      misrouted,
      player.behaviour,
      solutionBoard,
    ],
  );

  /**
   * Failure feedback separates *path*, *colour* and *nothing arriving*, so a
   * wrong attempt teaches which kind of mistake it was without explaining the
   * puzzle away.
   */
  const status = solved
    ? { tone: "good" as const, text: "Every target is burning the right colour." }
    : misrouted
      ? {
          tone: "bad" as const,
          text:
            misrouted === 1
              ? "Path is valid — channel is wrong. One target receives light but rejects the mix."
              : `Path is valid — channel is wrong. ${misrouted} targets receive light but reject the mix.`,
        }
      : solvedCount
        ? {
            tone: "mid" as const,
            text: `${solvedCount} of ${targetCount} accepted. The rest receive nothing yet — that is a path problem.`,
          }
        : {
            tone: "mid" as const,
            text: "No light is landing yet. Follow the beam and find the first turn.",
          };



  const fade = rm
    ? { initial: false as const, animate: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: "easeOut" as const },
      };

  const toggleAudio = () => {
    const on = !audioOn;
    setAudioOn(on);
    void setAudioEnabled(on);
  };

  const statusTone =
    status.tone === "bad"
      ? "text-destructive"
      : status.tone === "good"
        ? "text-primary"
        : "text-muted-foreground";

  return (
    <main
      className={cn(
        "chamber grain relative flex min-h-dvh flex-col overflow-x-hidden px-4 sm:px-6 bench:h-dvh bench:overflow-hidden",
        rm && "reduce-motion",
      )}
    >
      <AmbientBackdrop density={10} />

      {/* Instrument header. Nothing is a pill: readouts are etched into the
          bench and separated by hairlines, the way a real optical rig labels
          its channels. */}
      <motion.header
        {...fade}
        className="relative z-10 mx-auto grid w-full max-w-[76rem] shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pt-4 pb-3 sm:gap-5"
      >
        <Link
          to="/play"
          aria-label="Back to puzzle list"
          className="optic-control grid h-10 w-10 shrink-0 place-items-center"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>

        <div className="min-w-0">
          <span className="etch block truncate">
            Ch {level.chapter} · {level.index}
            {level.tier ? ` · ${level.tier}` : ""}
            {level.concept ? (
              <span className="text-primary/85"> · {level.concept}</span>
            ) : null}
          </span>
          <h1 className="mt-1.5 truncate font-display text-lg leading-none font-extrabold sm:text-xl">
            {level.name}
          </h1>
        </div>

        <div className="flex shrink-0 items-stretch gap-3.5 sm:gap-5">
          <Readout
            label="Moves"
            alert={game.overPar}
            value={
              <motion.span
                key={game.moves}
                initial={rm ? false : { scale: 0.82, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="inline-block"
              >
                {game.moves}
                <span className="text-muted-foreground"> / {level.par}</span>
              </motion.span>
            }
          />
          <span
            className="w-px self-stretch bg-[var(--hairline)]"
            aria-hidden="true"
          />
          <Readout label="Targets lit" value={`${solvedCount} / ${targetCount}`} />
        </div>
      </motion.header>

      {/* Progress is never a bar in a track — it is light travelling a fibre. */}
      <Fibre
        value={progress}
        reduceMotion={rm}
        className="relative z-10 mx-auto w-full max-w-[76rem] shrink-0"
      />

      <div className="relative z-10 mx-auto grid min-h-0 w-full max-w-[76rem] flex-1 grid-cols-1 gap-x-7 gap-y-6 py-4 bench:my-auto bench:max-h-[54rem] bench:grid-cols-[minmax(0,1fr)_17.5rem]">
        {/* The board owns every spare pixel of the chamber: it grows into tall
            viewports instead of floating in dead air. */}
        <motion.div {...fade} className="flex min-h-0 min-w-0 flex-col gap-3">
          <div className="grid min-h-0 flex-1 place-items-center">
            <div className="board-frame">
              <PrismBoard
                board={game.board}
                result={game.result}
                onActivate={game.activate}
                colorblind={prefs.colorblind}
                placing={!!game.selectedTrayId}
                reduceMotion={rm}
                litKeys={game.litKeys}
                misroutedKeys={game.misroutedKeys}
                lastTouched={game.lastTouched}
                onInspectCell={setHoverCell}
                ghostSegments={ghost?.segments ?? null}
                ghostCell={ghost ? hoverCell : null}
              />
            </div>
          </div>

          {/* Live status. The game always says what is wrong — expressed as a
              signal lamp on the bench, not as an alert card. */}
          <div
            aria-live="polite"
            className="bench-top flex shrink-0 items-start gap-2.5 pt-3 text-[0.8125rem]"
          >
            <span
              className={cn(
                "mt-[0.3rem] h-2 w-2 shrink-0 rounded-full bg-current",
                statusTone,
                status.tone === "bad" && "animate-shake",
                status.tone === "good" && !rm && "lens-breathe",
              )}
              style={{ boxShadow: "0 0 12px 0 currentColor" }}
              aria-hidden="true"
            />
            <p className="min-w-0 flex-1 leading-snug text-pretty">
              {ghost ? (
                <>
                  <span className="etch mr-1.5 text-accent">What if</span>
                  {ghost.verdict}
                </>
              ) : (
                status.text
              )}
            </p>
          </div>

          {game.board.tray.length > 0 && (
            <div className="bench-top shrink-0 pt-3">
              <Etch>Tray — select, then place</Etch>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                <AnimatePresence initial={false}>
                  {game.board.tray.map((piece) => {
                    const active = game.selectedTrayId === piece.id;
                    return (
                      <motion.li
                        key={piece.id}
                        layout={!rm}
                        initial={rm ? false : { opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 420, damping: 28 }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            game.setSelectedTrayId(active ? null : piece.id)
                          }
                          aria-pressed={active}
                          className={cn(
                            "optic-control inline-flex min-h-10 items-center gap-2 px-3.5 text-[0.8125rem] active:scale-[0.97]",
                            active && "optic-control-live",
                          )}
                        >
                          {piece.kind === "filter" && (
                            <span aria-hidden="true">{colorGlyph(piece.color ?? 7)}</span>
                          )}
                          {trayLabel(piece)}
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </div>
          )}
        </motion.div>

        {/* The instrument rail. One machined surface divided by hairlines —
            deliberately not a column of cards. */}
        <motion.aside
          {...fade}
          className="grid min-h-0 gap-x-9 gap-y-4 sm:grid-cols-2 bench:flex bench:flex-col bench:gap-3.5 bench:overflow-y-auto bench:border-l bench:border-[var(--hairline)] bench:pl-6"
        >
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                undosRef.current += 1;
                game.undo();
              }}
              disabled={!game.canUndo}
              className="optic-control inline-flex min-h-10 items-center justify-center gap-2 px-3 text-[0.8125rem] active:scale-[0.97]"
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> Undo
            </button>
            <button
              type="button"
              onClick={restart}
              className="optic-control inline-flex min-h-10 items-center justify-center gap-2 px-3 text-[0.8125rem] active:scale-[0.97]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
            </button>
          </div>

          <button
            type="button"
            onClick={() => setHintLevel((h) => Math.min(h + 1, hints.length))}
            disabled={hintLevel >= hints.length}
            className={cn(
              "optic-control inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 text-[0.8125rem] font-medium active:scale-[0.97]",
              hintLevel > 0 && hintLevel < hints.length && "optic-control-live",
            )}
          >
            <Lightbulb className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            {hintLevel === 0
              ? "Stuck? Get a nudge"
              : hintLevel >= hints.length
                ? "That's every hint"
                : "Tell me more"}
          </button>

          <AnimatePresence initial={false}>
            {hintLevel > 0 && (
              <motion.div
                key={hintLevel}
                initial={rm ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: rm ? 0 : 0.3, ease: "easeOut" }}
                className="overflow-hidden"
                aria-live="polite"
              >
                <div className="bench-top pt-3">
                  <Etch tone="accent">Tutor</Etch>
                  <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                    {hints[hintLevel - 1]}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <LawsRail discovered={discovered} reduceMotion={rm} />

          {!game.result.solved && (
            <DirectorPanel
              decision={decision}
              reduceMotion={rm}
              onRequestSolution={() => setSolutionRequested(true)}
            />
          )}

          <AnimatePresence initial={false}>
            {(hintLevel > 0 || game.struggling) && !game.result.solved && (
              <motion.div
                key="coach"
                initial={rm ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: rm ? 0 : 0.3, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <CoachPanel
                  board={game.board}
                  solution={solutionBoard}
                  behaviour={player.behaviour}
                  par={level.par}
                  moves={game.moves}
                  reduceMotion={rm}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Everything below is secondary: one tab-stop away, never competing
              with the board for attention. */}
          <div className="bench-top">
            <button
              type="button"
              onClick={() => setOptionsOpen((o) => !o)}
              aria-expanded={optionsOpen}
              aria-controls="play-options"
              className="inline-flex min-h-10 w-full items-center justify-between gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="inline-flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                <Etch>Options</Etch>
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  optionsOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence initial={false}>
              {optionsOpen && (
                <motion.div
                  id="play-options"
                  key="options"
                  initial={rm ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: rm ? 0 : 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 pt-1 pb-3">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={toggleAudio}
                        aria-pressed={audioOn}
                        className={cn(
                          "optic-control inline-flex min-h-10 items-center justify-center gap-1.5 px-2 text-[0.6875rem]",
                          audioOn && "optic-control-live",
                        )}
                      >
                        {audioOn ? (
                          <Volume2 className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                        ) : (
                          <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        Score
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommentary((c) => !c)}
                        aria-pressed={commentary}
                        className={cn(
                          "optic-control inline-flex min-h-10 items-center justify-center gap-1.5 px-2 text-[0.6875rem]",
                          commentary && "optic-control-live",
                        )}
                      >
                        <Radio
                          className={cn("h-3.5 w-3.5", commentary && "text-accent")}
                          aria-hidden="true"
                        />
                        Commentary
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePref("colorblind")}
                      aria-pressed={prefs.colorblind}
                      className={cn(
                        "optic-control inline-flex min-h-10 w-full items-center justify-center gap-2 px-3 text-[0.6875rem]",
                        prefs.colorblind && "optic-control-live",
                      )}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      Colourblind labels {prefs.colorblind ? "on" : "off"}
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePref("reduceMotion")}
                      aria-pressed={prefs.reduceMotion}
                      className={cn(
                        "optic-control inline-flex min-h-10 w-full items-center justify-center px-3 text-[0.6875rem]",
                        prefs.reduceMotion && "optic-control-live",
                      )}
                    >
                      Reduced motion {prefs.reduceMotion ? "on" : "off"}
                    </button>
                    <p className="pt-1 text-[0.6875rem] leading-relaxed text-muted-foreground">
                      Hover or tab across any cell to preview a move before you spend
                      it. <kbd>U</kbd> undo · <kbd>R</kbd> reset · <kbd>H</kbd> hint
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence initial={false}>
            {commentary && (
              <motion.div
                key="commentary"
                initial={rm ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: rm ? 0 : 0.28, ease: "easeOut" }}
                className="space-y-3 overflow-hidden"
              >
                <CommentaryPanel result={game.result} reduceMotion={rm} limit={10} />
                <SolveTimeline timeline={game.timeline} reduceMotion={rm} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>
      </div>

      {/* Teaching card for new mechanics */}
      <AnimatePresence>
        {showTeach && level.teaches && !solved && (
          <motion.div
            initial={rm ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-20 px-4 pb-5"
          >
            <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-primary/40 bg-surface p-4 shadow-lg backdrop-blur">
              <p className="min-w-0 flex-1 text-sm">{level.teaches}</p>
              <button
                type="button"
                onClick={() => setShowTeach(false)}
                className="min-h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
              >
                Got it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Soft failure state: nobody loses, the game just offers a hand. */}
      <AnimatePresence>
        {game.struggling && !nudgeDismissed && hintLevel === 0 && !showTeach && (
          <motion.div
            initial={rm ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-20 px-4 pb-5"
          >
            <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-accent/40 bg-surface p-4 shadow-lg backdrop-blur">
              <Lightbulb className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-sm">
                This one is a knot. Want a nudge from the tutor?
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setHintLevel(1)}
                  className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-transform active:scale-95"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setNudgeDismissed(true)}
                  className="min-h-11 rounded-xl border border-border px-3 text-sm transition-colors hover:bg-surface-2"
                >
                  No
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MasterIntro open={introOpen} onDone={() => setIntroOpen(false)} reduceMotion={rm} />

      <AchievementToast unlocked={unlocked} reduceMotion={rm} />

      <DiscoveryToast
        ids={freshDiscoveries}
        depth={depth}
        reduceMotion={rm}
        onDepthChange={(d) => {
          setDepth(d);
          saveDepth(d);
        }}
      />

      {/* Cinematic victory: bloom, particles, star rating and instant replay */}
      <CinematicSolve
        open={solved}
        title={level.name}
        moves={game.moves}
        par={level.par}
        stars={stars}
        frames={game.timeline}
        colorblind={prefs.colorblind}
        reduceMotion={rm}
        lesson={getLesson(level.id)}
        actions={
          <>
            {level.reveal ? (
              <PrincipleReveal reveal={level.reveal} reduceMotion={rm} />
            ) : null}
            {next ? (
              <button
                type="button"
                onClick={() => navigate({ to: "/play/$levelId", params: { levelId: next.id } })}
                className={cn(
                  "min-h-11 w-full rounded-full bg-primary px-6 font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.02] active:scale-95",
                  !rm && "sheen",
                )}
              >
                Next puzzle: {next.name}
              </button>
            ) : (
              <Link
                to="/play"
                className="min-h-11 w-full rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
              >
                You finished every puzzle
              </Link>
            )}
            <button
              type="button"
              onClick={restart}
              className="min-h-11 w-full rounded-full border border-border px-6 text-sm transition-colors hover:bg-surface-2"
            >
              {game.overPar ? "Retry for par" : "Replay this puzzle"}
            </button>
            <Link
              to="/play"
              className="min-h-11 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to all puzzles
            </Link>
          </>
        }
      />
    </main>
  );
}
