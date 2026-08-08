import { motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { DEFAULT_SIM, type SimParams } from "@/game/types";

interface Props {
  params: SimParams;
  onChange: (next: SimParams) => void;
}

const FIELDS: {
  key: keyof SimParams;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}[] = [
  {
    key: "beamIntensity",
    label: "Beam intensity",
    hint: "Energy each emitter puts into the world.",
    min: 0.2,
    max: 2,
    step: 0.05,
    format: (v) => `${v.toFixed(2)}×`,
  },
  {
    key: "reflectionEfficiency",
    label: "Reflection efficiency",
    hint: "Energy retained by every mirror bounce.",
    min: 0.3,
    max: 1,
    step: 0.01,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "attenuation",
    label: "Attenuation",
    hint: "Energy lost per cell of travel.",
    min: 0,
    max: 0.25,
    step: 0.005,
    format: (v) => `${(v * 100).toFixed(1)}% / cell`,
  },
  {
    key: "prismIndex",
    label: "Refractive index",
    hint: "Dispersion strength of prisms and crystals.",
    min: 0.2,
    max: 1.6,
    step: 0.05,
    format: (v) => v.toFixed(2),
  },
  {
    key: "scattering",
    label: "Scattering",
    hint: "How much fog bleeds light sideways.",
    min: 0,
    max: 0.95,
    step: 0.05,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "minIntensity",
    label: "Extinction threshold",
    hint: "Energy below which a ray stops propagating.",
    min: 0.005,
    max: 0.3,
    step: 0.005,
    format: (v) => `${(v * 100).toFixed(1)}%`,
  },
];

/** Live physics controls for the Light Laboratory. Campaign play is untouched. */
export function LabControls({ params, onChange }: Props) {
  return (
    <section
      className="rounded-2xl border border-border bg-surface/60 p-4 backdrop-blur-sm"
      aria-label="Simulation parameters"
    >
      <header className="mb-3 flex items-center gap-2">
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Simulation parameters
        </h2>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => onChange({ ...DEFAULT_SIM })}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset to shipping values
        </motion.button>
      </header>

      <div className="space-y-3.5">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="flex items-baseline gap-2 text-xs" htmlFor={`lab-${f.key}`}>
              <span className="font-medium">{f.label}</span>
              <span className="ml-auto font-mono text-[11px] text-accent">
                {f.format(params[f.key])}
              </span>
            </label>
            <input
              id={`lab-${f.key}`}
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={params[f.key]}
              onChange={(e) => onChange({ ...params, [f.key]: Number(e.target.value) })}
              className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-[var(--primary)]"
              aria-describedby={`lab-${f.key}-hint`}
            />
            <p id={`lab-${f.key}-hint`} className="mt-1 text-[11px] text-muted-foreground">
              {f.hint}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
