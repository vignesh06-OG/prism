import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Eye,
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
import { AchievementToast } from "@/components/game/AchievementToast";
import { AmbientBackdrop } from "@/components/game/AmbientBackdrop";
import { CinematicSolve } from "@/components/game/CinematicSolve";
import { CommentaryPanel } from "@/components/game/CommentaryPanel";
import { PrismBoard } from "@/components/game/PrismBoard";
import { CoachPanel } from "@/components/photonmind/CoachPanel";
import { SolveTimeline } from "@/components/game/SolveTimeline";
import { evaluate, type Achievement } from "@/game/achievements";
import { setAudioEnabled } from "@/game/audio";
import { useAdaptiveAudio } from "@/game/useAdaptiveAudio";
import { colorGlyph, colorName } from "@/game/engine";
import { getLevel, nextLevel } from "@/game/levels";
import { loadPrefs, recordSolve, savePrefs } from "@/game/progress";
import { useGame } from "@/game/useGame";
import { usePlayerModel } from "@/game/photonmind/usePlayerModel";
import { analyse } from "@/game/analysis";
import type { Board } from "@/game/types";
import type { Piece } from "@/game/types";
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
  const [celebrated, setCelebrated] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [commentary, setCommentary] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [unlocked, setUnlocked] = useState<Achievement[]>([]);
  const undosRef = useRef(0);
  const startedAt = useRef(Date.now());
  const player = usePlayerModel(level.par);
  const [solutionBoard, setSolutionBoard] = useState<Board | null>(null);
  const next = nextLevel(levelId);
  const rm = prefs.reduceMotion;

  useEffect(() => setPrefs(loadPrefs()), []);

  useAdaptiveAudio(game.result, game.litKeys.length, audioOn);

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
      const progress = recordSolve(level.id, game.moves);
      const perfect = Object.entries(progress).filter(([, m]) => m <= level.par).length;
      setUnlocked(
        evaluate({
          levelId: level.id,
          moves: game.moves,
          par: level.par,
          seconds: Math.round((Date.now() - startedAt.current) / 1000),
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
    }
  }, [game.result, game.moves, level.id, level.par, celebrated, hintLevel, mixedLit]);

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
      else if (k === "h") setHintLevel((h) => Math.min(h + 1, 2));
      else if (k === "escape") setShowTeach(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, restart]);

  const togglePref = (k: "colorblind" | "reduceMotion") => {
    const updated = { ...prefs, [k]: !prefs[k] };
    setPrefs(updated);
    savePrefs(updated);
  };

  const { solvedCount, targetCount, solved } = game.result;
  const misrouted = game.misroutedKeys.length;
  const stars = Math.max(0, 3 - Math.max(0, game.moves - level.par));
  const progress = targetCount ? solvedCount / targetCount : 0;

  const status = solved
    ? { tone: "good" as const, text: "Every target is burning the right colour." }
    : misrouted
      ? {
          tone: "bad" as const,
          text:
            misrouted === 1
              ? "One target is getting the wrong mix of light."
              : `${misrouted} targets are getting the wrong mix of light.`,
        }
      : solvedCount
        ? {
            tone: "mid" as const,
            text: `${solvedCount} of ${targetCount} lit — keep routing.`,
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

  return (
    <main className={cn("min-h-dvh aurora px-4 py-6 sm:px-6", rm && "reduce-motion")}>
      <AmbientBackdrop density={10} />
      <div className="mx-auto max-w-5xl">
        <motion.header
          {...fade}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/play"
              aria-label="Back to puzzle list"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface/70 transition-all duration-200 hover:-translate-x-0.5 hover:bg-surface-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <div className="min-w-0">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Chapter {level.chapter} · {level.index}
              </p>
              <h1 className="truncate text-xl font-extrabold sm:text-2xl">{level.name}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <motion.span
              key={game.moves}
              initial={rm ? false : { scale: 0.8, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className={cn(
                "rounded-full border px-3 py-1.5 tabular-nums transition-colors",
                game.overPar
                  ? "border-accent/50 bg-accent/10 text-foreground"
                  : "border-border bg-surface/70",
              )}
            >
              {game.moves} / par {level.par}
            </motion.span>
            <span className="rounded-full border border-border bg-surface/70 px-3 py-1.5 tabular-nums">
              {solvedCount}/{targetCount} lit
            </span>
          </div>
        </motion.header>

        {/* Target progress rail */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full rounded-full bg-primary"
            style={{ boxShadow: "var(--shadow-glow)" }}
            animate={{ width: `${progress * 100}%` }}
            transition={rm ? { duration: 0 } : { type: "spring", stiffness: 180, damping: 26 }}
          />
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_264px]">
          <motion.div {...fade} className="min-w-0">
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
            />

            {/* Live status — the game always says what is wrong, never just fails. */}
            <div
              aria-live="polite"
              className={cn(
                "mt-4 flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm transition-colors duration-300",
                status.tone === "bad"
                  ? "border-destructive/40 bg-destructive/10 text-foreground"
                  : status.tone === "good"
                    ? "border-primary/40 bg-primary/10"
                    : "border-border bg-surface/60",
              )}
            >
              {status.tone === "bad" ? (
                <TriangleAlert
                  className="h-4 w-4 shrink-0 text-destructive animate-shake"
                  aria-hidden="true"
                />
              ) : (
                <Sparkles
                  className={cn(
                    "h-4 w-4 shrink-0",
                    status.tone === "good" ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
              )}
              <p className="min-w-0">{status.text}</p>
            </div>

            {game.board.tray.length > 0 && (
              <div className="mt-3 rounded-2xl border border-border bg-surface/60 p-3 backdrop-blur">
                <p className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
                  Tray — pick a piece, then tap a cell
                </p>
                <ul className="flex flex-wrap gap-2">
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
                              "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-all duration-200 active:scale-95",
                              active
                                ? "border-primary bg-primary/15 text-foreground shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_18%,transparent)]"
                                : "border-border bg-surface-2 hover:-translate-y-0.5 hover:border-primary/50",
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

          <motion.aside {...fade} className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  undosRef.current += 1;
                  game.undo();
                }}
                disabled={!game.canUndo}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface/70 px-4 text-sm transition-all duration-200 hover:bg-surface-2 active:scale-95 disabled:opacity-40 disabled:active:scale-100"
              >
                <Undo2 className="h-4 w-4" aria-hidden="true" /> Undo
              </button>
              <button
                type="button"
                onClick={restart}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface/70 px-4 text-sm transition-all duration-200 hover:bg-surface-2 active:scale-95"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
              </button>
            </div>

            <button
              type="button"
              onClick={() => setHintLevel((h) => Math.min(h + 1, 2))}
              disabled={hintLevel >= 2}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 text-sm font-medium transition-all duration-200 hover:bg-accent/20 active:scale-95 disabled:opacity-50"
            >
              <Lightbulb className="h-4 w-4 text-accent" aria-hidden="true" />
              {hintLevel === 0
                ? "Stuck? Get a nudge"
                : hintLevel === 1
                  ? "Tell me more"
                  : "That's every hint"}
            </button>

            <AnimatePresence initial={false}>
              {hintLevel > 0 && (
                <motion.div
                  key={hintLevel}
                  initial={rm ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: rm ? 0 : 0.3, ease: "easeOut" }}
                  className="overflow-hidden rounded-2xl border border-accent/30 bg-surface/70 text-sm backdrop-blur"
                  aria-live="polite"
                >
                  <div className="p-4">
                    <p className="font-display text-xs tracking-widest text-accent uppercase">
                      Tutor
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      {hintLevel === 1
                        ? "Read the targets first — each glyph tells you the exact colour it needs."
                        : level.hint}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleAudio}
                aria-pressed={audioOn}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface/70 px-3 text-xs transition-all duration-200 hover:bg-surface-2 active:scale-95"
              >
                {audioOn ? (
                  <Volume2 className="h-4 w-4 text-accent" aria-hidden="true" />
                ) : (
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                )}
                Adaptive score
              </button>
              <button
                type="button"
                onClick={() => setCommentary((c) => !c)}
                aria-pressed={commentary}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface/70 px-3 text-xs transition-all duration-200 hover:bg-surface-2 active:scale-95"
              >
                <Radio className={cn("h-4 w-4", commentary && "text-accent")} aria-hidden="true" />
                Commentary
              </button>
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

            <button
              type="button"
              onClick={() => togglePref("colorblind")}
              aria-pressed={prefs.colorblind}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface/70 px-4 text-sm transition-all duration-200 hover:bg-surface-2 active:scale-95"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              Colourblind labels {prefs.colorblind ? "on" : "off"}
            </button>
            <button
              type="button"
              onClick={() => togglePref("reduceMotion")}
              aria-pressed={prefs.reduceMotion}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-surface/70 px-4 text-sm transition-all duration-200 hover:bg-surface-2 active:scale-95"
            >
              Reduced motion {prefs.reduceMotion ? "on" : "off"}
            </button>

            <p className="hidden pt-1 text-xs text-muted-foreground lg:block">
              Shortcuts: <kbd>U</kbd> undo · <kbd>R</kbd> reset · <kbd>H</kbd> hint
            </p>
          </motion.aside>
        </div>
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

      <AchievementToast unlocked={unlocked} reduceMotion={rm} />

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
        actions={
          <>
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
