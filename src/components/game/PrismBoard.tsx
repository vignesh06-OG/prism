import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import { colorGlyph, colorName, colorVar } from "@/game/engine";
import type { Board, ColorMask, Piece, Segment, TraceResult } from "@/game/types";
import { key } from "@/game/types";
import { cn } from "@/lib/utils";


const C = 100; // cell size in SVG units
const center = (n: number) => n * C + C / 2;

type CellState = "idle" | "lit" | "misrouted";

interface Props {
  board: Board;
  result: TraceResult;
  onActivate: (x: number, y: number) => void;
  colorblind: boolean;
  placing: boolean;
  reduceMotion?: boolean;
  litKeys?: string[];
  misroutedKeys?: string[];
  lastTouched?: string | null;
  hintCell?: string | null;
  /** Editor/sandbox: every cell is clickable, not just placeable ones. */
  interactiveAll?: boolean;
  /** Replay: no interaction at all. */
  readOnly?: boolean;
  /** Cell highlighted by the editor selection. */
  selectedCell?: string | null;
  /** Secondary action (right click / long press) on a cell. */
  onSecondary?: (x: number, y: number) => void;
  /** Fires as the pointer or keyboard focus moves across cells. */
  onInspectCell?: (cellKey: string | null) => void;
  /** Editor: allow pieces (and palette tools) to be dragged between cells. */
  onDropCell?: (from: string, to: string) => void;
  /** "What if?" overlay: the beam field a hovered move *would* produce. */
  ghostSegments?: Segment[] | null;
  /** Cell the ghost preview belongs to. */
  ghostCell?: string | null;
}


const spring = { type: "spring" as const, stiffness: 420, damping: 26, mass: 0.7 };

function PieceShape({
  piece,
  state,
  reduceMotion,
}: {
  piece: Piece;
  state: CellState;
  reduceMotion: boolean;
}) {
  const color = colorVar(piece.color ?? 7);
  const satisfied = state === "lit";
  const wrong = state === "misrouted";
  const t = reduceMotion ? { duration: 0 } : spring;

  switch (piece.kind) {
    case "emitter":
      return (
        <g>
          <rect
            x={-34}
            y={-34}
            width={68}
            height={68}
            rx={16}
            fill="var(--surface-2)"
            stroke={color}
            strokeWidth={3}
          />
          <circle
            cx={0}
            cy={0}
            r={13}
            fill={color}
            filter="url(#glow)"
            className={reduceMotion ? undefined : "emitter-core"}
          />
          <g transform={`rotate(${piece.rot * 90})`}>
            <path d="M 0 -36 L 10 -16 L -10 -16 Z" fill={color} />
          </g>
        </g>
      );

    case "target": {
      const ring = wrong ? "var(--destructive)" : color;
      return (
        <motion.g
          animate={
            wrong && !reduceMotion
              ? { x: [0, -4, 4, -3, 0], rotate: [0, -1.5, 1.5, 0] }
              : { x: 0, rotate: 0 }
          }
          transition={{ duration: 0.45, ease: "easeInOut" }}
        >
          <motion.circle
            cx={0}
            cy={0}
            r={32}
            fill={satisfied ? color : "transparent"}
            stroke={ring}
            initial={{ fillOpacity: 0, strokeWidth: 3, scale: 0.94 }}
            animate={{
              fillOpacity: satisfied ? 0.22 : 0,
              strokeWidth: satisfied ? 5 : 3,
              scale: satisfied ? 1 : 0.94,
            }}
            transition={t}

            strokeDasharray={satisfied ? undefined : "10 8"}
            filter={satisfied ? "url(#glow)" : undefined}
            style={{ transformOrigin: "center", transformBox: "fill-box" }}
          />
          <text
            x={0}
            y={9}
            textAnchor="middle"
            fontSize={26}
            fill={ring}
            opacity={satisfied ? 1 : 0.7}
          >
            {colorGlyph(piece.color ?? 7)}
          </text>
          <AnimatePresence>
            {satisfied && (
              <motion.circle
                key="burst"
                cx={0}
                cy={0}
                r={32}
                fill="none"
                stroke={color}
                strokeWidth={3}
                initial={{ scale: 0.7, opacity: 0.95 }}
                animate={{ scale: reduceMotion ? 1 : 2.1, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.85, ease: "easeOut" }}
                style={{ transformOrigin: "center", transformBox: "fill-box" }}
              />
            )}
          </AnimatePresence>
          {satisfied && (
            <circle
              cx={0}
              cy={0}
              r={32}
              fill="none"
              stroke={color}
              strokeWidth={2}
              className="animate-pulse-ring"
              style={{ transformOrigin: "center", transformBox: "fill-box" }}
            />
          )}
        </motion.g>
      );
    }

    case "mirror":
      return (
        <motion.g
          animate={{ rotate: piece.rot % 2 === 0 ? -45 : 45 }}
          transition={reduceMotion ? { duration: 0 } : { ...spring, stiffness: 300 }}
          style={{ transformOrigin: "center", transformBox: "fill-box" }}
        >
          <rect
            x={-38}
            y={-6}
            width={76}
            height={12}
            rx={6}
            fill="var(--beam-white)"
            opacity={0.92}
            filter="url(#glow)"
          />
          <rect x={-38} y={2} width={76} height={4} rx={2} fill="var(--surface-2)" />
        </motion.g>
      );

    case "splitter":
      return (
        <motion.g
          animate={{ rotate: piece.rot % 2 === 0 ? -45 : 45 }}
          transition={reduceMotion ? { duration: 0 } : { ...spring, stiffness: 300 }}
          style={{ transformOrigin: "center", transformBox: "fill-box" }}
        >
          <rect
            x={-38}
            y={-6}
            width={76}
            height={12}
            rx={6}
            fill="var(--beam-cyan)"
            opacity={0.55}
          />
          <rect
            x={-38}
            y={-6}
            width={76}
            height={12}
            rx={6}
            fill="none"
            stroke="var(--beam-cyan)"
            strokeWidth={2}
            strokeDasharray="8 7"
          />
        </motion.g>
      );

    case "filter":
      return (
        <g>
          <circle
            cx={0}
            cy={0}
            r={30}
            fill={color}
            fillOpacity={0.25}
            stroke={color}
            strokeWidth={3}
          />
          <text x={0} y={10} textAnchor="middle" fontSize={26} fill={color}>
            {colorGlyph(piece.color ?? 7)}
          </text>
        </g>
      );

    case "prism":
      return (
        <path
          d="M 0 -36 L 34 26 L -34 26 Z"
          fill="var(--beam-white)"
          fillOpacity={0.14}
          stroke="var(--beam-white)"
          strokeWidth={3}
          filter="url(#glow)"
        />
      );

    case "glass":
      return (
        <g>
          <rect
            x={-32}
            y={-32}
            width={64}
            height={64}
            rx={10}
            fill="var(--beam-white)"
            fillOpacity={0.1}
            stroke="var(--beam-white)"
            strokeOpacity={0.55}
            strokeWidth={2.5}
          />
          <path d="M -20 22 L 18 -20" stroke="var(--beam-white)" strokeOpacity={0.45} strokeWidth={3} />
        </g>
      );

    case "crystal":
      return (
        <g>
          <path
            d="M 0 -34 L 30 0 L 0 34 L -30 0 Z"
            fill="var(--beam-cyan)"
            fillOpacity={0.16}
            stroke="var(--beam-cyan)"
            strokeWidth={3}
            filter="url(#glow)"
          />
          <path d="M 0 -34 L 0 34" stroke="var(--beam-magenta)" strokeOpacity={0.6} strokeWidth={2} />
        </g>
      );

    case "water":
      return (
        <g>
          <circle cx={0} cy={0} r={31} fill="var(--beam-blue)" fillOpacity={0.14} stroke="var(--beam-blue)" strokeWidth={2.5} />
          <path
            d="M -22 4 q 11 -12 22 0 q 11 12 22 0"
            fill="none"
            stroke="var(--beam-cyan)"
            strokeWidth={3}
            opacity={0.85}
          />
        </g>
      );

    case "fog":
      return (
        <g opacity={0.85}>
          <circle cx={-10} cy={-6} r={19} fill="var(--muted-foreground)" fillOpacity={0.28} />
          <circle cx={12} cy={2} r={22} fill="var(--muted-foreground)" fillOpacity={0.22} />
          <circle cx={-2} cy={14} r={15} fill="var(--muted-foreground)" fillOpacity={0.2} />
        </g>
      );

    case "wall":
      return (
        <rect
          x={-40}
          y={-40}
          width={80}
          height={80}
          rx={12}
          fill="var(--surface-2)"
          stroke="var(--border)"
          strokeWidth={2}
        />
      );

    default:
      return null;
  }
}

function describe(piece: Piece | undefined, state: CellState): string {
  if (!piece) return "Empty cell";
  switch (piece.kind) {
    case "emitter":
      return `${colorName(piece.color ?? 7)} emitter`;
    case "target":
      return `${colorName(piece.color ?? 7)} target, ${
        state === "lit" ? "lit" : state === "misrouted" ? "receiving the wrong colour" : "unlit"
      }`;
    case "mirror":
      return `Mirror facing ${piece.rot % 2 === 0 ? "north-east" : "north-west"}`;
    case "splitter":
      return `Splitter facing ${piece.rot % 2 === 0 ? "north-east" : "north-west"}`;
    case "filter":
      return `${colorName(piece.color ?? 7)} filter`;
    case "prism":
      return "Prism";
    case "wall":
      return "Wall";
    case "glass":
      return "Glass block";
    case "crystal":
      return "Crystal";
    case "water":
      return "Water";
    case "fog":
      return "Fog bank";
    default:
      return "Piece";
  }
}

export const PrismBoard = memo(function PrismBoard({
  board,
  result,
  onActivate,
  colorblind,
  placing,
  reduceMotion = false,
  litKeys = [],
  misroutedKeys = [],
  lastTouched,
  hintCell,
  interactiveAll = false,
  readOnly = false,
  selectedCell = null,
  onSecondary,
  onInspectCell,
  onDropCell,
  ghostSegments = null,
  ghostCell = null,
}: Props) {
  const w = board.width * C;
  const h = board.height * C;
  const lit = new Set(litKeys);
  const misrouted = new Set(misroutedKeys);
  const stateOf = (k: string): CellState =>
    lit.has(k) ? "lit" : misrouted.has(k) ? "misrouted" : "idle";


  return (
    <div
      className="relative w-full select-none"
      style={{ aspectRatio: `${board.width} / ${board.height}` }}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="9" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="grid" width={C} height={C} patternUnits="userSpaceOnUse">
            <path
              d={`M ${C} 0 L 0 0 0 ${C}`}
              fill="none"
              stroke="var(--border)"
              strokeWidth="1.5"
            />
          </pattern>
        </defs>

        <rect width={w} height={h} rx={20} fill="var(--surface)" />
        <rect width={w} height={h} rx={20} fill="url(#grid)" />

        {/* Beams: soft halo, solid core, travelling highlight. Each new segment
            draws itself in the direction the light travels. */}
        <g strokeLinecap="round">
          <AnimatePresence initial={false}>
            {result.segments.map((s) => {
              const stroke = colorVar(s.color as ColorMask);
              const x1 = center(s.x1);
              const y1 = center(s.y1);
              const x2 = center(s.x2);
              const y2 = center(s.y2);
              const id = `${s.x1},${s.y1}|${s.x2},${s.y2}|${s.color}`;
              const draw = reduceMotion ? { duration: 0 } : { duration: 0.28, ease: "easeOut" as const };
              return (
                <motion.g
                  key={id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.18 }}
                >
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={stroke}
                    strokeWidth={22}
                    opacity={0.18}
                    filter="url(#glow)"
                  />
                  <motion.line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={stroke}
                    strokeWidth={7}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={draw}
                  />
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--beam-white)"
                    strokeWidth={2.5}
                    opacity={0.75}
                    strokeDasharray="26 60"
                    style={{ animation: "beam-dash 1.6s linear infinite" }}
                  />
                </motion.g>
              );
            })}
          </AnimatePresence>
        </g>

        {/* "What if?" ghost: the beam field this move *would* create. It is
            drawn as an unlit dashed echo so it can never be mistaken for the
            real light — hovering costs the player nothing. */}
        {ghostSegments && ghostSegments.length > 0 && (
          <g strokeLinecap="round" aria-hidden="true">
            {ghostCell && (
              <circle
                cx={center(Number(ghostCell.split(",")[0]))}
                cy={center(Number(ghostCell.split(",")[1]))}
                r={44}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray="6 8"
                opacity={0.7}
              />
            )}
            {ghostSegments.map((s, i) => (
              <line
                key={`ghost-${i}-${s.x1},${s.y1},${s.x2},${s.y2}`}
                x1={center(s.x1)}
                y1={center(s.y1)}
                x2={center(s.x2)}
                y2={center(s.y2)}
                stroke={colorVar(s.color as ColorMask)}
                strokeWidth={5}
                opacity={0.42}
                strokeDasharray="14 12"
                style={
                  reduceMotion
                    ? undefined
                    : { animation: "beam-dash 1.1s linear infinite" }
                }
              />
            ))}
          </g>
        )}



        {/* Pieces */}
        <AnimatePresence initial={false}>
          {Object.entries(board.cells).map(([k, piece]) => {
            const parts = k.split(",");
            const x = Number(parts[0]);
            const y = Number(parts[1]);
            return (
              <g key={piece.id} transform={`translate(${center(x)} ${center(y)})`}>
                <motion.g
                  initial={{ opacity: 0, scale: 0.55 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.55 }}
                  transition={reduceMotion ? { duration: 0 } : spring}
                  style={{ transformOrigin: "center", transformBox: "fill-box" }}
                >
                  <PieceShape
                    piece={piece}
                    state={stateOf(k)}
                    reduceMotion={reduceMotion}
                  />
                </motion.g>
              </g>
            );
          })}
        </AnimatePresence>
      </svg>

      {/* Accessible interaction layer */}
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${board.width}, 1fr)`,
          gridTemplateRows: `repeat(${board.height}, 1fr)`,
        }}
      >
        {Array.from({ length: board.width * board.height }, (_, i) => {
          const x = i % board.width;
          const y = Math.floor(i / board.width);
          const k = key(x, y);
          const piece = board.cells[k];
          const state = stateOf(k);
          const interactive =
            !readOnly &&
            (interactiveAll || (!piece && placing) || (!!piece && !piece.fixed));
          return (
            <button
              key={k}
              type="button"
              onClick={() => onActivate(x, y)}
              onContextMenu={
                onSecondary
                  ? (e) => {
                      e.preventDefault();
                      onSecondary(x, y);
                    }
                  : undefined
              }
              draggable={!!onDropCell && !!piece && !piece.fixed}
              onDragStart={
                onDropCell
                  ? (e) => e.dataTransfer.setData("text/prism-cell", k)
                  : undefined
              }
              onDragOver={onDropCell ? (e) => e.preventDefault() : undefined}
              onDrop={
                onDropCell
                  ? (e) => {
                      e.preventDefault();
                      const from = e.dataTransfer.getData("text/prism-cell");
                      if (from) onDropCell(from, k);
                    }
                  : undefined
              }
              onPointerEnter={onInspectCell ? () => onInspectCell(k) : undefined}
              onPointerLeave={onInspectCell ? () => onInspectCell(null) : undefined}
              onFocus={onInspectCell ? () => onInspectCell(k) : undefined}
              onBlur={onInspectCell ? () => onInspectCell(null) : undefined}
              disabled={!interactive}
              aria-label={`Column ${x + 1}, row ${y + 1}: ${describe(piece, state)}`}
              className={cn(
                "m-[6%] rounded-xl transition-all duration-200 ease-out",
                interactive
                  ? "cursor-pointer hover:bg-foreground/10 hover:scale-[1.06] active:scale-90"
                  : "cursor-default",
                !piece && placing && "bg-primary/5 ring-1 ring-primary/25 animate-drop-hint",
                lastTouched === k && "ring-2 ring-primary/60",
                selectedCell === k && "ring-2 ring-accent",
                state === "misrouted" && "ring-2 ring-destructive/50",
                hintCell === k && "ring-2 ring-accent animate-pulse-ring",
              )}
            >
              {colorblind && piece?.kind === "target" && (
                <span className="sr-only">{colorName(piece.color ?? 7)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
