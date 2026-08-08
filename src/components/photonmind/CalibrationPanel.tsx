import { useEffect, useState } from "react";
import { Gauge, Scale } from "lucide-react";
import {
  calibrate,
  loadRows,
  reasoningProfile,
  type Calibration,
  type ReasoningProfile,
} from "@/game/photonmind/calibration";
import { cn } from "@/lib/utils";

/**
 * Honest accountability for the model: measured error against the player's own
 * solves, plus a neutral mirror of how they reason. Reads from localStorage on
 * the client only, so it never diverges during SSR.
 */
export function CalibrationPanel({ className }: { className?: string }) {
  const [cal, setCal] = useState<Calibration | null>(null);
  const [profile, setProfile] = useState<ReasoningProfile | null>(null);

  useEffect(() => {
    const rows = loadRows();
    setCal(calibrate(rows));
    setProfile(reasoningProfile(rows));
  }, []);

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-surface/70 p-5 text-xs backdrop-blur",
        className,
      )}
      aria-label="Model calibration and reasoning profile"
    >
      <header className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="font-display text-sm font-bold">Is the model actually right?</h3>
      </header>

      {!cal ? (
        <p className="mt-3 text-muted-foreground">Reading your local ledger…</p>
      ) : cal.unknown ? (
        <p className="mt-3 text-muted-foreground">{cal.verdict}</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {[
              ["Solves recorded", `${cal.n}`],
              ["Time error (MAE)", `${Math.round(cal.timeMae)} s`],
              ["Inside ±50% band", `${Math.round(cal.hitRate * 100)}%`],
              ["Measured confidence", `${Math.round(cal.confidence * 100)}%`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-background/40 p-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-display font-bold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-muted-foreground">{cal.verdict}</p>
        </>
      )}

      <hr className="my-4 border-border" />

      <header className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-accent" aria-hidden="true" />
        <h3 className="font-display text-sm font-bold">How you reason</h3>
      </header>
      {!profile ? null : profile.unknown ? (
        <p className="mt-3 text-muted-foreground">{profile.headline}</p>
      ) : (
        <>
          <p className="mt-2 text-foreground">{profile.headline}</p>
          <ul className="mt-3 space-y-3">
            {profile.traits.map((t) => (
              <li key={t.label}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-[11px] tracking-widest uppercase">
                    {t.label}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round(t.value * 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{t.low}</span>
                  <span>{t.high}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{t.note}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-muted-foreground/80">
            Stored on this device only. No score, no ranking — both ends of every axis are valid
            ways to think.
          </p>
        </>
      )}
    </section>
  );
}
