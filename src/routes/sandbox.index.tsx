import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PrefsBar } from "@/components/game/PrefsBar";

const StudioEditor = lazy(() => import("@/components/game/StudioEditor"));

export const Route = createFileRoute("/sandbox/")({
  head: () => ({
    meta: [
      { title: "Light Sandbox — Play With Beams | Prism" },
      {
        name: "description",
        content:
          "An objective-free physics playground: place emitters, mirrors, prisms and filters and watch light refract, split and mix in real time.",
      },
      { property: "og:title", content: "Light Sandbox — Play With Beams" },
      {
        property: "og:description",
        content: "Experiment freely with reflection, splitting and additive colour mixing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SandboxPage,
});

function EditorFallback() {
  return (
    <div
      className="grid min-h-[420px] place-items-center rounded-2xl border border-border bg-surface/60 text-sm text-muted-foreground"
      role="status"
    >
      Loading sandbox…
    </div>
  );
}

function SandboxPage() {
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
            Light <span className="text-glow text-accent">Sandbox</span>
          </h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            No targets, no rules. Bend, split and mix light — hover any beam to read its live
            telemetry.
          </p>
        </div>
        <PrefsBar />
      </header>

      <ClientOnly fallback={<EditorFallback />}>
        <Suspense fallback={<EditorFallback />}>
          <StudioEditor mode="sandbox" />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
