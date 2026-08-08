import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ArrowLeft, BrainCircuit } from "lucide-react";
import { PrefsBar } from "@/components/game/PrefsBar";

const IntelligenceLab = lazy(() => import("@/components/photonmind/IntelligenceLab"));

export const Route = createFileRoute("/intelligence/")({
  head: () => ({
    meta: [
      { title: "Light Intelligence Lab — PhotonMind | Prism" },
      {
        name: "description",
        content:
          "Watch Prism's hybrid AI at work: an exhaustive light-path solver, a trained difficulty model, live search-tree visualisation and per-feature explanations.",
      },
      { property: "og:title", content: "Light Intelligence Lab — PhotonMind" },
      {
        property: "og:description",
        content:
          "Search meets machine learning: solvability proofs, learned difficulty prediction and explainable feature attributions for every puzzle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntelligencePage,
});

function LabFallback() {
  return (
    <div
      className="grid min-h-[520px] place-items-center rounded-3xl border border-border bg-surface/60 text-sm text-muted-foreground"
      role="status"
    >
      Bringing PhotonMind online…
    </div>
  );
}

function IntelligencePage() {
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
          <h1 className="font-display mt-2 flex items-center gap-2 text-3xl font-extrabold tracking-tight">
            <BrainCircuit className="h-7 w-7 text-primary" aria-hidden="true" />
            Light <span className="text-glow text-primary">Intelligence</span> Lab
          </h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            PhotonMind pairs an exhaustive light-path solver with a model trained offline on
            thousands of solver-labelled puzzles. Everything below is computed on this device —
            predictions, proofs and the reasons behind both.
          </p>
        </div>
        <PrefsBar />
      </header>

      <ClientOnly fallback={<LabFallback />}>
        <Suspense fallback={<LabFallback />}>
          <IntelligenceLab />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
