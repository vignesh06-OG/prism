import { motion } from "motion/react";
import { Award, Lock } from "lucide-react";
import { ACHIEVEMENTS } from "@/game/achievements";
import { cn } from "@/lib/utils";

interface Props {
  unlocked: string[];
  className?: string | undefined;
  reduceMotion?: boolean | undefined;
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
    <section className={cn("border-t border-[var(--hairline)] pt-4", className)}>
      <header className="mb-3 flex items-center gap-2">
        <Award className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
        <h2 className="etch">Mastery</h2>
        <span className="ml-auto font-display text-[0.65rem] tabular-nums text-muted-foreground">
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
                "rounded-[3px] border px-3 py-2.5 transition-colors",
                on
                  ? cn(TIER[a.tier], "bg-white/[0.03]")
                  : "border-[var(--hairline)] text-muted-foreground/70",
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
              <p className="mt-0.5 text-[0.75rem] leading-relaxed text-muted-foreground/80">{a.blurb}</p>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
