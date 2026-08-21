import type { SceneEl } from "@/game/missions/scene";

/**
 * The Field Mission viewport. It draws the same optical materials as the
 * puzzle board — hairline apparatus, glowing rays, dim ghosts for the things
 * light only appears to do.
 */
export function MissionStage({
  elements,
  label,
  reduceMotion = false,
}: {
  elements: SceneEl[];
  label: string;
  reduceMotion?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 60"
      className="block h-full w-full"
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="mission-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={reduceMotion ? 0.4 : 0.9} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {elements.map((el, i) => {
        switch (el.t) {
          case "rect":
            return (
              <rect
                key={i}
                x={el.x}
                y={el.y}
                width={el.w}
                height={el.h}
                fill={el.fill ?? "none"}
                stroke={el.color === "transparent" ? "none" : el.color}
                strokeWidth={0.3}
              />
            );
          case "poly":
            return (
              <polygon
                key={i}
                points={el.pts.map(([x, y]) => `${x},${y}`).join(" ")}
                fill={el.fill ?? "none"}
                stroke={el.color}
                strokeWidth={0.4}
              />
            );
          case "line":
            return (
              <line
                key={i}
                x1={el.x1}
                y1={el.y1}
                x2={el.x2}
                y2={el.y2}
                stroke={el.color}
                strokeWidth={el.w ?? 0.6}
                strokeLinecap="round"
                strokeDasharray={el.dash ? "1.4 1.6" : undefined}
                filter={el.glow ? "url(#mission-glow)" : undefined}
              />
            );
          case "dot":
            return (
              <g key={i}>
                {el.ring ? (
                  <circle cx={el.x} cy={el.y} r={(el.r ?? 2) + 1.6} fill="none" stroke={el.color} strokeWidth={0.3} opacity={0.5} />
                ) : null}
                <circle cx={el.x} cy={el.y} r={el.r ?? 1.6} fill={el.color} filter="url(#mission-glow)" />
              </g>
            );
          case "text":
            return (
              <text
                key={i}
                x={el.x}
                y={el.y}
                fill={el.color ?? "currentColor"}
                fontSize={el.size ?? 2.8}
                textAnchor={el.anchor ?? "start"}
                className="fill-current font-medium tracking-[0.08em] text-muted-foreground"
                style={el.color ? { fill: el.color } : undefined}
              >
                {el.text}
              </text>
            );
          default:
            return null;
        }
      })}
    </svg>
  );
}
