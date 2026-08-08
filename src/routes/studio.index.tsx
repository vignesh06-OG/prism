import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PrefsBar } from "@/components/game/PrefsBar";

const StudioEditor = lazy(() => import("@/components/game/StudioEditor"));

export const Route = createFileRoute("/studio/")({
  head: () => ({
    meta: [
      { title: "Prism Studio — Build & Validate Light Puzzles" },
      {
        name: "description",
        content:
          "Design your own light-refraction puzzles, validate solvability with the built-in solver, and share them with a Prism code.",
      },
      { property: "og:title", content: "Prism Studio — Build & Validate Light Puzzles" },
      {
        property: "og:description",
        content:
          "A visual editor for light puzzles with a BFS validator, difficulty rating and offline share codes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioPage,
});

function EditorFallback() {
  return (
    <div
      className="grid min-h-[420px] place-items-center rounded-2xl border border-border bg-surface/60 text-sm text-muted-foreground"
      role="status"
    >
      Loading Studio…
    </div>
  );
}

function StudioPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 pb-24">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/play"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Levels
          </Link>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight">
            Prism <span className="text-glow text-primary">Studio</span>
          </h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Build a puzzle, watch the light solve live, then validate it for solvability,
            uniqueness and difficulty.
          </p>
        </div>
        <PrefsBar />
      </header>

      <ClientOnly fallback={<EditorFallback />}>
        <Suspense fallback={<EditorFallback />}>
          <StudioEditor mode="studio" />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
