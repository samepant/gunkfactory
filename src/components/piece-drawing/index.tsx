import clsx from "clsx";
import { Point } from "../../pattern/geometry.ts";
import { cutLabel } from "../../pattern/production.ts";
import { path, PlacedPiece } from "./place.ts";
import classes from "./piece-drawing.module.css";

const closestOnOutline = (p: Point, outline: Point[]): Point => {
  let best: Point = outline[0];
  let bestDist = Infinity;
  outline.forEach((a, i) => {
    const b = outline[(i + 1) % outline.length];
    const ab: Point = [b[0] - a[0], b[1] - a[1]];
    const lenSq = ab[0] * ab[0] + ab[1] * ab[1] || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / lenSq));
    const q: Point = [a[0] + ab[0] * t, a[1] + ab[1] * t];
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < bestDist) {
      bestDist = d;
      best = q;
    }
  });
  return best;
};

// svg <defs> the drawings rely on; render once per svg
export const PieceDefs = () => (
  <defs>
    <marker id="grain" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="1.5" markerHeight="1.5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
      <path d="M0,0L10,5L0,10" className={classes.grainHead} />
    </marker>
  </defs>
);

export const PieceDrawing = ({ placed }: { placed: PlacedPiece }) => {
  const { piece, cut, offset, center } = placed;
  return (
    <g transform={`translate(${offset[0]},${offset[1]})`}>
      <path d={path(cut, true)} className={classes.cut} />
      {piece.edges.map((edge, i) => (
        <path
          key={i}
          d={path(edge.points)}
          className={edge.fold ? classes.fold : classes.seam}
        />
      ))}
      <path d={path(piece.grain)} className={classes.grain} markerStart="url(#grain)" markerEnd="url(#grain)" />
      {piece.notches.map((n, i) => (
        <path key={i} d={path([n, closestOnOutline(n, cut)])} className={classes.notch} />
      ))}
      {piece.marks.map((mark, i) =>
        mark.kind === "cross" ? (
          <path
            key={i}
            className={classes.mark}
            d={mark.points
              .map(([x, y]) => `M${x - 0.6},${y}L${x + 0.6},${y}M${x},${y - 0.6}L${x},${y + 0.6}`)
              .join("")}
          />
        ) : (
          <path
            key={i}
            d={path(mark.points)}
            className={clsx(classes.mark, mark.kind === "dash" && classes.dashed)}
          />
        )
      )}
      <text x={center[0]} y={center[1]} className={classes.label}>
        {piece.name}
      </text>
      <text x={center[0]} y={center[1] + 2} className={classes.cutLabel}>
        {cutLabel(piece.cut)}
      </text>
    </g>
  );
};
