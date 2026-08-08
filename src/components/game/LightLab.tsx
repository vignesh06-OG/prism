import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { BeamInspector } from "@/components/game/BeamInspector";
import { CommentaryPanel } from "@/components/game/CommentaryPanel";
import { LabControls } from "@/components/game/LabControls";
import { PrismBoard } from "@/components/game/PrismBoard";
import { colorGlyph, trace } from "@/game/engine";
import { loadPrefs } from "@/game/progress";
import { key, DEFAULT_SIM, type ColorMask, type PieceKind, type Segment, type SimParams } from "@/game/types";
import { emptyBoard, useEditor } from "@/game/useEditor";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const TOOLS: { kind: PieceKind; label: string }[] = [
  { kind: "emitter", label: "Emitter" },
  { kind: "mirror", label: "Mirror" },
  { kind: "splitter", label: "Splitter" },
  { kind: "prism", label: "Prism" },
  { kind: "filter", label: "Filter" },
  { kind: "glass", label: "Glass" },
  { kind: "crystal", label: "Crystal" },
  { kind: "water", label: "Water" },
  { kind: "fog", label: "Fog" },
  { kind: "target", label: "Target" },
  { kind: "wall", label: "Wall" },
];

const COLORS: ColorMask[] = [1, 2, 4, 3, 5, 6, 7];

/** Preset bench: one emitter and a run of materials to look through. */
function bench() {
  const b = emptyBoard(9, 7);
  b.cells[key(0, 3)] = { id: "lab-e", kind: "emitter", rot: 1, color: 7, fixed: true };
  b.cells[key(3, 3)] = { id: "lab-g", kind: "glass", rot: 0, color: 7 };
  b.cells[key(5, 3)] = { id: "lab-c", kind: "crystal", rot: 0, color: 7 };
  return b;
}

export default function LightLab() {
  const editor = useEditor(bench());
  const [params, setParams] = useState<SimParams>({ ...DEFAULT_SIM, attenuation: 0.03 });
  const [prefs, setPrefs] = useState({ colorblind: false, reduceMotion: false, highContrast: false });
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => setPrefs(loadPrefs()), []);

  const { board } = editor;
  const result = useMemo(() => trace(board, params), [board, params]);

  const inspected: Segment | null = useMemo(() => {
    if (!hovered) return null;
    const [hx, hy] = hovered.split(",").map(Number);
    const touching = result.segments.filter(
      (s) => (s.x1 === hx && s.y1 === hy) || (s.x2 === hx && s.y2 === hy),
    );
    if (!touching.length) return null;
    return touching.reduce((best, s) =>
      (s.meta?.intensity ?? 0) > (best.meta?.intensity ?? 0) ? s : best,
    );
  }, [hovered, result]);

  const totalEnergy = result.segments.reduce((sum, s) => sum + (s.meta?.intensity ?? 0), 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {TOOLS.map((t) => (
            <motion.button
              key={t.kind}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => editor.setTool({ ...editor.tool, kind: t.kind })}
              aria-pressed={editor.tool.kind === t.kind}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                editor.tool.kind === t.kind
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </motion.button>
          ))}
          <span className="mx-1 w-px self-stretch bg-border" aria-hidden="true" />
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => editor.setTool({ ...editor.tool, color: c })}
              aria-pressed={editor.tool.color === c}
              aria-label={`Colour ${c}`}
              className={cn(
                "h-8 w-8 rounded-full border text-xs",
                editor.tool.color === c ? "border-foreground" : "border-border",
              )}
              style={{ color: `var(--beam-${["", "red", "green", "yellow", "blue", "magenta", "cyan", "white"][c]})` }}
            >
              {colorGlyph(c)}
            </button>
          ))}
        </div>

        <PrismBoard
          board={board}
          result={result}
          onActivate={(x, y) => {
            const k = key(x, y);
            if (board.cells[k]) editor.rotateAt(k);
            else editor.paint(x, y);
          }}
          onSecondary={(x, y) => editor.deleteAt(key(x, y))}
          onInspectCell={setHovered}
          onDropCell={editor.movePiece}
          colorblind={prefs.colorblind}
          reduceMotion={prefs.reduceMotion}
          placing
          interactiveAll
          selectedCell={editor.selected}
        />

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>
            Beam edges <strong className="text-foreground">{result.segments.length}</strong>
          </span>
          <span>
            Energy in flight{" "}
            <strong className="text-foreground">{totalEnergy.toFixed(2)}</strong>
          </span>
          <span>
            Engine decisions <strong className="text-foreground">{result.events.length}</strong>
          </span>
          <span className="ml-auto">Click to place · click again to rotate · right-click to remove</span>
        </div>
      </div>

      <aside className="space-y-4">
        <LabControls params={params} onChange={setParams} />
        <BeamInspector segment={inspected} />
        <CommentaryPanel result={result} reduceMotion={prefs.reduceMotion} limit={10} />
      </aside>
    </div>
  );
}
