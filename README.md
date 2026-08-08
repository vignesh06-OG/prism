# PRISM

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TanStack Start](https://img.shields.io/badge/TanStack%20Start-v1-FF4154)](https://tanstack.com/start)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Hackathon](https://img.shields.io/badge/Puzzle%20Masters%20Hackathon-2026-8B5CF6)](https://)

> **A premium indie light-refraction puzzle platform where every interaction creates emotion.**

PRISM is a cinematic logic game about bending, splitting, and merging colored light. Built for the **Puzzle Masters Hackathon 2026**, it combines tactile optical physics, explainable AI, procedural puzzle evolution, and a living science-discovery layer into one polished experience.

---

## ✨ Why PRISM?

Most puzzle games teach you a mechanic and repeat it. PRISM teaches you a **principle**—then surprises you with what that principle makes possible.

- **Emotion-first design** — every click, win, and failure is choreographed with spring physics, bloom, and cinematic camera.
- **Real optical concepts** — additive color mixing, reflection, reciprocity, and material interactions (glass, water, crystal, fog).
- **Explainable AI** — PhotonMind predicts difficulty, visualizes its own reasoning, and evolves puzzles that are verified solvable.
- **No single right way** — levels support multiple solutions; efficiency medals reward deeper insight.

---

## 🎮 Core Mechanics

| Element | Description |
|---------|-------------|
| **Sources** | Emit red, green, or blue light beams. |
| **Mirrors** | Reflect beams at 90°. |
| **Prisms** | Split white light into RGB or recombine channels. |
| **Splitters** | Route color channels bidirectionally—usable in reverse for optical reciprocity. |
| **Targets** | Activate only when the correct color and intensity reach them. |
| **Materials** | Glass, water, crystal, and fog attenuate or scatter light. |

Combine these to solve **13 hand-crafted campaign levels** and an ever-growing set of procedurally generated labs.

---

## 🧠 PhotonMind AI / ML

PRISM ships with an integrated AI research layer:

- **Feature extraction** — 16-dimensional puzzle fingerprints (piece density, material variety, branching factor, etc.).
- **Difficulty prediction** — Ridge regression trained on solver-derived proxies.
- **Solve-time estimation** — Logistic regression with honest uncertainty bounds.
- **Search-tree visualization** — Watch the BFS solver explore the state space in real time.
- **Behavioral profiling** — Fixation, precision, and experimentation traits inferred from play.
- **Puzzle evolution** — Genetic algorithm generates, validates, and ranks new puzzles by difficulty and originality.

> **Technical honesty note:** Difficulty and solve-time models are trained on solver-derived proxies, not human-labeled data. In-game copy reflects this distinction.

---

## 🏗️ Architecture

```
PRISM
├── src/
│   ├── game/              # Physics engine, levels, validation, evolution
│   ├── components/         # UI components (game, studio, photonmind)
│   ├── routes/             # TanStack Start file routes
│   ├── hooks/              # Shared React hooks
│   ├── lib/                # Utilities and server functions
│   └── styles.css          # Tailwind v4 theme tokens
├── scripts/                # Training, validation, and analysis scripts
└── README.md
```

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/vignesh06-OG/prism.git
cd prism

# Install dependencies
bun install

# Start the dev server
bun run dev
```

Open [http://localhost:8080](http://localhost:8080) to play.

---

## 🧪 Key Modes

- **Campaign** — 13 levels with a strict cognitive difficulty curve.
- **Studio** — Visual editor to design and share custom puzzles.
- **Sandbox** — Physics playground for freeform experimentation.
- **Intelligence Lab** — PhotonMind dashboards, search-tree visualizer, and puzzle evolution pipeline.
- **Discoveries** — Learning journal that unlocks real-world optics cards as you play.
- **Experience** — Curated judge/demo flow.

---

## 🎨 Design Philosophy

> *"Every interaction must create emotion."*

- **Cinematic camera** — Smooth pans, focus shifts, and solve sequences.
- **AAA lighting** — Additive glow, bloom, and material-aware reflections.
- **Physical objects** — Pieces feel weighty and responsive.
- **Accessibility** — Color-blind glyphs, high-contrast mode, reduced motion, and keyboard controls.

---

## 📦 Tech Stack

- **Framework:** TanStack Start v1 + React 19
- **Styling:** Tailwind CSS v4
- **Motion:** Motion for React (Framer Motion v12)
- **State:** Zustand + TanStack Query
- **Backend:** Managed Postgres + auth (Supabase)
- **AI/ML:** Custom ridge/logistic regression with TensorFlow.js-style weights
- **Audio:** Procedural WebAudio synthesis

---

## 🏆 Built For

**Puzzle Masters Hackathon 2026**

Aiming for:
- 🥇 Best UI/UX
- 🥇 Most Innovative Gameplay
- 🥇 Best Use of AI/ML

---

## 🤝 Team

Built by **Vignesh** for the Puzzle Masters Hackathon 2026.

---

## 🧠 AI-Assisted Development

AI-assisted development tools were used during implementation, debugging, testing, and refinement.

The game systems, optical model, puzzle mechanics, level design, BFS validation logic, PhotonMind AI/ML methodology, and all final product decisions were designed, reviewed, and verified as part of this project.

---

## 📄 License

This project was created for the Puzzle Masters Hackathon 2026. All rights reserved by the authors.

---

<p align="center">
  <strong>Light is the puzzle. You are the prism.</strong>
</p>
