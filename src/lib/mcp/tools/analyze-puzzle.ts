import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { analyse } from "@/game/analysis";
import { genome } from "@/game/genome";
import { getLevel } from "@/game/levels";
import { decodeBoard, encodeBoard } from "@/game/share";

export default defineTool({
  name: "analyze_puzzle",
  title: "Analyze a puzzle",
  description:
    "Run the Prism solver on a puzzle (share code or campaign level id) and report solvability, minimum moves, uniqueness, difficulty rating and complexity genome.",
  inputSchema: {
    puzzle: z
      .string()
      .describe("A PRISM-... share code, or a campaign level id such as '3-2'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ puzzle }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Sign in to use Prism tools.");
    const raw = puzzle.trim();
    const board = getLevel(raw)?.board ?? decodeBoard(raw);
    if (!board) throw new ToolError("Could not read that puzzle: pass a valid share code or level id.");

    const a = analyse(board);
    const g = genome(board, a.minMoves);
    const payload = {
      solvable: a.solvable,
      minMoves: a.minMoves,
      solutionCount: a.solutionCount,
      unique: a.unique,
      exhaustive: a.exhaustive,
      rating: a.rating,
      confidence: a.confidence,
      difficultyScore: a.difficultyScore,
      estimatedSeconds: a.estimatedSeconds,
      statesExplored: a.statesExplored,
      issues: a.issues,
      factors: a.factors,
      genome: g,
      solutionShareCode: a.solutionBoard ? encodeBoard(a.solutionBoard) : null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
