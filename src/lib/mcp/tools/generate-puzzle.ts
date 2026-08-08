import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { evolvePuzzles } from "@/game/evolve";
import { encodeBoard } from "@/game/share";

export default defineTool({
  name: "generate_puzzle",
  title: "Generate puzzles",
  description:
    "Evolve new Prism puzzles deterministically from a seed. Every returned puzzle is verified solvable and comes with a share code that opens in the app's Studio.",
  inputSchema: {
    seed: z.number().int().describe("Seed for the deterministic generator."),
    targetComplexity: z
      .number()
      .describe("Desired difficulty band from 0 (trivial) to 100 (master)."),
    size: z.number().int().describe("Board width and height in cells, typically 5 to 9."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ seed, targetComplexity, size }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Sign in to use Prism tools.");
    const dim = Math.min(11, Math.max(4, Math.round(size)));
    const complexity = Math.min(100, Math.max(0, Math.round(targetComplexity)));
    const { kept, tested, rejected } = evolvePuzzles({
      seed: Math.trunc(seed),
      targetComplexity: complexity,
      width: dim,
      height: dim,
    });
    const puzzles = kept.map((c) => ({
      shareCode: encodeBoard(c.board),
      fitness: c.fitness,
      minMoves: c.analysis.minMoves,
      rating: c.analysis.rating,
      unique: c.analysis.unique,
      complexity: c.genome.complexity,
      generation: c.generation,
    }));
    const payload = { tested, rejected, kept: puzzles.length, puzzles };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
