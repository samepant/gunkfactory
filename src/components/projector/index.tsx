import { useEffect, useRef, useState } from "react";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import clsx from "clsx";
import { GunkUnits } from "../../garments/garment";
import { fromCm, toCm } from "../../measurements";
import { Point } from "../../pattern/geometry.ts";
import { rectToQuad } from "../../pattern/homography.ts";
import { PieceDefs, PieceDrawing } from "../piece-drawing";
import { PlacedPiece, projectionClass } from "../piece-drawing/place.ts";
import classes from "./projector.module.css";

export interface FabricLayout {
  fabric: string;
  width: number; // cm across the fabric
  length: number; // cm used along the fabric
  placed: PlacedPiece[];
}

// the projected layer is drawn at PX_PER_CM, then one projective transform
// maps the calibration rectangle onto the four mat corners the user set.
// that single transform covers scale, rotation and keystone.
const PX_PER_CM = 20;

const defaultCorners = (w: number, h: number, sw: number, sh: number): Point[] => {
  let qw = sw * 0.7;
  let qh = (qw * h) / w;
  if (qh > sh * 0.7) {
    qh = sh * 0.7;
    qw = (qh * w) / h;
  }
  const x = (sw - qw) / 2;
  const y = (sh - qh) / 2;
  return [
    [x, y],
    [x + qw, y],
    [x + qw, y + qh],
    [x, y + qh],
  ];
};

const colors = { green: "#39ff14", white: "#ffffff" };

const toggleFullscreen = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
};

interface ProjectorProps {
  layouts: FabricLayout[];
  unit: GunkUnits;
  onExit: () => void;
}

const Projector = ({ layouts, unit, onExit }: ProjectorProps) => {
  const { width: screenWidth, height: screenHeight } = useWindowSize();
  // default mat: 24" x 18"
  const [mat, setMat] = useLocalStorage("projector-mat", { width: 60.96, height: 45.72 });
  const [corners, setCorners] = useLocalStorage<Point[] | null>("projector-corners", null);
  const [calibrating, setCalibrating] = useState(corners === null);
  const [activeCorner, setActiveCorner] = useState(0);
  const [fabricIndex, setFabricIndex] = useState(0);
  const [offset, setOffset] = useState<Point>([0, 0]);
  const [step, setStep] = useLocalStorage("projector-step", 10);
  const [color, setColor] = useLocalStorage<keyof typeof colors>("projector-color", "green");
  const [lineWidth, setLineWidth] = useLocalStorage("projector-line-width", 1); // mm
  const [showToolbar, setShowToolbar] = useState(true);
  const dragging = useRef<number | null>(null);

  const quad = corners ?? defaultCorners(mat.width, mat.height, screenWidth, screenHeight);
  const layout = layouts[Math.min(fabricIndex, layouts.length - 1)];
  const format = (cm: number) => `${+fromCm(cm, unit).toFixed(2)} ${unit}`;

  const setCorner = (i: number, p: Point) =>
    setCorners(quad.map((q, j) => (j === i ? p : q)));

  // moves the pattern on the table, so the fabric point under the mat's
  // top-left corner moves the other way
  const movePattern = (dx: number, dy: number) =>
    setOffset(([x, y]) => [x - dx, y - dy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const arrows: Record<string, Point> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const dir = arrows[e.key];
      if (e.key === "Escape") onExit();
      else if (e.key === "h") setShowToolbar((s) => !s);
      else if (e.key === "c") setCalibrating((c) => !c);
      else if (e.key === "f") toggleFullscreen();
      else if (dir && calibrating) {
        const n = e.shiftKey ? 10 : 1;
        const p = quad[activeCorner];
        setCorner(activeCorner, [p[0] + dir[0] * n, p[1] + dir[1] * n]);
      } else if (dir) movePattern(dir[0] * step, dir[1] * step);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const w = mat.width * PX_PER_CM;
  const h = mat.height * PX_PER_CM;
  const [vx, vy] = calibrating ? [0, 0] : offset;

  const gridStep = unit === "in" ? 2.54 : 5;
  const gridLines: string[] = [];
  for (let x = gridStep; x < mat.width - 0.01; x += gridStep) gridLines.push(`M${x},0L${x},${mat.height}`);
  for (let y = gridStep; y < mat.height - 0.01; y += gridStep) gridLines.push(`M0,${y}L${mat.width},${y}`);

  const rulerStep = unit === "in" ? 2.54 * 4 : 10;
  const rulerMarks: number[] = [];
  if (layout) for (let x = 0; x <= layout.length; x += rulerStep) rulerMarks.push(x);

  return (
    <div
      className={classes.projector}
      style={
        {
          "--line-color": colors[color],
          "--line-width": lineWidth / 10,
        } as React.CSSProperties
      }
    >
      <div
        className={classes.layer}
        style={{ width: w, height: h, transform: rectToQuad(w, h, quad) }}
      >
        <svg
          className={projectionClass}
          style={{ left: -w / 2, top: -h / 2, width: w * 2, height: h * 2 }}
          viewBox={`${vx - mat.width / 2} ${vy - mat.height / 2} ${mat.width * 2} ${mat.height * 2}`}
        >
          <PieceDefs />
          {calibrating && (
            <>
              <path d={gridLines.join("")} className={classes.calLine} />
              <rect width={mat.width} height={mat.height} className={classes.calBorder} />
              <path
                d={`M0,0L${mat.width},${mat.height}M${mat.width},0L0,${mat.height}`}
                className={classes.calLine}
              />
            </>
          )}
          {!calibrating && layout && (
            <>
              <rect width={layout.length} height={layout.width} className={classes.fabricEdge} />
              {rulerMarks.map((x) => (
                <g key={x}>
                  <path d={`M${x},-1L${x},0M${x},${layout.width}L${x},${layout.width + 1}`} className={classes.tick} />
                  <text x={x} y={-1.5} className={classes.rulerLabel}>
                    {+fromCm(x, unit).toFixed(1)}
                  </text>
                </g>
              ))}
              {layout.placed.map((placed) => (
                <PieceDrawing key={placed.piece.name} placed={placed} />
              ))}
            </>
          )}
        </svg>
      </div>

      {calibrating &&
        quad.map((p, i) => (
          <div
            key={i}
            className={clsx(classes.handle, i === activeCorner && classes.activeHandle)}
            style={{ left: p[0], top: p[1] }}
            onPointerDown={(e) => {
              setActiveCorner(i);
              dragging.current = i;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (dragging.current === i) setCorner(i, [e.clientX, e.clientY]);
            }}
            onPointerUp={(e) => {
              dragging.current = null;
              e.currentTarget.releasePointerCapture(e.pointerId);
            }}
          />
        ))}

      {showToolbar && (
        <div className={classes.toolbar}>
          <div className={classes.row}>
            <button onClick={() => setCalibrating(!calibrating)}>
              {calibrating ? "done calibrating" : "calibrate"}
            </button>
            <button onClick={toggleFullscreen}>fullscreen</button>
            <button onClick={onExit}>exit</button>
          </div>

          {calibrating ? (
            <>
              <div className={classes.row}>
                <label>mat</label>
                <input
                  type="number"
                  step="any"
                  defaultValue={+fromCm(mat.width, unit).toFixed(3)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0) setMat({ ...mat, width: toCm(v, unit) });
                  }}
                />
                <span>×</span>
                <input
                  type="number"
                  step="any"
                  defaultValue={+fromCm(mat.height, unit).toFixed(3)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0) setMat({ ...mat, height: toCm(v, unit) });
                  }}
                />
                <span>{unit}</span>
              </div>
              <p className={classes.hint}>
                Drag the corners onto your mat's rectangle. Click a corner, then use the arrow keys to nudge it
                (shift = 10px). Check the grid lines match the mat's lines.
              </p>
              <button onClick={() => setCorners(null)}>reset corners</button>
            </>
          ) : (
            <>
              <div className={classes.row}>
                <select value={fabricIndex} onChange={(e) => setFabricIndex(Number(e.target.value))}>
                  {layouts.map((l, i) => (
                    <option key={l.fabric} value={i}>
                      {l.fabric} ({format(l.length)})
                    </option>
                  ))}
                </select>
              </div>
              <div className={classes.row}>
                <label>move</label>
                <input
                  type="number"
                  step="any"
                  defaultValue={+fromCm(step, unit).toFixed(3)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0) setStep(toCm(v, unit));
                  }}
                />
                <span>{unit}</span>
                <button onClick={() => movePattern(-step, 0)}>←</button>
                <button onClick={() => movePattern(step, 0)}>→</button>
                <button onClick={() => movePattern(0, -step)}>↑</button>
                <button onClick={() => movePattern(0, step)}>↓</button>
              </div>
              <p>
                mat top-left is at fabric {format(offset[0])} along, {format(offset[1])} across
              </p>
              <div className={classes.row}>
                <button onClick={() => setColor(color === "green" ? "white" : "green")}>{color} lines</button>
                <label>width</label>
                <input
                  type="number"
                  step="0.1"
                  defaultValue={lineWidth}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0) setLineWidth(v);
                  }}
                />
                <span>mm</span>
              </div>
            </>
          )}
          <p className={classes.hint}>h hide · c calibrate · f fullscreen · arrows move · esc exit</p>
        </div>
      )}
    </div>
  );
};

export default Projector;
