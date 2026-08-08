import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PrefsBar } from "@/components/game/PrefsBar";

const LightLab = lazy(() => import("@/components/game/LightLab"));

export const Route = createFileRoute("/lab/")({
  head: () => ({
    meta: [
      { title: "Light Laboratory — Tune the Physics | Prism" },
      {
        name: "description",
        content:
          "Dial reflection efficiency, attenuation, refractive index and scattering, then watch the beam engine respond in real time. Campaign physics stay untouched.",
      },
      { property: "og:title", content: "Light Laboratory — Tune the Physics" },
      {
        property: "og:description",
        content:
          "An open bench for Prism's light simulation: materials, attenuation, dispersion and scattering under your control.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LabPage,
});

function LabFallback() {
  return (
    <div
      className="grid min-h-[420px] place-items-center rounded-2xl border border-border bg-surface/60 text-sm text-muted-foreground"
      role="status"
    >
      Warming up the bench…
    </div>
  );
}

function LabPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 pb-24">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Home
          </Link>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight">
            Light <span className="text-glow text-primary">Laboratory</span>
          </h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Change the physics, not the puzzle. Attenuation, reflection loss, refractive index and
            scattering are live — the campaign always runs on the shipping constants.
          </p>
        </div>
        <PrefsBar />
      </header>

      <ClientOnly fallback={<LabFallback />}>
        <Suspense fallback={<LabFallback />}>
          <LightLab />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
