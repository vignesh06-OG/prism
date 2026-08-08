import { motion } from "motion/react";
import {
  Check,
  ClipboardPaste,
  Copy,
  Eraser,
  Redo2,
  RotateCw,
  ShieldCheck,
  Trash2,
  Undo2,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BeamInspector } from "@/components/game/BeamInspector";
import { PrismBoard } from "@/components/game/PrismBoard";
import { GenomePanel } from "@/components/game/GenomePanel";
import { ValidationModal } from "@/components/game/ValidationModal";
import { evolvePuzzles } from "@/game/evolve";
import { analyse, type Analysis } from "@/game/analysis";
import { colorGlyph, colorName, colorVar } from "@/game/engine";
import { loadPrefs } from "@/game/progress";
import { decodeBoard, encodeBoard } from "@/game/share";
import type { ColorMask, PieceKind, Segment } from "@/game/types";
import { key } from "@/game/types";
import { emptyBoard, useEditor } from "@/game/useEditor";
import { cn } from "@/lib/utils";

const TOOLS: { kind: PieceKind; label: string; hint: string }[] = [
  { kind: "emitter", label: "Emitter", hint: "Fires light. Click it again to re-aim." },
  { kind: "target", label: "Target", hint: "Needs the exact colour shown." },
  { kind: "mirror", label: "Mirror", hint: "Reflects 90°." },
  { kind: "splitter", label: "Splitter", hint: "Passes and reflects at once." },
  { kind: "prism", label: "Prism", hint: "Separates white light into R/G/B." },
  { kind: "filter", label: "Filter", hint: "Only lets its own channels through." },
  { kind: "wall", label: "Wall", hint: "Blocks everything." },
  { kind: "glass", label: "Glass", hint: "Passes light through, dimming it slightly." },
  { kind: "crystal", label: "Crystal", hint: "Passes light and sheds rainbow caustics." },
  { kind: "water", label: "Water", hint: "Absorbs red, tinting the beam cyan." },
  { kind: "fog", label: "Fog", hint: "Scatters light sideways and halves its energy." },
];

const COLORS: ColorMask[] = [1, 2, 4, 3, 5, 6, 7];

interface Props {
  mode: "studio" | "sandbox";
}

export default function StudioEditor({ mode }: Props) {
  const editor = useEditor(emptyBoard(mode === "sandbox" ? 8 : 7, mode === "sandbox" ? 8 : 7));
  const [prefs, setPrefs] = useState({
    colorblind: false,
    reduceMotion: false,
    highContrast: false,
  });
  const [hovered, setHovered] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [validating, setValidating] = useState(false);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [evolving, setEvolving] = useState(false);
  const [evolveNote, setEvolveNote] = useState<string | null>(null);

  useEffect(() => setPrefs(loadPrefs()), []);
  const rm = prefs.reduceMotion;

  const { board, result } = editor;

  const inspected: Segment | null = useMemo(() => {
    if (!hovered) return null;
    const [hx, hy] = hovered.split(",").map(Number);
    const touching = result.segments.filter(
      (s) =>
        (s.x1 === hx && s.y1 === hy) || (s.x2 === hx && s.y2 === hy),
    );
    if (!touching.length) return null;
    return touching.reduce((best, s) =>
      (s.meta?.intensity ?? 0) > (best.meta?.intensity ?? 0) ? s : best,
    );
  }, [hovered, result]);

  const validate = useCallback(() => {
    setValidating(true);
    setAnalysis(null);
    // Yield a frame so the modal paints before the search blocks the thread.
    window.setTimeout(() => {
      const report = analyse(board);
      setAnalysis(report);
      setValidating(false);
    }, 40);
  }, [board]);

  const shareCode = useMemo(() => encodeBoard(board), [board]);

  /** Deterministic generate → validate → score → keep loop, seeded per run. */
  const evolve = useCallback(() => {
    setEvolving(true);
    setEvolveNote(null);
    window.setTimeout(() => {
      const seed = Math.floor(Math.random() * 1e6);
      const { kept, tested, rejected } = evolvePuzzles({
        seed,
        width: board.width,
        height: board.height,
      });
      const best = kept[0];
      if (best) {
        editor.load(best.board);
        setEvolveNote(
          `Kept ${kept.length} of ${tested} candidates (${rejected} rejected). Loaded fitness ${best.fitness}, ${best.analysis.minMoves} moves, ${best.analysis.rating}.`,
        );
      } else {
        setEvolveNote(`All ${tested} candidates failed validation. Try again for a new seed.`);
      }
      setEvolving(false);
    }, 40);
  }, [board.width, board.height, editor]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const importCode = () => {
    const decoded = decodeBoard(code);
    if (!decoded) {
      setImportError("That code isn't a valid Prism puzzle.");
      return;
    }
    setImportError(null);
    editor.load(decoded);
    setCode("");
  };

  const selectedPiece = editor.selected ? board.cells[editor.selected] : undefined;

  // Keyboard: R rotates, Delete removes, Ctrl+Z / Ctrl+Shift+Z history.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA"].includes(el.tagName)) return;
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "z") {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (!editor.selected) return;
      if (k === "r") editor.rotateAt(editor.selected);
      else if (k === "delete" || k === "backspace") editor.deleteAt(editor.selected);
      else if (k === "escape") editor.select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor]);

  return (
    <div
      className={cn(
        "grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]",
        rm && "reduce-motion",
      )}
    >
      <motion.div
        initial={rm ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="min-w-0"
      >
        <PrismBoard
          board={board}
          result={result}
          onActivate={(x, y) => {
            const k = key(x, y);
            if (board.cells[k]) {
              if (editor.selected === k) editor.rotateAt(k);
              else editor.select(k);
            } else {
              editor.paint(x, y);
            }
          }}
          onSecondary={(x, y) => editor.deleteAt(key(x, y))}
          onDropCell={(from, to) => editor.movePiece(from, to)}
          onInspectCell={setHovered}
          selectedCell={editor.selected}
          colorblind={prefs.colorblind}
          placing={false}
          interactiveAll
          reduceMotion={rm}
        />

        <p className="mt-3 text-xs text-muted-foreground">
          Click an empty cell to place · click a piece to select · click again or press{" "}
          <kbd>R</kbd> to rotate · drag to move · right-click or <kbd>Del</kbd> to remove
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <BeamInspector
            segment={inspected}
            {...(hovered ? { cellLabel: `Cell (${hovered})` } : {})}
          />

          <div className="rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur">
            <p className="font-display text-xs tracking-widest text-muted-foreground uppercase">
              Selection
            </p>
            {selectedPiece ? (
              <>
                <p className="mt-2 text-sm font-semibold">
                  {colorName(selectedPiece.color ?? 7)} {selectedPiece.kind}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => editor.rotateAt(editor.selected!)}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 text-sm transition-transform active:scale-95"
                  >
                    <RotateCw className="h-4 w-4" aria-hidden="true" /> Rotate
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.deleteAt(editor.selected!)}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 text-sm transition-transform active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Nothing selected. Pick a piece on the board to rotate or delete it.
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {result.targetCount
                ? `${result.solvedCount}/${result.targetCount} targets lit · ${result.segments.length} beam edges`
                : `${result.segments.length} beam edges live`}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.aside
        initial={rm ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
        className="space-y-4"
      >
        <div className="rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur">
          <p className="font-display text-xs tracking-widest text-muted-foreground uppercase">
            Palette
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {TOOLS.map((t) => {
              const active = editor.tool.kind === t.kind;
              return (
                <li key={t.kind}>
                  <button
                    type="button"
                    onClick={() => editor.setTool({ ...editor.tool, kind: t.kind, rot: 0 })}
                    aria-pressed={active}
                    title={t.hint}
                    className={cn(
                      "min-h-11 w-full rounded-xl border px-3 text-sm font-medium transition-all duration-200 active:scale-95",
                      active
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-surface-2 hover:-translate-y-0.5 hover:border-primary/50",
                    )}
                  >
                    {t.label}
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 font-display text-xs tracking-widest text-muted-foreground uppercase">
            Colour
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {COLORS.map((c) => {
              const active = editor.tool.color === c;
              return (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => editor.setTool({ ...editor.tool, color: c })}
                    aria-pressed={active}
                    aria-label={colorName(c)}
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-xl border text-sm transition-transform active:scale-90",
                      active ? "border-primary" : "border-border",
                    )}
                    style={{ background: `color-mix(in oklab, ${colorVar(c)} 20%, transparent)` }}
                  >
                    <span style={{ color: colorVar(c) }} aria-hidden="true">
                      {colorGlyph(c)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 font-display text-xs tracking-widest text-muted-foreground uppercase">
            Board size
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Width</span>
              <input
                type="number"
                min={3}
                max={12}
                value={board.width}
                onChange={(e) => editor.resize(Number(e.target.value), board.height)}
                className="min-h-11 w-full rounded-xl border border-border bg-surface-2 px-3 tabular-nums"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Height</span>
              <input
                type="number"
                min={3}
                max={12}
                value={board.height}
                onChange={(e) => editor.resize(board.width, Number(e.target.value))}
                className="min-h-11 w-full rounded-xl border border-border bg-surface-2 px-3 tabular-nums"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={editor.undo}
              disabled={!editor.canUndo}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 text-sm transition-transform active:scale-95 disabled:opacity-40"
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" /> Undo
            </button>
            <button
              type="button"
              onClick={editor.redo}
              disabled={!editor.canRedo}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 text-sm transition-transform active:scale-95 disabled:opacity-40"
            >
              <Redo2 className="h-4 w-4" aria-hidden="true" /> Redo
            </button>
            <button
              type="button"
              onClick={editor.clear}
              aria-label="Clear board"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface-2 px-3 transition-transform active:scale-95"
            >
              <Eraser className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {mode === "studio" && (
          <button
            type="button"
            onClick={validate}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-primary/50 bg-primary/15 px-4 font-semibold text-foreground transition-all duration-200 hover:bg-primary/25 active:scale-95"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            Validate puzzle
          </button>
        )}

        {mode === "studio" && (
          <div className="rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur">
            <p className="font-display text-xs tracking-widest text-muted-foreground uppercase">
              Puzzle evolution
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Grows candidate boards, validates each with the solver and keeps only the fittest.
            </p>
            <button
              type="button"
              onClick={evolve}
              disabled={evolving}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 text-sm font-medium transition-all duration-200 hover:bg-accent/20 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
              {evolving ? "Evolving…" : "Evolve a puzzle"}
            </button>
            {evolveNote && (
              <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                {evolveNote}
              </p>
            )}
          </div>
        )}

        <GenomePanel board={board} reduceMotion={rm} />

        <div className="rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur">
          <p className="font-display text-xs tracking-widest text-muted-foreground uppercase">
            Share code
          </p>
          <p className="mt-2 font-mono text-xs break-all text-foreground/90">{shareCode}</p>
          <button
            type="button"
            onClick={copyCode}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 text-sm transition-transform active:scale-95"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-beam-green" aria-hidden="true" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" /> Copy code
              </>
            )}
          </button>

          <label className="mt-4 block space-y-1">
            <span className="text-xs text-muted-foreground">Import a code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="PRISM-XXXX-XXXX-XXXX"
              className="min-h-11 w-full rounded-xl border border-border bg-surface-2 px-3 font-mono text-xs"
            />
          </label>
          <button
            type="button"
            onClick={importCode}
            disabled={!code.trim()}
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 text-sm transition-transform active:scale-95 disabled:opacity-40"
          >
            <ClipboardPaste className="h-4 w-4" aria-hidden="true" /> Import
          </button>
          {importError && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {importError}
            </p>
          )}
        </div>
      </motion.aside>

      <ValidationModal
        analysis={analysis}
        running={validating}
        reduceMotion={rm}
        onClose={() => {
          setAnalysis(null);
          setValidating(false);
        }}
      />
    </div>
  );
}
