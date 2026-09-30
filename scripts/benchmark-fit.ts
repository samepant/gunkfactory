import jacket from "../src/garments/26a-jacket";
import example from "../slopers/example.json";
import { createBody } from "../src/fit-preview/body";
import { defaultBodyOptions, defaultSolverOptions } from "../src/fit-preview/types";
import { jacketAssembly, jacketPanels, seamLengths } from "../src/fit-preview/assembly";
import { createJacketSimulation } from "../src/fit-preview/adapter";
import { ClothSolver } from "../src/fit-preview/solver";
import type { MeasurementsCm } from "../src/garments/garment";

const params = { ...Object.fromEntries(jacket.params.map((p) => [p.slug, p.default])), ...JSON.parse(process.argv[2] ?? "{}") };
const settings = JSON.parse(process.argv[3]?.startsWith("{") ? process.argv[3] : "{}");
const measurements = { ...Object.fromEntries(Object.entries(example.measurements).map(([k, v]) => [k, v * (settings.measurementScale ?? 1)])), ...settings.measurements };
const body = createBody(measurements, { ...defaultBodyOptions, ...settings.body });
const draft = jacket.draft(measurements as MeasurementsCm, params);
const panels = jacketPanels(draft), assembly = jacketAssembly(jacket, draft);
const { input, meshes } = createJacketSimulation(panels, assembly, body, settings.material ?? "canvas", settings.closed ?? true, settings.supports ?? true, settings.spacing ?? 2.8);
input.solver = { ...defaultSolverOptions, ...settings.solver };
const solver = new ClothSolver(input);
const began = performance.now();
for (let i = 0; i < (settings.steps ?? Math.round(3 / input.solver.timeStep)); i++) solver.step();
const frame = solver.frame();
const seams = Object.fromEntries(assembly.seams.map((s) => [s.id, { label: s.label, gap: 0, lengths: seamLengths(s, panels) }]));
seams.closure = { label: "closure", gap: 0, lengths: [0, 0] };
for (const stitch of input.stitches) {
  const d = [0, 0, 0];
  stitch.ids.forEach((id, i) => d.forEach((_, k) => d[k] += frame.positions[id * 3 + k] * stitch.weights[i]));
  seams[stitch.seam].gap = Math.max(seams[stitch.seam].gap, Math.hypot(...d));
}
const topStrain = input.links.filter((l) => !l.bend).map((l) => {
  const signedStrain = Math.hypot(...[0, 1, 2].map((k) => frame.positions[l.a * 3 + k] - frame.positions[l.b * 3 + k])) / l.rest - 1;
  return { ...l, signedStrain, strain: Math.abs(signedStrain) };
}).sort((a, b) => b.strain - a.strain).slice(0, 8).map((l) => {
  const m = meshes.find((m) => l.a >= m.start && l.a < m.start + m.points.length)!;
  return { ...l, panel: m.panel.id, points: [m.points[l.a - m.start], m.points[l.b - m.start]], positions: [l.a, l.b].map((id) => Array.from(frame.positions.slice(id * 3, id * 3 + 3))), boundaryEdges: [l.a, l.b].map((id) => m.edges.flatMap((edge, index) => edge.includes(id - m.start) ? [index] : [])) };
});
const collar = input.stitches.filter((s) => s.seam === "jacket-9").map((s) => ({ ids: s.ids, weights: s.weights, positions: s.ids.map((id) => Array.from(frame.positions.slice(id * 3, id * 3 + 3))) }));
console.log(JSON.stringify({ environment: `${process.platform} ${process.arch}, Node ${process.version}`, params: JSON.parse(process.argv[2] ?? "{}"), effectiveParams: params, settings, effectiveSettings: { body: { ...defaultBodyOptions, ...settings.body }, solver: input.solver, material: input.material, closed: settings.closed ?? true, supports: settings.supports ?? true, spacing: settings.spacing ?? 2.8 }, bodyMeasurements: body.measurements, vertices: input.positions.length / 3, triangles: meshes.reduce((sum, m) => sum + m.triangles.length / 3, 0), ms: performance.now() - began, metrics: frame.metrics, boundsY: [Math.min(...frame.positions.filter((_, i) => i % 3 === 1)), Math.max(...frame.positions.filter((_, i) => i % 3 === 1))], seams: Object.values(seams), topStrain, ...(process.argv.includes("--detail") ? { collar } : {}) }, null, 2));
