import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import garments from "../../garments";
import { Garment, GarmentParams, GunkUnits } from "../../garments/garment";
import { formatLength } from "../../measurements";
import { packFabrics, useDraft, useFabricSettings } from "../../hooks/useDraft";
import { Point } from "../../pattern/geometry.ts";
import { Callout, DraftResult, Sketch } from "../../pattern/pattern";
import { cutLabel } from "../../pattern/production.ts";
import { path, placePiece } from "../piece-drawing/place.ts";
import classes from "./techpack.module.css";

type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

const boundsOf = (points: Point[]): Bounds => ({
  minX: Math.min(...points.map((p) => p[0])),
  maxX: Math.max(...points.map((p) => p[0])),
  minY: Math.min(...points.map((p) => p[1])),
  maxY: Math.max(...points.map((p) => p[1])),
});

const GUTTER = 14; // cm either side of a flat drawing for callout bubbles

// spreads the bubbles on one side so they don't overlap
const placeBubbles = (callouts: { at: Point; n: number }[], x: number, r: number) => {
  const sorted = [...callouts].sort((a, b) => a.at[1] - b.at[1]);
  let lastY = -Infinity;
  return sorted.map((c) => {
    const y = Math.max(c.at[1], lastY + r * 2.4);
    lastY = y;
    return { ...c, bubble: [x, y] as Point };
  });
};

const Flat = ({
  sketch,
  bounds,
  firstNumber,
}: {
  sketch: Sketch;
  bounds: Bounds;
  firstNumber: number;
}) => {
  const width = bounds.maxX - bounds.minX + GUTTER * 2;
  const r = width * 0.022; // bubble size follows the drawing's scale
  const numbered = sketch.callouts.map((c: Callout, i) => ({ at: c.at, n: firstNumber + i }));
  const bubbles = [
    ...placeBubbles(numbered.filter((c) => c.at[0] < 0), bounds.minX - GUTTER / 2, r),
    ...placeBubbles(numbered.filter((c) => c.at[0] >= 0), bounds.maxX + GUTTER / 2, r),
  ];
  const height = bounds.maxY - bounds.minY + 6;
  return (
    <svg
      className={classes.flat}
      viewBox={`${bounds.minX - GUTTER} ${bounds.minY - 3} ${width} ${height}`}
    >
      {sketch.lines.map((line, i) => (
        <path
          key={i}
          d={path(line.points, line.closed)}
          className={classes[line.kind ?? "outline"]}
        />
      ))}
      {bubbles.map((b) => (
        <g key={b.n}>
          <path d={path([b.bubble, b.at])} className={classes.leader} />
          <circle cx={b.at[0]} cy={b.at[1]} r={r * 0.22} className={classes.leaderDot} />
          <circle cx={b.bubble[0]} cy={b.bubble[1]} r={r} className={classes.bubble} />
          <text x={b.bubble[0]} y={b.bubble[1] + r * 0.4} fontSize={r * 1.15} className={classes.bubbleText}>
            {b.n}
          </text>
        </g>
      ))}
    </svg>
  );
};

const Header = ({ garment, sloperName, page }: { garment: Garment; sloperName: string; page: string }) => (
  <header className={classes.header}>
    <div>
      <h1>{garment.name}</h1>
      <p>
        v{garment.version} · sloper: {sloperName} · {new Date().toISOString().slice(0, 10)}
      </p>
    </div>
    <div className={classes.headerRight}>
      <p>Patterns by Sam Panter · gunk.work</p>
      <p>{page}</p>
    </div>
  </header>
);

const Pages = ({
  garment,
  draft,
  fabrics,
  sloperName,
  unit,
  params,
}: {
  garment: Garment;
  draft: DraftResult;
  fabrics: string[];
  sloperName: string;
  unit: GunkUnits;
  params: GarmentParams;
}) => {
  const { allowRotate, fabricWidth } = useFabricSettings();
  const packing = useMemo(
    () => packFabrics(draft.pieces, fabrics, fabricWidth, allowRotate),
    [draft, fabrics, fabricWidth, allowRotate]
  );
  const fmt = (cm: number) => formatLength(cm, unit);

  const views = draft.views;
  const flatBounds = views
    ? boundsOf([...views.front.lines, ...views.back.lines].flatMap((l) => l.points))
    : null;
  const callouts = views ? [...views.front.callouts, ...views.back.callouts] : [];
  const allowances = garment.params.filter((p) => p.slug.endsWith("Allowance"));

  return (
    <>
      <section className={classes.page}>
        <Header garment={garment} sloperName={sloperName} page="Flats & measurements" />
        {views && flatBounds && (
          <>
            <div className={classes.flats}>
              <figure>
                <Flat sketch={views.front} bounds={flatBounds} firstNumber={1} />
                <figcaption>Front</figcaption>
              </figure>
              <figure>
                <Flat sketch={views.back} bounds={flatBounds} firstNumber={views.front.callouts.length + 1} />
                <figcaption>Back</figcaption>
              </figure>
            </div>
            <ol className={classes.callouts}>
              {callouts.map((c, i) => (
                <li key={i}>{c.text}</li>
              ))}
            </ol>
          </>
        )}
        {draft.measures && (
          <>
            <h2>Points of measure (finished)</h2>
            <table>
              <thead>
                <tr>
                  <th>Measurement</th>
                  <th className={classes.num}>Spec</th>
                  <th className={classes.num}>Tol. ±</th>
                  <th className={classes.num}>Actual</th>
                </tr>
              </thead>
              <tbody>
                {draft.measures.map((m) => (
                  <tr key={m.label}>
                    <td>{m.label}</td>
                    <td className={classes.num}>{fmt(m.cm)}</td>
                    <td className={classes.num}>{m.tolerance !== undefined ? fmt(m.tolerance) : ""}</td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className={classes.page}>
        <Header garment={garment} sloperName={sloperName} page="Materials & cut list" />
        <h2>Fabrics</h2>
        {packing.error && <p className={classes.error}>{packing.error}</p>}
        <table>
          <thead>
            <tr>
              <th>Fabric</th>
              <th>Description</th>
              <th>Colour</th>
              <th className={classes.num}>Usable width</th>
              <th className={classes.num}>Length needed</th>
            </tr>
          </thead>
          <tbody>
            {fabrics.map((fabric) => {
              const spec = garment.fabrics?.[fabric];
              const layout = packing.layouts?.find((l) => l.fabric === fabric);
              return (
                <tr key={fabric}>
                  <td>{fabric}</td>
                  <td>{spec?.description ?? ""}</td>
                  <td>{spec?.color ?? ""}</td>
                  <td className={classes.num}>{fmt(fabricWidth(fabric))}</td>
                  <td className={classes.num}>{layout ? fmt(layout.length) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className={classes.note}>
          Lengths are the nested layout only. Add extra for shrinkage and straightening the grain.
        </p>

        {draft.trims && draft.trims.length > 0 && (
          <>
            <h2>Trims & notions</h2>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th className={classes.num}>Qty</th>
                  <th className={classes.num}>Length</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {draft.trims.map((t) => (
                  <tr key={t.name}>
                    <td>{t.name}</td>
                    <td className={classes.num}>{t.count}</td>
                    <td className={classes.num}>{t.cm !== undefined ? fmt(t.cm) : ""}</td>
                    <td>{t.description ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {allowances.length > 0 && (
          <>
            <h2>Seam allowances</h2>
            <table>
              <tbody>
                {allowances.map((a) => (
                  <tr key={a.slug}>
                    <td>{a.name}</td>
                    <td className={classes.num}>
                      {fmt(params[a.slug] as number)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <h2>Cut list</h2>
        <table>
          <thead>
            <tr>
              <th />
              <th>Piece</th>
              <th>Cut</th>
            </tr>
          </thead>
          <tbody>
            {draft.pieces.map((piece) => {
              const { cut, bounds } = placePiece(piece);
              const pad = 2;
              return (
                <tr key={piece.name}>
                  <td className={classes.thumbCell}>
                    <svg
                      className={classes.thumb}
                      viewBox={`${bounds.minX - pad} ${bounds.minY - pad} ${bounds.maxX - bounds.minX + pad * 2} ${bounds.maxY - bounds.minY + pad * 2}`}
                    >
                      <path d={path(cut, true)} className={classes.outline} />
                    </svg>
                  </td>
                  <td>{piece.name}</td>
                  <td>{cutLabel(piece.cut)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

      </section>

      <section className={classes.page}>
        <Header garment={garment} sloperName={sloperName} page="Cutting layouts" />
        {packing.layouts?.map((layout) => (
          <figure key={layout.fabric} className={classes.layout}>
            <figcaption>
              {layout.fabric} · {fmt(layout.width)} usable width · {fmt(layout.length)} used
            </figcaption>
            <svg viewBox={`-1 -1 ${layout.length + 2} ${layout.width + 2}`}>
              <rect width={layout.length} height={layout.width} className={classes.fabric} />
              {layout.placed.map((p) => (
                <g key={p.piece.name}>
                  <path d={path(p.cut, true)} className={classes.layoutPiece} />
                  <text x={p.center[0]} y={p.center[1]} className={classes.layoutLabel}>
                    {p.piece.name}
                  </text>
                </g>
              ))}
            </svg>
          </figure>
        ))}
      </section>

      <section className={classes.page}>
        <Header garment={garment} sloperName={sloperName} page="Construction" />
        <h2>Construction</h2>
        <p className={classes.instructions}>{garment.instructions}</p>
        <h2>Notes</h2>
        <div className={classes.notes}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} />
          ))}
        </div>
      </section>
    </>
  );
};

const TechPack = () => {
  const { slug } = useParams();
  const garment = garments.find((g) => g.slug === slug);
  if (!garment) return <p>no garment called {slug}</p>;
  return <GarmentTechPack garment={garment} />;
};

const GarmentTechPack = ({ garment }: { garment: Garment }) => {
  const { sloper, unit, params, result } = useDraft(garment);
  return (
    <div className={classes.techpack}>
      <div className={classes.toolbar}>
        <Link to={`/garments/${garment.slug}`}>← back to pattern</Link>
        <button onClick={() => window.print()}>print</button>
      </div>
      {result.error && <p className={classes.error}>{result.error}</p>}
      {result.draft && (
        <Pages
          garment={garment}
          draft={result.draft}
          fabrics={result.fabrics}
          sloperName={sloper?.name ?? ""}
          unit={unit}
          params={params}
        />
      )}
    </div>
  );
};

export default TechPack;
