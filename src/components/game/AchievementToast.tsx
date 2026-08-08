import { AnimatePresence, motion } from "motion/react";
import { Award } from "lucide-react";
import type { Achievement } from "@/game/achievements";

interface Props {
  unlocked: Achievement[];
  reduceMotion?: boolean;
}

/** Slides in newly earned mastery badges without interrupting play. */
export function AchievementToast({ unlocked, reduceMotion = false }: Props) {
  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-40 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {unlocked.map((a, i) => (
          <motion.div
            key={a.id}
            initial={reduceMotion ? false : { opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{
              type: "spring",
              stiffness: 340,
              damping: 26,
              delay: reduceMotion ? 0 : i * 0.12,
            }}
            className="rounded-2xl border border-accent/40 bg-surface/90 p-3 shadow-lg backdrop-blur"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Award className="h-4 w-4 text-accent" aria-hidden="true" />
              {a.name}
              <span className="ml-auto text-[10px] tracking-widest text-muted-foreground uppercase">
                {a.tier}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{a.blurb}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
