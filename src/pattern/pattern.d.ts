import type { Point } from "./geometry.ts";

// one seam or edge of a piece. edges are listed in order around the piece,
// each starting where the previous one ends. all lengths are in cm.
export interface Edge {
  points: Point[];
  sa: number; // seam allowance, 0 for a fold
  fold?: boolean;
}

export interface Mark {
  kind: "line" | "dash" | "cross";
  points: Point[];
}

export interface Cut {
  fabric: string; // pieces are packed per fabric
  count: number;
  mirror?: boolean; // every second copy is mirrored
  fold?: boolean; // the fold edge gets unfolded for single-layer cutting
}

export interface Piece {
  name: string;
  cut: Cut;
  edges: Edge[];
  grain: [Point, Point];
  notches: Point[]; // on the seam line
  marks: Mark[];
}

export interface Check {
  label: string;
  cm?: number; // shown in the sloper's unit
  text?: string;
  warn?: boolean;
}

// flat drawing of the garment as worn, in drafting coordinates. the
// wearer's left is on the viewer's right in the front view.
export interface SketchLine {
  points: Point[];
  closed?: boolean;
  kind?: "outline" | "stitch" | "detail";
}

export interface Callout {
  at: Point;
  text: string;
}

export interface Sketch {
  lines: SketchLine[];
  callouts: Callout[];
}

// a point of measure on the finished garment
export interface Measure {
  label: string;
  cm: number;
  tolerance?: number; // ± cm
}

export interface Trim {
  name: string;
  count: number;
  cm?: number; // length, for zips and tapes
  description?: string;
}

export interface DraftResult {
  pieces: Piece[];
  checks: Check[];
  views?: { front: Sketch; back: Sketch };
  measures?: Measure[];
  trims?: Trim[];
}
