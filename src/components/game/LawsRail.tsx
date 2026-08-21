import { motion } from "motion/react";
import { readLaws } from "@/game/lightlaws";
import { RailSection } from "@/components/chrome/instrument";
import { cn } from "@/lib/utils";

interface Props {
  discovered: string[];
  reduceMotion?: boolean;
  className?: string;
}

/**
 * The Living Rulebook, compressed to a rail of lenses on an optical bench.
 * Each numeral is a law the player has *caused the simulation to demonstrate* —
 * an undiscovered law is a dark lens, a discovered one is a lit one. The rail
 * reads as territory left to illuminate rather than a checklist to tick.
 */
export function LawsRail({ discovered, reduceMotion = false, className }: Props) {
  const laws = readLaws(discovered);
  const known = laws.filter((l) => l.known).length;
  const latest = laws.filter((l) => l.known).at(-1);

  return (
    <RailSection
      label="Light Laws"
      meta={`${known}/${laws.length}`}
      className={className}
      tone={known > 0 ? "primary" : "muted"}
    >
      <ul className="flex items-center gap-1.5" aria-label="Light Laws discovered">
        {laws.map((law) => (
          <motion.li
            key={law.id}
            initial={reduceMotion ? false : { scale: 0.8, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            title={law.known ? `${law.name} — ${law.statement}` : "Not yet demonstrated"}
            className={cn(
              "grid h-7 flex-1 place-items-center rounded-[3px] border font-display text-[0.5625rem] tracking-widest transition-all duration-300",
              law.known
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-white/8 bg-transparent text-muted-foreground/35",
            )}
            style={{
              boxShadow: law.known
                ? "inset 0 0 12px -4px var(--primary), 0 0 10px -6px var(--primary)"
                : "none",
            }}
          >
            <span aria-hidden="true">{law.numeral}</span>
            <span className="sr-only">
              {law.known ? `${law.name}: ${law.statement}` : `Law ${law.numeral} undiscovered`}
            </span>
          </motion.li>
        ))}
      </ul>
      <p className="mt-2 min-h-4 text-[0.6875rem] leading-tight text-muted-foreground">
        {latest ? (
          <>
            <span className="text-foreground">{latest.name}.</span> {latest.statement}
          </>
        ) : (
          "Demonstrate a law in the simulation to light its lens."
        )}
      </p>
    </RailSection>
  );
}
