import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listLevels from "./tools/list-levels";
import getLevel from "./tools/get-level";
import analyzePuzzle from "./tools/analyze-puzzle";
import generatePuzzle from "./tools/generate-puzzle";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "puzzle-genesis-engine",
  title: "Puzzle Genesis Engine",
  version: "0.1.0",
  instructions:
    "Tools for Prism, a light-refraction logic puzzle platform. Use `list_levels` and `get_level` to read the campaign, `analyze_puzzle` to solve and grade any puzzle share code, and `generate_puzzle` to evolve new verified-solvable puzzles.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  // Cast: the tools declare no outputSchema, which exactOptionalPropertyTypes
  // treats as an incompatible `undefined` property.
  tools: [listLevels, getLevel, analyzePuzzle, generatePuzzle] as never[],

});
