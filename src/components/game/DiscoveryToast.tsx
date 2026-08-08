import { AnimatePresence, motion } from "motion/react";
import { Telescope, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DISCOVERY_BY_ID, depthText, type Depth } from "@/game/discoveries";

interface Props {
  /** Ids unlocked this session, newest last. */
  ids: string[];
  depth: Depth;
  reduceMotion?: boolean;
  onDepthChange?: (d: Depth) => void;
}

const DEPTHS: Depth[] = ["beginner", "curious", "explorer"];
const DEPTH_LABEL: Record<Depth, string> = {
  beginner: "Simple",
  curious: "Deeper",
  explorer: "Scientific",
};

/**
 * Fires the moment the simulation actually produced a phenomenon the player
 * had not caused before. It names what happened first, and only then explains
 * it — at whatever depth the reader asked for.
 */
export function DiscoveryToast({ ids, depth, reduceMotion = false, onDepthChange }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const latest = ids.length ? ids[ids.length - 1]! : null;

  useEffect(() => {
    if (!latest) return;
    setOpen(latest);
    // Never let the card sit on top of the board indefinitely — it is a
    // notification, not a modal, and the player is mid-puzzle.
    const t = setTimeout(() => setOpen((cur) => (cur === latest ? null : cur)), 11000);
    return () => clearTimeout(t);
  }, [latest]);


  const card = open ? DISCOVERY_BY_ID.get(open) : undefined;

  return (
    <AnimatePresence>
      {card && (
        <motion.aside
          key={card.id}
          initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-5"
          aria-live="polite"
        >
          <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-accent/45 bg-surface/95 p-4 shadow-lg backdrop-blur">
            <div className="flex items-start gap-3">
              <Telescope className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[11px] tracking-widest text-accent uppercase">
                  You discovered something
                </p>
                <h2 className="mt-1 text-sm font-bold">{card.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{depthText(card, depth)}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="text-foreground/80">Try this:</span> {card.tryThis}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="text-foreground/80">In the real world:</span> {card.realWorld}
                </p>
                {onDepthChange && (
                  <div className="mt-3 flex gap-1.5">
                    {DEPTHS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onDepthChange(d)}
                        aria-pressed={depth === d}
                        className={
                          "min-h-9 rounded-lg border px-2.5 text-xs transition-colors " +
                          (depth === d
                            ? "border-accent bg-accent/15 text-foreground"
                            : "border-border text-muted-foreground hover:bg-surface-2")
                        }
                      >
                        {DEPTH_LABEL[d]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Dismiss discovery"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
