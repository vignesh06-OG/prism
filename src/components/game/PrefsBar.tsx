import { motion } from "motion/react";
import { Contrast, Eye, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import { loadPrefs, savePrefs, type Prefs } from "@/game/progress";
import { cn } from "@/lib/utils";

interface Props {
  onChange?: (prefs: Prefs) => void;
}

const ITEMS: { key: keyof Prefs; label: string; icon: typeof Eye; hint: string }[] = [
  { key: "colorblind", label: "Colour-blind", icon: Eye, hint: "Adds letters and patterns to every beam colour" },
  { key: "highContrast", label: "High contrast", icon: Contrast, hint: "Boosts contrast across the interface" },
  { key: "reduceMotion", label: "Reduce motion", icon: Wind, hint: "Removes animation and camera effects" },
];

/** Accessibility toggles, persisted locally and applied to the document root. */
export function PrefsBar({ onChange }: Props) {
  const [prefs, setPrefs] = useState<Prefs>({
    colorblind: false,
    reduceMotion: false,
    highContrast: false,
  });

  useEffect(() => {
    const loaded = loadPrefs();
    setPrefs(loaded);
    onChange?.(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("high-contrast", prefs.highContrast);
    root.classList.toggle("reduce-motion", prefs.reduceMotion);
  }, [prefs.highContrast, prefs.reduceMotion]);

  const toggle = (k: keyof Prefs) => {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    savePrefs(next);
    onChange?.(next);
  };

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Accessibility preferences"
    >
      {ITEMS.map(({ key, label, icon: Icon, hint }) => (
        <motion.button
          key={key}
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => toggle(key)}
          aria-pressed={prefs[key]}
          title={hint}
          className={cn(
            "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition-colors",
            prefs[key]
              ? "border-primary bg-primary/15 text-foreground"
              : "border-border bg-surface-2/70 text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </motion.button>
      ))}
    </div>
  );
}
