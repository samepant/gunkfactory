import { useEffect, useMemo, useRef, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Garment, GunkUnits } from "../../garments/garment";
import { formatLength, fromCm, toCm } from "../../measurements";
import { packFabrics, useDraft, useFabricSettings } from "../../hooks/useDraft";
import { Point } from "../../pattern/geometry.ts";
import { Check, Piece } from "../../pattern/pattern";
import { PieceDefs, PieceDrawing } from "../piece-drawing";
import { PlacedPiece, placePiece } from "../piece-drawing/place.ts";
import Projector, { FabricLayout } from "../projector";
import classes from "./pattern-view.module.css";

// everything inside the svg is in cm; `scale` is screen px per cm
interface View {
  x: number;
  y: number;
  scale: number;
}

const GAP = 6;
const ROW_WIDTH = 220;

const layoutPieces = (pieces: Piece[]) => {
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  let width = 0;
  const placed: PlacedPiece[] = pieces.map((piece) => {
    const drawn = placePiece(piece);
    const { minX, maxX, minY, maxY } = drawn.bounds;
    if (x > 0 && x + maxX - minX > ROW_WIDTH) {
      x = 0;
      y += rowHeight + GAP;
      rowHeight = 0;
    }
    const offset: Point = [x - minX, y - minY];
    x += maxX - minX + GAP;
    width = Math.max(width, x);
    rowHeight = Math.max(rowHeight, maxY - minY);
    return { ...drawn, offset };
  });
  return { placed, width, height: y + rowHeight };
};

type Mode = "pattern" | "packing";

const FABRIC_SPACING = 30;

const CheckRow = ({ check, unit }: { check: Check; unit: GunkUnits }) => (
  <li className={clsx(classes.check, check.warn && classes.warn)}>
    <span>{check.label}</span>
    <span>{check.cm !== undefined ? formatLength(check.cm, unit) : check.text}</span>
  </li>
);

const PatternView = ({ garment }: { garment: Garment }) => {
  const { slopers, sloper, setSloperName, unit, params, savedParams, setSavedParams, result } =
    useDraft(garment);
  const [resetCount, setResetCount] = useState(0);

  // --- packing: every copy to cut, nested per fabric
  const [mode, setMode] = useState<Mode>("pattern");
  const [projecting, setProjecting] = useState(false);
  const { fabricWidths, setFabricWidths, allowRotate, setAllowRotate, fabricWidth } =
    useFabricSettings();

  const packing = useMemo(() => {
    if (!result.draft || (mode !== "packing" && !projecting)) return null;
    return packFabrics(result.draft.pieces, result.fabrics, fabricWidth, allowRotate);
  }, [result, mode, projecting, fabricWidth, allowRotate]);

  // what the canvas shows: the pieces laid out, or each fabric with its packing
  const scene = useMemo(() => {
    if (mode === "pattern") {
      if (!result.draft) return null;
      return { ...layoutPieces(result.draft.pieces), fabrics: [] };
    }
    if (!packing?.layouts) return null;
    let y = 0;
    const fabrics: (FabricLayout & { y: number })[] = [];
    const placed: PlacedPiece[] = [];
    for (const layout of packing.layouts) {
      fabrics.push({ ...layout, y });
      placed.push(...layout.placed.map((p) => ({ ...p, offset: [0, y] as Point })));
      y += layout.width + FABRIC_SPACING;
    }
    const width = Math.max(...fabrics.map((f) => f.length));
    return { placed, fabrics, width, height: y - FABRIC_SPACING };
  }, [mode, result, packing]);

  const startProjecting = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setProjecting(true);
  };

  const stopProjecting = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    setProjecting(false);
  };

  // --- pan and zoom
  const { width: screenWidth, height: screenHeight } = useWindowSize();
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View | null>(null);

  useEffect(() => setView(null), [mode]);

  useEffect(() => {
    if (view || !scene || !screenWidth) return;
    const scale = Math.min(
      (screenWidth - 300) / (scene.width + 20),
      (screenHeight - 60) / (scene.height + 30)
    );
    setView({ x: -10, y: -20, scale });
  }, [view, scene, screenWidth, screenHeight]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => {
        if (!v) return v;
        const scale = v.scale * Math.exp(-e.deltaY * 0.002);
        const cx = v.x + e.clientX / v.scale;
        const cy = v.y + e.clientY / v.scale;
        return { scale, x: cx - e.clientX / scale, y: cy - e.clientY / scale };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const dragging = useRef(false);

  const gridMinor = unit === "in" ? 2.54 : 1;
  const gridMajor = unit === "in" ? 2.54 * 12 : 10;

  if (projecting && packing?.layouts) {
    return <Projector layouts={packing.layouts} unit={unit} onExit={stopProjecting} />;
  }

  return (
    <>
      <svg
        ref={svgRef}
        className={classes.canvas}
        viewBox={
          view
            ? `${view.x} ${view.y} ${screenWidth / view.scale} ${screenHeight / view.scale}`
            : "0 0 100 100"
        }
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          setView((v) =>
            v && { ...v, x: v.x - e.movementX / v.scale, y: v.y - e.movementY / v.scale }
          );
        }}
      >
        <defs>
          <pattern id="grid-minor" width={gridMinor} height={gridMinor} patternUnits="userSpaceOnUse">
            <path d={`M${gridMinor},0L0,0L0,${gridMinor}`} className={classes.gridMinor} />
          </pattern>
          <pattern id="grid-major" width={gridMajor} height={gridMajor} patternUnits="userSpaceOnUse">
            <rect width={gridMajor} height={gridMajor} fill="url(#grid-minor)" />
            <path d={`M${gridMajor},0L0,0L0,${gridMajor}`} className={classes.gridMajor} />
          </pattern>
        </defs>
        <PieceDefs />
        <rect x={-500} y={-500} width={2000} height={2000} fill="url(#grid-major)" />
        {scene?.fabrics.map((f) => (
          <g key={f.fabric}>
            <rect x={0} y={f.y} width={f.length} height={f.width} className={classes.fabric} />
            <text x={0} y={f.y - 2} className={classes.fabricLabel}>
              {f.fabric} · {formatLength(f.width, unit)} wide · {formatLength(f.length, unit)} used
            </text>
          </g>
        ))}
        {scene?.placed.map((placed) => (
          <PieceDrawing key={placed.piece.name} placed={placed} />
        ))}
      </svg>

      <div className={classes.panel}>
        <div className={classes.section}>
          <div className={classes.header}>Mode</div>
          <div className={classes.modes}>
            <button className={clsx(mode === "pattern" && classes.active)} onClick={() => setMode("pattern")}>
              pattern
            </button>
            <button className={clsx(mode === "packing" && classes.active)} onClick={() => setMode("packing")}>
              packing
            </button>
            <button onClick={startProjecting} disabled={!result.draft}>
              project
            </button>
            <Link to={`/techpack/${garment.slug}`} className="button">
              tech pack
            </Link>
          </div>
        </div>

        <div className={classes.section}>
          <div className={classes.header}>Sloper</div>
          <select
            value={sloper?.name ?? ""}
            onChange={(e) => setSloperName(e.target.value)}
          >
            {slopers.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.unit})
              </option>
            ))}
          </select>
        </div>

        {result.error && <p className={classes.error}>{result.error}</p>}

        {mode === "packing" && result.fabrics && (
          <div className={classes.section}>
            <div className={classes.header}>Fabric (usable width, {unit})</div>
            {packing?.error && <p className={classes.error}>{packing.error}</p>}
            <ul key={unit}>
              {result.fabrics.map((fabric) => (
                <li key={fabric} className={classes.param}>
                  <label>
                    {fabric}
                    {packing?.layouts && ` · ${formatLength(packing.layouts.find((l) => l.fabric === fabric)?.length ?? 0, unit)} used`}
                  </label>
                  <input
                    type="number"
                    step="any"
                    defaultValue={+fromCm(fabricWidth(fabric), unit).toFixed(3)}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value > 0) setFabricWidths({ ...fabricWidths, [fabric]: toCm(value, unit) });
                    }}
                  />
                </li>
              ))}
              <li className={classes.param}>
                <label>allow 180° turns (no nap)</label>
                <input
                  type="checkbox"
                  checked={allowRotate}
                  onChange={(e) => setAllowRotate(e.target.checked)}
                />
              </li>
            </ul>
          </div>
        )}

        {result.draft && (
          <div className={classes.section}>
            <div className={classes.header}>Checks</div>
            <ul>
              {result.draft.checks.map((check) => (
                <CheckRow key={check.label} check={check} unit={unit} />
              ))}
            </ul>
          </div>
        )}

        <div className={classes.section}>
          <div className={classes.header}>Instructions</div>
          <p className={classes.instructions}>{garment.instructions}</p>
        </div>

        <div className={classes.section}>
          <div className={classes.header}>
            <span>Params</span>
            <button
              onClick={() => {
                setSavedParams({});
                setResetCount(resetCount + 1);
              }}
            >
              reset
            </button>
          </div>
          <ul key={`${unit}-${resetCount}`}>
            {garment.params.map((param) => (
              <li key={param.slug} className={classes.param}>
                <label>
                  {param.name}
                  {param.type === "length" && ` (${unit})`}
                </label>
                {param.type === "select" ? (
                  <select
                    value={params[param.slug]}
                    onChange={(e) =>
                      setSavedParams({ ...savedParams, [param.slug]: e.target.value })
                    }
                  >
                    {param.options?.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    step="any"
                    defaultValue={
                      param.type === "length"
                        ? +fromCm(params[param.slug] as number, unit).toFixed(3)
                        : params[param.slug]
                    }
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (e.target.value === "" || Number.isNaN(value)) return;
                      setSavedParams({
                        ...savedParams,
                        [param.slug]: param.type === "length" ? toCm(value, unit) : value,
                      });
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};

export default PatternView;
