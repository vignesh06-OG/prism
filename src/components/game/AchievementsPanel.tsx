import { motion } from "motion/react";
import { Award, Lock } from "lucide-react";
import { ACHIEVEMENTS } from "@/game/achievements";
import { cn } from "@/lib/utils";

interface Props {
  unlocked: string[];
  className?: string;
  reduceMotion?: boolean;
}

const TIER = {
  bronze: "text-beam-red border-beam-red/40",
  silver: "text-beam-cyan border-beam-cyan/40",
  gold: "text-beam-yellow border-beam-yellow/40",
} as const;

/** Mastery badges — earned by how you solve, never by simply finishing. */
export function AchievementsPanel({ unlocked, className, reduceMotion = false }: Props) {
  const set = new Set(unlocked);
  return (
    <section className={cn("rounded-2xl border border-border bg-surface/60 p-4", className)}>
      <header className="mb-3 flex items-center gap-2">
        <Award className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Mastery
        </h2>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {set.size}/{ACHIEVEMENTS.length}
        </span>
      </header>
      <ul className="grid gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a, i) => {
          const on = set.has(a.id);
          return (
            <motion.li
              key={a.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.25, delay: reduceMotion ? 0 : i * 0.03 }}
              className={cn(
                "rounded-xl border bg-surface-2/40 px-3 py-2.5 transition-colors",
                on ? TIER[a.tier] : "border-border/60 text-muted-foreground",
              )}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {on ? (
                  <Award className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {a.name}
                <span className="ml-auto text-[10px] tracking-widest uppercase opacity-70">
                  {a.tier}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.blurb}</p>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
