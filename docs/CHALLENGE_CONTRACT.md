# Friend Challenge — contract (not shipped)

Prism ships **no** friend-challenge or challenge-creator feature. Nothing in the
UI claims one. This file records the contract we would build against, so the
feature can be added later without guesswork — and so the audit trail is honest
about what exists today.

## What already exists and is verified

- `src/game/share.ts` — deterministic board serialisation to a `PRISM-XXXX-…`
  base32 code, plus decode. Round-trips are covered by the level validator.
- `src/routes/studio.index.tsx` — a working board editor.
- BFS analyser (`src/game/analysis.ts`) — returns `minMoves` and a difficulty
  score, and rejects unsolvable boards.

A share code is therefore already a complete, self-contained challenge payload;
it needs no backend to be passed between two people.

## Contract for a future implementation

Client-only path (preferred, no account required):

```
/play/shared/$code   →  decodeBoard(code) → validate with analysis → play
```

Rules any implementation must keep:

1. **Never trust the code.** Decode inside a try/catch, bound board dimensions
   (max 12x12), cap element count, and run the BFS analyser before rendering.
   An unsolvable or oversized board is rejected with a plain message, not a crash.
2. **No score claims without a server.** A locally reported "friend's time" is
   unverifiable; label it as self-reported or omit it.
3. If leaderboards are ever added, the row must be written by a server function
   with `requireSupabaseAuth`, keyed by `(user_id, code)`, under RLS that lets a
   user write only their own row. Client-side inserts of scores are not acceptable.

## Why it is not built

The Round-2 scope prioritised gameplay depth and educational payload. A
half-built social layer with unverifiable scores would weaken the submission's
technical honesty more than its absence does.
