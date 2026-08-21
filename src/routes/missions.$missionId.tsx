import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Eye, Share2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Etch, RailSection } from "@/components/chrome/instrument";
import { HintLadder } from "@/components/missions/HintLadder";
import { MissionStage } from "@/components/missions/MissionStage";
import { discoveryScore, getMission, type MissionFeedback } from "@/game/missions";
import { recordMission, touchStreak } from "@/game/streak";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/missions/$missionId")({
  loader: ({ params }) => {
    const mission = getMission(params.missionId);
    if (!mission) throw notFound();
    return { title: mission.title, subtitle: mission.subtitle, concept: mission.concept };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Mission unavailable — Prism" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.title} — Prism Field Mission`;
    const description = `${loaderData.subtitle}. A field mission on ${loaderData.concept.toLowerCase()}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: MissionScreen,
});

function MissionScreen() {
  const { missionId } = Route.useParams();
  const mission = getMission(missionId)!;

  const [aim, setAim] = useState(mission.control.start);
  const [hintsUsed, setHints] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [formulaFound, setFormula] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [feedback, setFeedback] = useState<MissionFeedback | null>(null);
  const [solvedScore, setSolvedScore] = useState<number | null>(null);
  const [shared, setShared] = useState(false);

  const scene = useMemo(() => mission.scene(aim), [mission, aim]);
  const readouts = useMemo(() => mission.readouts(aim), [mission, aim]);

  const commit = useCallback(() => {
    const f = mission.evaluate(aim);
    setFeedback(f);
    setShowWhy(false);
    setAttempts((a) => a + 1);
    if (f.solved && solvedScore === null) {
      const score = discoveryScore({ hintsUsed, wrongAttempts: wrong, formulaFound });
      setSolvedScore(score);
      recordMission(mission.id, { score, hintsUsed, formulaFound });
      touchStreak();
    } else if (!f.solved) {
      setWrong((w) => w + 1);
    }
  }, [aim, mission, hintsUsed, wrong, formulaFound, solvedScore]);

  const share = useCallback(async () => {
    const text = `I solved "${mission.title}" in Prism — ${mission.discovery.law.toLowerCase()}, ${solvedScore} discovery score.`;
    try {
      await navigator.clipboard.writeText(text);
      setShared(true);
      window.setTimeout(() => setShared(false), 2200);
    } catch {
      /* clipboard unavailable */
    }
  }, [mission, solvedScore]);

  return (
    <main className="chamber grain relative min-h-dvh px-4 py-6 sm:px-6 sm:py-10">
      <div className="relative z-10 mx-auto max-w-6xl">
        <Link
          to="/missions"
          className="inline-flex min-h-11 items-center gap-2 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Field missions
        </Link>

        <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="min-w-0">
            <Etch tone="primary">{mission.category}</Etch>
            <h1 className="mt-1.5 font-display text-3xl leading-none font-extrabold tracking-[-0.03em] sm:text-4xl">
              {mission.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{mission.brief}</p>
            <p className="mt-1 max-w-2xl text-sm text-foreground/85">{mission.goal}</p>

            <div className="bleed mt-4 aspect-[100/60] w-full overflow-hidden rounded-sm border border-white/10 bg-surface/40">
              <MissionStage elements={scene} label={`${mission.title} — optical scene`} />
            </div>

            <div className="bench-top mt-4 pt-4">
              <label htmlFor="aim" className="flex items-baseline justify-between gap-3">
                <Etch>{mission.control.label}</Etch>
                <span className="font-display text-lg tabular-nums text-primary">
                  {aim.toFixed(2)}
                  {mission.control.unit}
                </span>
              </label>
              <input
                id="aim"
                type="range"
                min={mission.control.min}
                max={mission.control.max}
                step={mission.control.step}
                value={aim}
                onChange={(e) => setAim(Number(e.target.value))}
                className="mt-3 h-11 w-full accent-[var(--primary)]"
              />

              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {readouts.map((r) => (
                  <div key={r.label}>
                    <dt className="text-[0.625rem] tracking-[0.18em] text-muted-foreground uppercase">
                      {r.label}
                    </dt>
                    <dd
                      className={cn(
                        "font-display text-sm tabular-nums",
                        r.tone === "ok" && "text-primary",
                        r.tone === "warn" && "text-beam-red",
                      )}
                    >
                      {r.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <button
                type="button"
                onClick={commit}
                className="mt-4 inline-flex min-h-11 items-center rounded-sm bg-primary px-5 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {solvedScore === null ? "Commit the shot" : "Check again"}
              </button>
            </div>
          </section>

          <aside className="min-w-0 space-y-5">
            <AnimatePresence mode="wait">
              {feedback ? (
                <motion.div
                  key={feedback.message}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "rounded-sm border p-3",
                    feedback.solved ? "border-primary/50 bg-primary/5" : "border-beam-red/40",
                  )}
                >
                  <Etch tone={feedback.solved ? "primary" : "muted"}>
                    {feedback.solved ? "Solved" : `${feedback.kind} problem`}
                  </Etch>
                  <p className="mt-1.5 text-sm">{feedback.message}</p>
                  {feedback.why ? (
                    showWhy ? (
                      <p className="mt-2 text-xs text-muted-foreground">{feedback.why}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowWhy(true)}
                        className="mt-2 min-h-9 text-xs text-primary underline-offset-4 hover:underline"
                      >
                        Why?
                      </button>
                    )
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>

            {solvedScore !== null ? (
              <RailSection label="You discovered" tone="primary" meta={`${solvedScore} score`}>
                <p className="font-display text-sm font-bold text-primary">
                  {mission.discovery.law}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{mission.discovery.statement}</p>
                <p className="mt-2 text-[0.6875rem] tracking-[0.14em] text-muted-foreground uppercase">
                  Used in
                </p>
                <p className="text-xs">{mission.discovery.usedIn.join(" · ")}</p>
                <p className="mt-2 text-[0.6875rem] tracking-[0.14em] text-muted-foreground uppercase">
                  History
                </p>
                <p className="text-xs text-muted-foreground">{mission.discovery.history}</p>
                <button
                  type="button"
                  onClick={share}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/30 px-3 text-[0.8125rem] text-primary hover:bg-primary/10"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  {shared ? "Copied" : "Share this solve"}
                </button>
              </RailSection>
            ) : null}

            <RailSection label="Guidance">
              <HintLadder
                hints={mission.hints}
                used={hintsUsed}
                onReveal={() => setHints((h) => Math.min(mission.hints.length, h + 1))}
              />
            </RailSection>

            <RailSection label="The site" meta={formulaFound ? "found" : "unsearched"}>
              <p className="text-xs text-muted-foreground">{mission.formula.clue}</p>
              {formulaFound ? (
                <div className="mt-2">
                  <p className="font-display text-sm text-accent">{mission.formula.expression}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{mission.formula.caption}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setFormula(true)}
                  className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-sm border border-white/12 px-3 text-[0.8125rem] transition-colors hover:border-accent/50 hover:text-accent"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" /> Inspect the marker
                </button>
              )}
            </RailSection>

            <RailSection label="Attempt">
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Attempts", attempts],
                  ["Hints", hintsUsed],
                  ["Bonus", formulaFound ? "+10" : "—"],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-[0.625rem] tracking-[0.18em] text-muted-foreground uppercase">
                      {label}
                    </dt>
                    <dd className="font-display tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </RailSection>
          </aside>
        </div>
      </div>
    </main>
  );
}
