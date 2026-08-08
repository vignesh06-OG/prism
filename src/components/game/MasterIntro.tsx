import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onDone: () => void;
  reduceMotion?: boolean;
}

const LINES = [
  "You know how light moves.",
  "Now question what you think it means to solve.",
];

/**
 * The Master Trial title sequence. Two lines, no instruction, no tutorial —
 * the whole point is that the player walks in confident.
 */
export function MasterIntro({ open, onDone, reduceMotion = false }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (reduceMotion) return;
    const timers = [
      window.setTimeout(() => setStep(1), 2200),
      window.setTimeout(() => setStep(2), 4600),
      window.setTimeout(onDone, 6200),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [open, reduceMotion, onDone]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="master-intro"
          role="dialog"
          aria-label="The Master Trial"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6 }}
          className="fixed inset-0 z-50 grid place-items-center bg-background px-6 text-center"
        >
          <div className="max-w-lg">
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, letterSpacing: "0.6em" }}
              animate={{ opacity: 1, letterSpacing: "0.4em" }}
              transition={{ duration: reduceMotion ? 0 : 1.2 }}
              className="font-display text-[0.7rem] tracking-[0.4em] text-primary uppercase"
            >
              The Master Trial
            </motion.p>

            <div className="mt-8 min-h-24 space-y-4">
              {LINES.map((line, i) => (
                <AnimatePresence key={line}>
                  {(reduceMotion || step >= i) && (
                    <motion.p
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: step > i && !reduceMotion ? 0.35 : 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.9 }}
                      className="text-xl leading-snug text-balance sm:text-2xl"
                    >
                      {line}
                    </motion.p>
                  )}
                </AnimatePresence>
              ))}
            </div>

            <button
              type="button"
              onClick={onDone}
              className="mt-10 min-h-11 rounded-full border border-border px-6 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              Begin
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
