import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { CHAPTERS, LEVELS } from "@/game/levels";

export default defineTool({
  name: "list_levels",
  title: "List campaign levels",
  description:
    "List every Prism campaign level with its chapter, name, par move count and teaching note.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: (_input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Sign in to use Prism tools.");
    const levels = LEVELS.map((l) => ({
      id: l.id,
      chapter: l.chapter,
      chapterName: CHAPTERS[l.chapter - 1]?.name ?? `Chapter ${l.chapter}`,
      index: l.index,
      name: l.name,
      par: l.par,
      teaches: l.teaches ?? null,
      size: `${l.board.width}x${l.board.height}`,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(levels, null, 2) }],
      structuredContent: { levels },
    };
  },
});
