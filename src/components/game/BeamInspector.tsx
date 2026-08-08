import { motion } from "motion/react";
import { Activity, Radio, Ruler, Split, Waypoints } from "lucide-react";
import { colorName, colorVar, dirNames } from "@/game/engine";
import type { Segment } from "@/game/types";

interface Props {
  segment: Segment | null;
  /** Cell the pointer/keyboard focus is on, shown when no beam is present. */
  cellLabel?: string;
}

const rgbOf = (mask: number) =>
  `${mask & 1 ? "R" : "–"}${mask & 2 ? "G" : "–"}${mask & 4 ? "B" : "–"}`;

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </span>
      <span className="text-xs font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/** Live telemetry for the beam under the cursor. Updates every frame the board does. */
export function BeamInspector({ segment, cellLabel }: Props) {
  const meta = segment?.meta;
  return (
    <div
      className="rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur"
      aria-live="polite"
    >
      <p className="font-display text-xs tracking-widest text-muted-foreground uppercase">
        Beam inspector
      </p>
      {!segment || !meta ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {cellLabel ? `${cellLabel} — no light here.` : "Hover or focus a cell to inspect the light passing through it."}
        </p>
      ) : (
        <motion.div
          key={`${segment.x1},${segment.y1}-${segment.x2},${segment.y2}-${segment.color}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="mt-2"
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-8 rounded-full"
              style={{
                background: colorVar(segment.color),
                boxShadow: "var(--shadow-glow)",
              }}
            />
            <span className="text-sm font-semibold">{colorName(segment.color)}</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {rgbOf(segment.color)}
            </span>
          </div>
          <Field icon={Activity} label="Intensity" value={`${Math.round(meta.intensity * 100)}%`} />
          <Field icon={Ruler} label="Distance" value={`${meta.distance} cells`} />
          <Field icon={Waypoints} label="Reflections" value={`${meta.reflections}`} />
          <Field icon={Split} label="Splits" value={`${meta.splits}`} />
          <Field
            icon={Radio}
            label="Source"
            value={meta.sources.map((s) => `(${s})`).join(" ")}
          />
          <Field icon={Waypoints} label="Direction" value={dirNames(meta.dirs)} />
        </motion.div>
      )}
    </div>
  );
}
