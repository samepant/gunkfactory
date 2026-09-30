import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import garments from "../garments";
import type { Garment, GarmentParams, MeasurementsCm } from "../garments/garment";
import { fileSlopers, measurementsInCm, toSloperFile } from "../measurements";
import { useSloperStorage } from "../hooks/useSloperStorage";
import { createBody } from "./body";
import { auditAssembly, seamLengths, validateAssembly } from "./assembly";
import { previewAdapters, type PreviewAdapter } from "./adapter";
import { ClothSolver } from "./solver";
import Viewer, { type ViewerOptions } from "./Viewer";
import { defaultBodyOptions, type Assembly, type EdgeRef, type Landmark, type Panel, type SimulationFrame, type Vec3 } from "./types";
import styles from "./preview.module.css";

function readSetting<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; }
}
const panelName = (panel: Panel) => `${panel.side < 0 ? "Left" : "Right"} ${panel.source}`;
const refKey = (ref: EdgeRef) => `${ref.panel}|${ref.edge}`;
const parseRef = (key: string): EdgeRef => { const [panel, edge] = key.split("|"); return { panel, edge: Number(edge) }; };
const initialOptions: ViewerOptions = { body: true, garment: true, wire: false, strain: false, strainMode: "extension", seams: false, selected: "", camera: "orbit" };

export default function FitPreview() {
  const { slug } = useParams();
  const garment = garments.find((g) => g.slug === slug);
  const adapter = slug ? previewAdapters[slug] : undefined;
  if (!garment || !adapter) return <div className={styles.unsupported}><h1>Assembly recipe needed</h1><p>This garment does not yet have a 3D assembly recipe.</p><Link to="/">Return to garments</Link></div>;
  return <DesignerPreview key={garment.slug} garment={garment} adapter={adapter} />;
}

function DesignerPreview({ garment, adapter }: { garment: Garment; adapter: PreviewAdapter }) {
  const { storedSlopers } = useSloperStorage();
  const slopers = useMemo(() => [...fileSlopers, ...storedSlopers.map(toSloperFile)], [storedSlopers]);
  const [sloperIndex, setSloperIndex] = useState(() => Math.max(0, slopers.findIndex((s) => s.name === readSetting("pattern-sloper", ""))));
  const sloper = slopers[sloperIndex];
  const [params, setParams] = useState<GarmentParams>(() => {
    const defaults = Object.fromEntries(garment.params.map((p) => [p.slug, p.default]));
    const source = readSetting<GarmentParams>(`params-${garment.slug}`, {});
    for (const p of garment.params) if (typeof source[p.slug] === typeof p.default) defaults[p.slug] = source[p.slug];
    return defaults;
  });
  const [bodyOptions, setBodyOptions] = useState(defaultBodyOptions);
  const [assembly, setAssembly] = useState<Assembly | null>(null);
  const [material, setMaterial] = useState<"canvas" | "soft">("canvas");
  const [closed, setClosed] = useState(true);
  const [supports, setSupports] = useState(true);
  const [landmark, setLandmark] = useState<Landmark>("right shoulder");
  const [contactAt, setContactAt] = useState(0.5);
  const [tab, setTab] = useState<"garment" | "body" | "assembly">("garment");
  const [options, setOptions] = useState(initialOptions);
  const [selectedPanel, setSelectedPanel] = useState("");
  const [selectedSeam, setSelectedSeam] = useState("");
  const [edgeA, setEdgeA] = useState("");
  const [edgeB, setEdgeB] = useState("");
  const [nextEdge, setNextEdge] = useState<"a" | "b">("a");
  const [reverse, setReverse] = useState(true);
  const [frame, setFrame] = useState<SimulationFrame | null>(null);
  const [running, setRunning] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);
  const [reset, setReset] = useState(0);
  const [message, setMessage] = useState("");
  const [showJson, setShowJson] = useState(false);
  const [runtimeError, setRuntimeError] = useState("");
  const worker = useRef<Worker>();
  const importRef = useRef<HTMLInputElement>(null);

  const data = useMemo(() => {
    try {
      if (!sloper) throw new Error("Add a sloper before opening the fit preview.");
      const measurements = measurementsInCm(sloper);
      const missing = garment.requiredMeasurements.filter((key) => !Number.isFinite(measurements[key]) || measurements[key]! <= 0);
      if (missing.length) throw new Error(`Sloper is missing valid measurements: ${missing.join(", ")}`);
      const body = createBody(measurements, bodyOptions);
      const draft = garment.draft(measurements as MeasurementsCm, params);
      const panels = adapter.panels(draft);
      const defaults = adapter.assembly(garment, draft);
      const active = assembly ? validateAssembly(assembly, defaults, panels) : defaults;
      return { body, draft, panels, defaults, assembly: active, error: "" };
    } catch (error) { return { error: (error as Error).message }; }
  }, [sloper, garment, adapter, params, bodyOptions, assembly]);
  useEffect(() => {
    if (!data.panels || !data.assembly) return;
    if (!data.panels.some((p) => p.id === selectedPanel)) setSelectedPanel(data.panels[0].id);
    if (!data.assembly.seams.some((s) => s.id === selectedSeam)) setSelectedSeam(data.assembly.seams[0]?.id ?? "");
    const validRef = (key: string) => { const ref = parseRef(key); return !!data.panels!.find((p) => p.id === ref.panel)?.piece.edges[ref.edge]; };
    const first = data.assembly.seams.find((s) => s.kind === "sewn") ?? data.assembly.seams[0];
    if (!validRef(edgeA)) setEdgeA(first ? refKey(first.a[0]) : `${data.panels[0].id}|0`);
    if (!validRef(edgeB)) setEdgeB(first ? refKey(first.b[0]) : `${data.panels[data.panels.length - 1].id}|0`);
  }, [data.panels, data.assembly, selectedPanel, selectedSeam, edgeA, edgeB]);
  const simulation = useMemo(() => {
    if (!data.body || !data.panels || !data.assembly) return null;
    try { return { ...adapter.simulate(data.panels, data.assembly, data.body, material, closed, supports), error: "", reset }; }
    catch (error) { return { error: `Cannot mesh this pattern: ${(error as Error).message}` }; }
  }, [data, adapter, material, closed, supports, reset]);

  useEffect(() => {
    setRunning(false); setWorkerReady(false); setRuntimeError(""); setFrame(null);
    if (!simulation || !("input" in simulation)) return;
    // A usable arranged frame is available before the worker starts.
    setFrame(new ClothSolver(simulation.input).frame());
    let instance: Worker;
    try { instance = new Worker(new URL("./simulation.worker.ts", import.meta.url), { type: "module" }); }
    catch { setRuntimeError("Cannot start the simulation worker. Reload the page or try another browser."); return; }
    worker.current = instance;
    instance.onmessage = (event) => {
      if (event.data.type === "error") { setRuntimeError(event.data.message); setRunning(false); }
      else { setWorkerReady(true); setFrame(event.data as SimulationFrame); setRunning(event.data.running); }
    };
    instance.onerror = (event) => { setRuntimeError(event.message || "Simulation worker failed. Reload the page to load the current preview files."); setRunning(false); };
    instance.postMessage({ type: "init", input: simulation.input });
    return () => { instance.onmessage = null; instance.onerror = null; instance.terminate(); worker.current = undefined; };
  }, [simulation]);

  const active = data.assembly;
  const audit = useMemo(() => active && data.panels ? auditAssembly(active, data.panels) : null, [active, data.panels]);
  const panel = data.panels?.find((p) => p.id === selectedPanel);
  const seam = active?.seams.find((s) => s.id === selectedSeam);
  const metrics = frame?.metrics;
  const error = data.error || simulation?.error || runtimeError;
  const setCamera = (view: string) => setOptions((o) => ({ ...o, camera: `${view}:${Date.now()}` }));
  const updateOffset = (axis: number, value: number) => {
    if (!active || !Number.isFinite(value)) return;
    const placement = active.placements[selectedPanel];
    const offset = placement.offset.map((v, i) => axis === i ? Math.max(-100, Math.min(100, value)) : v) as Vec3;
    setAssembly({ ...active, placements: { ...active.placements, [selectedPanel]: { ...placement, offset } } });
  };
  const save = () => {
    if (!active) return;
    try { localStorage.setItem(`fit-assembly-${garment.slug}`, JSON.stringify(active)); setMessage("Assembly saved on this device."); }
    catch { setMessage("Browser storage is unavailable. Export the assembly instead."); }
  };
  const load = () => {
    if (!data.defaults || !data.panels) return;
    try {
      const value = readSetting<unknown>(`fit-assembly-${garment.slug}`, null);
      if (!value) throw new Error("No saved assembly on this device.");
      setAssembly(validateAssembly(value, data.defaults, data.panels)); setMessage("Saved assembly loaded.");
    } catch (error) { setMessage((error as Error).message); }
  };
  const exportAssembly = () => {
    if (!active) return;
    setShowJson(true);
    const url = URL.createObjectURL(new Blob([JSON.stringify(active, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `${garment.slug}-assembly.json`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Download requested. You can also copy the assembly JSON below.");
  };
  const addSeam = () => {
    if (!active || !data.panels) return;
    if (edgeA === edgeB) { setMessage("Choose two different edges."); return; }
    const a = parseRef(edgeA), b = parseRef(edgeB);
    const occupied = active.seams.some((s) => s.enabled && [...s.a, ...s.b].some((r) => refKey(r) === edgeA || refKey(r) === edgeB));
    if (occupied) { setMessage("One of these edges is already sewn. Disable its existing seam first."); return; }
    const id = `custom-${Date.now()}`;
    const next = { ...active, seams: [...active.seams, { id, label: "Custom seam", a: [a], b: [b], reverse, enabled: true, kind: "sewn" as const }] };
    try { setAssembly(validateAssembly(next, data.defaults!, data.panels)); setSelectedSeam(id); setMessage("Seam added. Settle to inspect the result."); }
    catch (error) { setMessage((error as Error).message); }
  };

  return <main className={styles.root}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>GUNK FACTORY / FIT LAB</span><h1>{garment.name} <span>on body</span></h1></div>
      <div className={styles.headerRight}><span className={styles.badge}>EXPERIMENTAL</span><Link to={`/garments/${garment.slug}`}>Back to pattern ↗</Link></div>
    </header>
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>
        <div className={styles.intro}><span className={styles.eyebrow}>01 / SETUP</span><p>From flat pieces to fit.</p><small>Explore the shell on your sloper. Changes here stay in this preview.</small></div>
        <div className={styles.tabs}>{(["garment", "body", "assembly"] as const).map((t) => <button key={t} className={tab === t ? styles.activeTab : ""} onClick={() => setTab(t)}>{t}</button>)}</div>
        <div className={styles.controls}>
          <label className={styles.field}>Sloper<select value={sloperIndex} onChange={(e) => setSloperIndex(Number(e.target.value))}>{slopers.map((s, i) => <option key={`${s.slug}-${i}`} value={i}>{s.name}</option>)}</select></label>
          {tab === "garment" && <>
            <div className={styles.sectionTitle}>Silhouette <span>cm</span></div>
            {adapter.controls.map(([key, label, min, max]) => <label className={styles.slider} key={key}><span>{label}<output>{Number(params[key]).toFixed(1)}</output></span><input aria-label={label} type="range" min={min} max={max} step="0.5" value={params[key] as number} onChange={(e) => setParams({ ...params, [key]: Number(e.target.value) })} /></label>)}
            <label className={styles.field}>Fabric behavior<select value={material} onChange={(e) => setMaterial(e.target.value as "canvas" | "soft")}><option value="canvas">Structured woven / canvas</option><option value="soft">Soft woven</option></select></label>
            <small>Illustrative stiffness presets. Wax, weight, grain direction, and fabric stretch are not calibrated.</small>
            <label className={styles.check}><input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} /> Fasten center front</label>
            <div className={styles.note}><strong>Outer shell study</strong><p>{adapter.description}</p></div>
            <button className={styles.textButton} onClick={() => setParams(Object.fromEntries(garment.params.map((p) => [p.slug, p.default])))}>Reset garment to defaults</button>
          </>}
          {tab === "body" && <>
            <div className={styles.sectionTitle}>Body proportions</div>
            {([
              ["depth", "Torso depth / width", 0.45, 0.95, 0.01], ["shoulderSlope", "Shoulder slope (°)", 5, 35, 1], ["armAngle", "Arms away from body (°)", 15, 60, 1],
            ] as const).map(([key, label, min, max, step]) => <label className={styles.slider} key={key}><span>{label}<output>{bodyOptions[key]}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={bodyOptions[key]} onChange={(e) => setBodyOptions({ ...bodyOptions, [key]: Number(e.target.value) })} /></label>)}
            <div className={styles.sectionTitle}>Measurement basis <span>cm</span></div>
            {data.body?.measurements.map((m) => <div className={styles.measurement} key={m.label}><span>{m.label}<small>{m.source}</small></span><b>{m.cm.toFixed(1)}</b></div>)}
            <div className={styles.note}><strong>Estimated body shape</strong>{data.body?.assumptions.map((a) => <p key={a}>{a}</p>)}</div>
          </>}
          {tab === "assembly" && <>
            <div className={styles.sectionTitle}>Piece placement</div>
            <label className={styles.field}>Selected piece<select value={selectedPanel} onChange={(e) => { setSelectedPanel(e.target.value); setOptions({ ...options, selected: e.target.value }); }}>{data.panels?.map((p) => <option key={p.id} value={p.id}>{panelName(p)}</option>)}</select></label>
            {panel && active && <>
              <small>Arrange near the {active.placements[panel.id].region.includes("sleeve") ? "arm" : active.placements[panel.id].region === "collar" ? "neck" : `${active.placements[panel.id].region} torso`}. These offsets set the initial position; the cloth is free to slide during simulation.</small>
              <div className={styles.offsets}>{["Side", "Up", "Front"].map((label, i) => <label key={label}>{label} (cm)<input aria-label={`${label} placement`} type="number" min={-100} max={100} step={1} value={active.placements[panel.id].offset[i]} onChange={(e) => updateOffset(i, Number(e.target.value))} /></label>)}</div>
              <PatternPicker panel={panel} edgeLabel={adapter.edgeLabel} edgeA={edgeA} edgeB={edgeB} onPick={(key) => { if (nextEdge === "a") setEdgeA(key); else setEdgeB(key); setNextEdge(nextEdge === "a" ? "b" : "a"); }} />
            </>}
            <div className={styles.sectionTitle}>Body contacts / fitting pins</div>
            <small>Attach a point along edge A to a body landmark. These are fixed supports, like pins on a fitting stand; they affect the drape.</small>
            <label className={styles.field}>Body landmark<select value={landmark} onChange={(e) => setLandmark(e.target.value as Landmark)}>{["left shoulder", "right shoulder", "back neck", "left wrist", "right wrist"].map((l) => <option key={l}>{l}</option>)}</select></label>
            <label className={styles.slider}><span>Position along edge A<output>{Math.round(contactAt * 100)}%</output></span><input aria-label="Contact position along edge A" type="range" min="0" max="1" step="0.05" value={contactAt} onChange={(e) => setContactAt(Number(e.target.value))} /></label>
            <button className={styles.secondary} onClick={() => {
              if (!active || active.contacts.length >= 20) return;
              const contacts = active.contacts.filter((c) => !(refKey(c.point) === edgeA && Math.abs(c.at - contactAt) < 0.03));
              setAssembly({ ...active, contacts: [...contacts, { id: `contact-${Date.now()}`, point: parseRef(edgeA), at: contactAt, landmark }] });
              setMessage(`Edge A supported at ${landmark}.`);
            }}>+ Attach edge A to body</button>
            {active?.contacts.map((contact) => <div className={styles.contact} key={contact.id}><span>{contact.point.panel.split(":")[0]} → {contact.landmark}</span><button aria-label={`Remove ${contact.id} support`} onClick={() => setAssembly({ ...active, contacts: active.contacts.filter((c) => c.id !== contact.id) })}>×</button></div>)}
            <div className={styles.sectionTitle}>Sew two edges</div>
            <small>Click edges in the drawing or choose below. Next click selects edge {nextEdge.toUpperCase()}.</small>
            {(["a", "b"] as const).map((which) => <label className={styles.field} key={which}>Edge {which.toUpperCase()}<select value={which === "a" ? edgeA : edgeB} onChange={(e) => which === "a" ? setEdgeA(e.target.value) : setEdgeB(e.target.value)}>{data.panels?.flatMap((p) => p.piece.edges.map((_, edge) => <option key={`${p.id}|${edge}`} value={`${p.id}|${edge}`}>{panelName(p)} · {adapter.edgeLabel(p, edge)}</option>))}</select></label>)}
            <label className={styles.check}><input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} /> Reverse second edge direction</label>
            <button className={styles.secondary} onClick={addSeam}>+ Sew selected edges</button>
            <div className={styles.sectionTitle}>Seam recipe <span>{active?.seams.filter((s) => s.enabled).length} active</span></div>
            {audit && <div className={styles.note}><strong>{audit.missing.length || audit.duplicate.length ? "Check seam assignments" : "All shell edges assigned"}</strong><p>{audit.openings.length} intentional openings · {audit.missing.length} unsewn edges · {audit.duplicate.length} repeated edges</p>{[...audit.missing, ...audit.duplicate].map((ref) => <p key={refKey(ref)}>{ref.panel} · {adapter.edgeLabel(data.panels!.find((p) => p.id === ref.panel)!, ref.edge)}</p>)}</div>}
            <div className={styles.seamList}>{active?.seams.map((s) => <button key={s.id} className={selectedSeam === s.id ? styles.selectedSeam : ""} onClick={() => setSelectedSeam(s.id)}><span className={s.enabled ? styles.dot : styles.offDot} />{s.label}</button>)}</div>
            {seam && active && data.panels && <div className={styles.note}><strong>{seam.label}</strong><p>{seamLengths(seam, data.panels).map((v) => `${v.toFixed(1)} cm`).join(" ↔ ")}</p>{seam.enabled && frame?.seamGaps[seam.id] !== undefined && <p>Current seam gap: {frame.seamGaps[seam.id].toFixed(2)} cm</p>}<label className={styles.check}><input type="checkbox" checked={seam.enabled} onChange={(e) => setAssembly({ ...active, seams: active.seams.map((s) => s.id === seam.id ? { ...s, enabled: e.target.checked } : s) })} /> Sew this seam</label><label className={styles.check}><input type="checkbox" checked={seam.reverse} onChange={(e) => setAssembly({ ...active, seams: active.seams.map((s) => s.id === seam.id ? { ...s, reverse: e.target.checked } : s) })} /> Reverse correspondence</label></div>}
            <div className={styles.buttonGrid}><button onClick={save}>Save locally</button><button onClick={load}>Load saved</button><button onClick={exportAssembly}>Export JSON</button><button onClick={() => importRef.current?.click()}>Import JSON</button></div>
            {showJson && <label className={styles.field}>Assembly JSON<textarea className={styles.json} aria-label="Assembly JSON" readOnly value={JSON.stringify(active, null, 2)} onFocus={(e) => e.target.select()} /></label>}
            <input ref={importRef} type="file" accept=".json,application/json" onChange={async (e) => {
              const file = e.target.files?.[0]; e.target.value = "";
              if (!file || !data.defaults || !data.panels) return;
              try { if (file.size > 200000) throw new Error("Assembly file is too large."); setAssembly(validateAssembly(JSON.parse(await file.text()), data.defaults, data.panels)); setMessage("Assembly imported."); }
              catch (error) { setMessage((error as Error).message); }
            }} />
            <button className={styles.textButton} onClick={() => { setAssembly(null); setMessage("Jacket assembly restored."); }}>Restore jacket assembly</button>
          </>}
          {message && <p className={styles.message} role="status">{message}</p>}
        </div>
      </aside>
      <section className={styles.stage}>
        {data.body && simulation && "meshes" in simulation && !error && <Viewer body={data.body} meshes={simulation.meshes} pins={simulation.input.pins} frame={frame && frame.positions.length === simulation.input.positions.length ? frame : null} options={options} onSelect={(id) => { setSelectedPanel(id); setOptions((o) => ({ ...o, selected: id })); setTab("assembly"); }} onError={setRuntimeError} />}
        <div className={styles.stageTitle}><span className={styles.eyebrow}>02 / FIT PREVIEW</span><p>{running ? "Settling cloth…" : metrics?.steps ? "Simulation paused" : "Arranged pattern pieces"}</p><small>{sloper?.name ?? "No sloper"} / approximate mannequin</small></div>
        {error && <div className={styles.error} role="alert"><strong>Preview unavailable</strong><p>{error}</p><button onClick={() => { setReset((v) => v + 1); setAssembly(null); setParams(Object.fromEntries(garment.params.map((p) => [p.slug, p.default]))); }}>Reset preview</button></div>}
        <div className={styles.cameraBar}>{["orbit", "front", "side", "back"].map((view) => <button key={view} onClick={() => setCamera(view)}>{view}</button>)}</div>
        <div className={styles.stageHint}>DRAG TO ORBIT · SCROLL TO ZOOM · CLICK A PANEL TO SELECT</div>
      </section>
      <aside className={styles.inspector}>
        <span className={styles.eyebrow}>03 / INSPECT</span>
        <h2>Read the fit.</h2>
        <p className={styles.description}>Settle the sewn shell, then inspect it from every side.</p>
        <button className={styles.primary} disabled={!!error || !workerReady || !simulation || !("input" in simulation)} onClick={() => worker.current?.postMessage({ type: "run", running: !running })}>{running ? "Ⅱ  Pause" : "▷  Settle garment"}</button>
        <button className={styles.secondary} onClick={() => setReset((v) => v + 1)}>↺  Reset arrangement</button>
        <label className={styles.check}><input type="checkbox" checked={supports} onChange={(e) => setSupports(e.target.checked)} /> Use fitting supports</label>
        <small>{supports ? "Orange dots are fixed body contacts. Edit them in Assembly." : "Free drape: no supports. With friction omitted, garments may slip off."}</small>
        <div className={styles.sectionTitle}>Display</div>
        {([ ["body", "Show body"], ["garment", "Show garment"], ["seams", "Panel boundaries"], ["wire", "Mesh wireframe"], ["strain", "Mesh strain"] ] as const).map(([key, label]) => <label className={styles.check} key={key}><input type="checkbox" checked={options[key]} onChange={(e) => setOptions({ ...options, [key]: e.target.checked })} />{label}</label>)}
        {options.strain && <><label className={styles.field}>Strain display<select value={options.strainMode} onChange={(e) => setOptions({ ...options, strainMode: e.target.value as ViewerOptions["strainMode"] })}><option value="extension">Stretch</option><option value="compression">Compression</option><option value="absolute">Both</option></select></label><div className={styles.legend}><div /><span>0% strain <b>20%+</b></span><small>Average adjacent edge deformation. Not pressure.</small></div></>}
        <div className={styles.sectionTitle}>Solve diagnostics</div>
        <div className={styles.metric}><span>Seam gap, max</span><b>{metrics ? `${metrics.seamGap.toFixed(1)} cm` : "—"}</b></div>
        <div className={styles.metric}><span>Mean mesh strain</span><b>{metrics ? `${(metrics.meanStrain * 100).toFixed(1)}%` : "—"}</b></div>
        <div className={styles.metric}><span>Max stretch</span><b>{metrics ? `${(metrics.maxStretch * 100).toFixed(0)}%` : "—"}</b></div>
        <div className={styles.metric}><span>Max compression</span><b>{metrics ? `${(metrics.maxCompression * 100).toFixed(0)}%` : "—"}</b></div>
        <div className={styles.metric}><span>Collapsed triangles</span><b>{metrics?.collapsedFaces ?? "—"}</b></div>
        <div className={styles.metric}><span>Body penetration*</span><b>{metrics ? `${metrics.penetration.toFixed(1)} cm` : "—"}</b></div>
        <div className={styles.metric}><span>Simulation steps</span><b>{metrics?.steps ?? 0}</b></div>
        <div className={styles.metric}><span>Cloth motion, RMS</span><b>{metrics ? `${metrics.speed.toFixed(2)} cm/s` : "—"}</b></div>
        <small>Collapsed triangles have under 10% of their flat area.<br />*Vertex sample against the analytic body. Triangle crossings and cloth self-collision are not detected.</small>
        {!!metrics?.steps && <div className={styles.note}><strong>{metrics.seamGap > 1 || metrics.meanStrain > 0.08 || metrics.maxStrain > 0.2 || metrics.collapsedFaces > 0 || metrics.speed > 2 ? "Unresolved fit / assembly" : "Approximate drape"}</strong><p>{metrics.speed > 2 ? "The garment is still moving. Resume settling and check the body contacts before interpreting fit." : metrics.seamGap > 1 || metrics.meanStrain > 0.08 || metrics.maxStrain > 0.2 || metrics.collapsedFaces > 0 ? "Seams or panel dimensions are still under strain. Inspect placement and seam correspondence before interpreting fit." : "Inspect the shape and diagnostics together. A settled image is not a production fit guarantee."}</p></div>}
        <div className={styles.sectionTitle}>Pattern dimensions</div>
        {data.draft?.checks.filter((c) => ["finished chest / hem", "ease over abdomen", "sleeve at bicep"].includes(c.label)).map((c) => <div className={styles.metric} key={c.label}><span>{c.label}</span><b>{c.cm?.toFixed(1)} cm</b></div>)}
        <div className={styles.footnote}>Local browser simulation · shell only<br />Make a physical toile before production.<br /><a href={`${import.meta.env.BASE_URL}fit-preview-notices.txt`} target="_blank" rel="noreferrer">Third-party notices</a></div>
      </aside>
    </div>
  </main>;
}

function PatternPicker({ panel, edgeLabel, edgeA, edgeB, onPick }: { panel: Panel; edgeLabel: PreviewAdapter["edgeLabel"]; edgeA: string; edgeB: string; onPick: (key: string) => void }) {
  const points = panel.piece.edges.flatMap((e) => e.points);
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const minX = Math.min(...xs) - 5, minY = Math.min(...ys) - 5, width = Math.max(...xs) - minX + 5, height = Math.max(...ys) - minY + 5;
  return <svg className={styles.pattern} viewBox={`${minX} ${minY} ${width} ${height}`} aria-label={`Seam edges for ${panelName(panel)}`}>
    <path d={`M${points.map((p) => p.join(",")).join("L")}Z`} fill="#d8dfd0" />
    {panel.piece.edges.map((edge, i) => {
      const key = `${panel.id}|${i}`;
      const d = `M${edge.points.map((p) => p.join(",")).join("L")}`;
      return <g key={i} role="button" tabIndex={0} aria-label={`Select ${edgeLabel(panel, i)}`} onClick={() => onPick(key)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(key); } }}><title>{edgeLabel(panel, i)} · click to select</title><path d={d} fill="none" stroke="transparent" strokeWidth={5} /><path d={d} fill="none" stroke={key === edgeA ? "#cc6a36" : key === edgeB ? "#367fba" : "#627366"} strokeWidth={key === edgeA || key === edgeB ? 1.1 : 0.45} pointerEvents="none" /><circle cx={edge.points[0][0]} cy={edge.points[0][1]} r={0.7} fill="#254236" /></g>;
    })}
    <text x={minX + 2} y={minY + height - 1} fontSize={2.8} fill="#56645c">A: orange · B: blue · dot: edge start</text>
  </svg>;
}
