import type { Point } from "../pattern/geometry";
import type { Piece } from "../pattern/pattern";

export type Vec3 = [number, number, number];
export interface BodyOptions { depth: number; shoulderSlope: number; armAngle: number }
export const defaultBodyOptions: BodyOptions = { depth: 0.66, shoulderSlope: 18, armAngle: 30 };
export interface Ring { y: number; rx: number; rz: number }
export interface Arm { a: Vec3; b: Vec3; r0: number; r1: number }
export interface Body {
  rings: Ring[];
  arms: Arm[];
  neckY: number;
  shoulder: Vec3;
  wrist: Vec3;
  chest: number;
  assumptions: string[];
  measurements: { label: string; cm: number; source: "measured" | "derived" | "assumed" }[];
}
export type Region = "front" | "back" | "front sleeve" | "back sleeve" | "collar";
export interface Placement { region: Region; offset: Vec3 }
export interface Panel {
  id: string;
  source: string;
  side: -1 | 1;
  piece: Piece;
  color: string;
  openings?: number[];
  placement: Placement;
}
export interface EdgeRef { panel: string; edge: number; reverse?: boolean }
export type Landmark = "left shoulder" | "right shoulder" | "back neck" | "left wrist" | "right wrist";
export interface BodyContact { id: string; point: EdgeRef; at: number; landmark: Landmark }
export interface Seam {
  id: string;
  label: string;
  a: EdgeRef[];
  b: EdgeRef[];
  reverse: boolean;
  enabled: boolean;
  kind: "sewn" | "fold" | "closure";
}
export interface Assembly {
  schema: 1;
  garment: string;
  version: string;
  topology: string;
  seams: Seam[];
  contacts: BodyContact[];
  placements: Record<string, Placement>;
}
export interface PanelMesh {
  panel: Panel;
  points: Point[];
  triangles: number[];
  edges: number[][];
  start: number;
}
export interface Link { a: number; b: number; rest: number; bend: boolean }
export interface Stitch { ids: number[]; weights: number[]; seam: string }
export interface SolverOptions { timeStep: number; iterations: number }
export const defaultSolverOptions: SolverOptions = { timeStep: 1 / 480, iterations: 3 };
export interface Triangle { ids: [number, number, number]; restArea: number }
export interface SimulationInput {
  positions: Float32Array;
  links: Link[];
  stitches: Stitch[];
  pins: number[];
  body: Body;
  material: "canvas" | "soft";
  solver?: SolverOptions;
  faces?: Triangle[];
}
export interface Metrics {
  steps: number; seamGap: number; meanStrain: number; maxStrain: number;
  maxStretch: number; maxCompression: number; collapsedFaces: number;
  penetration: number; stepMs: number; motion: number; speed: number;
}
export interface SimulationFrame { positions: Float32Array; strain: Float32Array; extension: Float32Array; compression: Float32Array; seamGaps: Record<string, number>; metrics: Metrics }
