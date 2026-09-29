import { offsetOutline, Point } from "../../pattern/geometry.ts";
import { Piece } from "../../pattern/pattern";
import classes from "./piece-drawing.module.css";

export interface PlacedPiece {
  piece: Piece;
  cut: Point[];
  offset: Point;
  center: Point;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export const placePiece = (piece: Piece, offset: Point = [0, 0]): PlacedPiece => {
  const cut = offsetOutline(piece.edges);
  const xs = cut.map((p) => p[0]);
  const ys = cut.map((p) => p[1]);
  const bounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
  return {
    piece,
    cut,
    offset,
    center: [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2],
    bounds,
  };
};

export const path = (pts: Point[], closed = false) =>
  "M" + pts.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join("L") + (closed ? "Z" : "");

// wrap drawings in this to draw them for the projector: fixed physical line
// widths and a single high-contrast colour (--line-width in cm, --line-color)
export const projectionClass = classes.projection;

