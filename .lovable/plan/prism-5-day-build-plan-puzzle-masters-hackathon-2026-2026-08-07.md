# Prism — 5-Day Build Plan (Puzzle Masters Hackathon 2026)

## The concept

**Prism** is a light-refraction logic puzzle. You place and rotate mirrors, splitters and prisms on a hex/grid board to route a beam of light into colored targets. Colors mix (red + blue = magenta), so later levels are about *planning color chemistry*, not just pathing.

Why this wins:
- **Visually spectacular by nature** — glowing beams, bloom, refraction, particle sparks. Light is the cheapest way to look expensive. This is our Best UI/UX weapon.
- **Instantly understandable** — no tutorial text needed; the first level teaches itself.
- **Not a clone** — it isn't 2048, Water Sort or Block Blast.
- **AI fits honestly** — an adaptive hint tutor that diagnoses *why* you're stuck instead of just showing the answer.

## What we ship

1. **The game** — 20+ handcrafted levels across 4 chapters, each introducing one new piece (mirror, splitter, prism, filter, portal).
2. **Adaptive AI Tutor** — watches your move pattern (thrash, idle, repeat-loops), classifies the stuck-type, and responds with an escalating hint ladder: nudge -> highlight the relevant region -> reveal one correct piece. Never dumps the solution.
3. **Daily Puzzle** — one procedurally generated board per day, shared by everyone, with a leaderboard.
4. **Sandbox / Level Editor** — build a board, verify it's solvable, share it via URL. Judges love user-generated content.
5. **Player profile** — streaks, solve times, "insight score" (moves vs optimal).

## Best UI/UX plan (the priority)

- **Art direction:** deep near-black indigo canvas, light as the only true color source. Beams are the UI accent — the whole palette derives from the puzzle itself.
- **Type:** a geometric display face for headings, a clean grotesque for body. No Inter, no Poppins.
- **Motion:** every action has physical feedback — pieces snap with weight, beams re-trace with a travelling glow rather than popping, solving triggers a chromatic bloom + confetti of light. Motion for React throughout, all under 300ms.
- **Sound:** short synth tones tied to beam color; muted by default with a visible toggle.
- **Onboarding:** zero modals. Level 1 is a two-piece board with a single pulsing hint ring.
- **Accessibility:** colorblind mode (shapes/patterns on targets, not just hue), full keyboard play, reduced-motion mode, 44px tap targets, AA contrast. Judges test this — we make it a visible feature in the settings panel, not a hidden fix.
- **Mobile-first:** the board scales to viewport, controls are thumb-reachable, works offline as an installable PWA.

## 5-day schedule

**Day 1 — Foundation**
Design system (tokens, fonts, motion primitives). Board data model, beam-tracing engine, hit detection. Static render of one level.

**Day 2 — Game feel**
Drag/rotate interaction, snapping, beam animation, win detection, level transitions. This is the day the game must feel *good* — we do not move on until it does.

**Day 3 — Content + backend**
Enable Lovable Cloud: auth, level progress, daily puzzle table, leaderboard. Author chapters 1–4 levels. Procedural daily generator with a solvability check.

**Day 4 — AI tutor + editor**
Move-telemetry stuck detection, hint ladder wired to the AI gateway for natural-language nudges. Level editor with share links.

**Day 5 — Polish + pitch**
Landing page, sound, colorblind/reduced-motion passes, performance, SEO/meta, demo video script, and a written "how we built it" page for the judges.

## Technical notes

- TanStack Start + React 19, Tailwind v4 tokens in `src/styles.css`, Motion for React for animation.
- Beam tracing is a pure function `(board) => beams[]` — deterministic, unit-testable, reused by the level validator and the daily generator.
- Lovable Cloud for auth, progress, daily boards, leaderboard and shared levels, with RLS scoped to `auth.uid()` and public read only on daily/leaderboard rows.
- AI tutor: local heuristic classifier decides *when* and *what kind* of hint; the AI gateway only phrases it. Keeps hints instant and cheap.
- PWA manifest + service worker so it installs on a phone for the demo.

## Cut list (if we run short)

Editor sharing goes first, then the leaderboard, then the daily puzzle. The core game, the tutor and the polish never get cut — those are what the judges score.
