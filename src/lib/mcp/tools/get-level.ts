import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getLevel } from "@/game/levels";
import { encodeBoard } from "@/game/share";

export default defineTool({
  name: "get_level",
  title: "Get a level",
  description:
    "Fetch one Prism campaign level by id (for example '2-3'), including its board layout and a shareable puzzle code.",
  inputSchema: {
    levelId: z.string().describe("Level id such as '1-1' or '4-3'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ levelId }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Sign in to use Prism tools.");
    const level = getLevel(levelId.trim());
    if (!level) throw new ToolError(`No level with id "${levelId}".`);
    const payload = {
      id: level.id,
      name: level.name,
      chapter: level.chapter,
      par: level.par,
      hint: level.hint,
      teaches: level.teaches ?? null,
      shareCode: encodeBoard(level.board),
      board: level.board,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
