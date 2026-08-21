import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Etch, Fibre } from "@/components/chrome/instrument";
import { MISSIONS } from "@/game/missions";
import { loadMissions, type MissionRecords } from "@/game/streak";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/missions/")({
  head: () => ({
    meta: [
      { title: "Field Missions — Prism" },
      {
        name: "description",
        content:
          "Short real-world optics scenarios: aim a kingfisher's dive, restore a dark fibre link, find a prism's minimum deviation.",
      },
      { property: "og:title", content: "Field Missions — Prism" },
      {
        property: "og:description",
        content: "Real geometric optics, one scenario at a time — refraction, total internal reflection, dispersion.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MissionIndex,
});

function MissionIndex() {
  const [records, setRecords] = useState<MissionRecords>({});
  useEffect(() => setRecords(loadMissions()), []);

  return (
    <main className="chamber grain relative min-h-dvh px-6 py-10 sm:py-14">
      <div className="relative z-10 mx-auto max-w-3xl">
        <Link
          to="/play"
          className="inline-flex min-h-11 items-center gap-2 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Campaign index
        </Link>

        <header className="mt-4">
          <Etch>Field missions</Etch>
          <h1 className="mt-2 font-display text-4xl leading-none font-extrabold tracking-[-0.03em] sm:text-5xl">
            Light in the world
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            No grid. One real scenario, one control, and the same optics the campaign teaches —
            computed from the standard geometric relations, not approximated for effect.
          </p>
        </header>

        <Fibre
          className="my-8"
          value={MISSIONS.length ? Object.keys(records).length / MISSIONS.length : 0}
        />

        <ul className="space-y-px">
          {MISSIONS.map((m) => {
            const rec = records[m.id];
            return (
              <li key={m.id}>
                <Link
                  to="/missions/$missionId"
                  params={{ missionId: m.id }}
                  className="bench-top group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4 transition-colors hover:bg-surface/40"
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-full border text-[0.6875rem]",
                      rec
                        ? "border-primary/60 text-primary shadow-[0_0_18px_-4px_var(--primary)]"
                        : "border-white/12 text-muted-foreground",
                    )}
                  >
                    {rec ? <Check className="h-4 w-4" aria-hidden="true" /> : m.category[0]}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display font-bold">{m.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {m.concept} · {m.category.toLowerCase()}
                    </span>
                  </span>
                  <span className="text-right font-display text-xs tabular-nums text-muted-foreground">
                    {rec ? `${rec.score} discovery` : "unattempted"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-10 max-w-xl text-xs leading-relaxed text-muted-foreground">
          Prism uses a ray (geometric) model of light. It does not simulate interference,
          diffraction or polarisation, and never claims to.
        </p>
      </div>
    </main>
  );
}
