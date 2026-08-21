import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Optical chrome primitives.
 *
 * Prism's interface is not made of cards. It is made of the same materials as
 * the simulation: hairline bench edges, etched labels, and light that bleeds
 * out of a control instead of a background that fills it. Every panel in the
 * game is assembled from these four pieces so the chrome and the board speak
 * one language.
 */

/** Machine-engraved micro label. Never a heading — it labels an instrument. */
export function Etch({
  children,
  className,
  tone = "muted",
}: {
  children: ReactNode;
  className?: string | undefined;
  tone?: "muted" | "primary" | "accent" | undefined;
}) {
  return (
    <span
      className={cn(
        "etch",
        tone === "primary" && "text-primary",
        tone === "accent" && "text-accent",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A section of the instrument rail. Structure comes from one hairline rule and
 * an etched label — there is no container, no fill and no corner radius, so
 * the rail reads as one machined surface rather than a stack of cards.
 */
export function RailSection({
  label,
  meta,
  children,
  className,
  tone = "muted",
}: {
  label: string;
  meta?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
  tone?: "muted" | "primary" | "accent" | undefined;
}) {
  return (
    <section className={cn("bench-top pt-3", className)}>
      <div className="flex items-baseline justify-between gap-3 pb-2.5">
        <Etch tone={tone}>{label}</Etch>
        {meta ? (
          <span className="font-display text-[0.65rem] tabular-nums text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * A numeric readout. Instruments show a value against a scale, so the label
 * and the figure are typographically separated rather than boxed in a pill.
 */
export function Readout({
  label,
  value,
  alert = false,
  className,
}: {
  label: string;
  value: ReactNode;
  alert?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Etch className="text-[0.5625rem]">{label}</Etch>
      <span
        className={cn(
          "font-display text-sm leading-none font-bold tabular-nums transition-colors duration-200",
          alert ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * A fibre-optic rule. At rest it is a dead hairline; the fill is live signal,
 * which is how progress is expressed everywhere in Prism — as light in a line.
 */
export function Fibre({
  value,
  className,
  reduceMotion = false,
}: {
  /** 0 to 1. */
  value: number;
  className?: string | undefined;
  reduceMotion?: boolean | undefined;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={cn("fibre", className)} aria-hidden="true">
      <div
        className="absolute inset-y-0 left-0 bg-primary"
        style={{
          width: `${pct}%`,
          boxShadow: pct > 0 ? "0 0 10px 1px var(--primary)" : "none",
          transition: reduceMotion ? "none" : "width 420ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />
      {!reduceMotion && pct > 0 && pct < 100 ? (
        <span
          className="photon-drift absolute top-1/2 h-[3px] w-6 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: 0, filter: "blur(1px)" }}
        />
      ) : null}
    </div>
  );
}
