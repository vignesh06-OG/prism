import { motion } from "motion/react";
import { useMemo } from "react";
import type { SearchTrace } from "@/game/photonmind/search";
import { cn } from "@/lib/utils";

interface Props {
  trace: SearchTrace;
  reduceMotion?: boolean;
  className?: string;
}

const STATUS_COLOR: Record<string, string> = {
  root: "var(--beam-white)",
  open: "var(--beam-blue)",
  deadend: "var(--beam-red)",
  onPath: "var(--beam-cyan)",
  solution: "var(--beam-green)",
};

/**
 * Draws the real BFS frontier as a radial tree: depth is the ring, siblings
 * fan across the arc, dead ends fade red and the winning branch lights up.
 */
export function SearchVisualizer({ trace, reduceMotion = false, className }: Props) {
  const layout = useMemo(() => {
    const byDepth = new Map<number, number[]>();
    trace.nodes.forEach((n) => {
      const list = byDepth.get(n.depth) ?? [];
      list.push(n.id);
      byDepth.set(n.depth, list);
    });
    const maxDepth = Math.max(1, ...trace.nodes.map((n) => n.depth));
    const pos = new Map<number, { x: number; y: number }>();
    for (const [depth, ids] of byDepth) {
      const r = (depth / maxDepth) * 128;
      ids.forEach((id, i) => {
        const a = (i / Math.max(1, ids.length)) * Math.PI * 2 - Math.PI / 2 + depth * 0.22;
        pos.set(id, { x: 150 + Math.cos(a) * r, y: 150 + Math.sin(a) * r });
      });
    }
    return pos;
  }, [trace]);

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox="0 0 300 300"
        className="h-full w-full"
        role="img"
        aria-label={`Search tree: ${trace.expanded.toLocaleString()} states expanded, ${trace.solutionId === null ? "no solution found" : `solution at depth ${trace.depth}`}`}
      >
        <defs>
          <radialGradient id="pm-core">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="150" cy="150" r="140" fill="url(#pm-core)" />
        {[0.33, 0.66, 1].map((f) => (
          <circle
            key={f}
            cx="150"
            cy="150"
            r={128 * f}
            fill="none"
            stroke="var(--border)"
            strokeDasharray="2 6"
          />
        ))}

        {trace.nodes.map((n) => {
          const a = layout.get(n.id);
          const p = n.parent === null ? null : layout.get(n.parent);
          if (!a || !p) return null;
          const onPath = n.status === "onPath" || n.status === "solution";
          return (
            <motion.line
              key={`e${n.id}`}
              x1={p.x}
              y1={p.y}
              x2={a.x}
              y2={a.y}
              stroke={onPath ? "var(--beam-cyan)" : "var(--border)"}
              strokeWidth={onPath ? 1.6 : 0.6}
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: onPath ? 0.95 : 0.4 }}
              transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : n.depth * 0.16 + (n.id % 24) * 0.008 }}
            />
          );
        })}

        {trace.nodes.map((n) => {
          const a = layout.get(n.id);
          if (!a) return null;
          const solved = n.status === "solution";
          return (
            <motion.circle
              key={`n${n.id}`}
              cx={a.x}
              cy={a.y}
              r={solved ? 5.5 : n.status === "root" ? 4.5 : 1.9 + n.heuristic * 2.2}
              fill={STATUS_COLOR[n.status] ?? "var(--beam-blue)"}
              opacity={n.status === "deadend" ? 0.35 : 0.9}
              initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: n.status === "deadend" ? 0.35 : 0.9 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 18,
                delay: reduceMotion ? 0 : n.depth * 0.16 + (n.id % 24) * 0.008,
              }}
              style={{ filter: solved ? "drop-shadow(0 0 8px var(--beam-green))" : "none" }}
            />
          );
        })}
      </svg>

      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {([
          ["Frontier", "open"],
          ["Dead end", "deadend"],
          ["Optimal path", "onPath"],
          ["Solved state", "solution"],
        ] as const).map(([label, status]) => (
          <li key={status} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: STATUS_COLOR[status] }}
              aria-hidden="true"
            />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
