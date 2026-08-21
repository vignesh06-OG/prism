/**
 * A tiny declarative scene format shared by every Field Mission.
 *
 * Missions are pure geometry: each one returns a list of primitives in a
 * 100 x 60 world box, and the stage draws them. No mission owns a renderer,
 * so every scenario inherits the same optical look as the puzzle board.
 */
export type SceneEl =
  | {
      t: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      dash?: boolean;
      w?: number;
      glow?: boolean;
    }
  | { t: "poly"; pts: Array<[number, number]>; color: string; fill?: string }
  | { t: "rect"; x: number; y: number; w: number; h: number; color: string; fill?: string }
  | { t: "dot"; x: number; y: number; color: string; r?: number; ring?: boolean }
  | {
      t: "text";
      x: number;
      y: number;
      text: string;
      color?: string;
      anchor?: "start" | "middle" | "end";
      size?: number;
    };

export const RAD = Math.PI / 180;
export const DEG = 180 / Math.PI;
export const clampAsin = (v: number) => Math.asin(Math.max(-1, Math.min(1, v)));
export const round = (v: number, d = 1) => Number(v.toFixed(d));
