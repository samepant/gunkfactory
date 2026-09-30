import assert from "node:assert/strict";
import { test } from "node:test";
import jacket from "../src/garments/26a-jacket";
import example from "../slopers/example.json";
import { createBody, ellipseRadii, projectOutside } from "../src/fit-preview/body";
import { defaultBodyOptions, defaultSolverOptions, type Vec3, type Panel } from "../src/fit-preview/types";
import { auditAssembly, jacketAssembly, jacketPanels, validateAssembly } from "../src/fit-preview/assembly";
import { createSimulation as meshSimulation, meshPanel } from "../src/fit-preview/mesh";
import { createJacketSimulation as createSimulation } from "../src/fit-preview/adapter";
import { ClothSolver } from "../src/fit-preview/solver";
import type { MeasurementsCm } from "../src/garments/garment";

const params = Object.fromEntries(jacket.params.map((p) => [p.slug, p.default]));
const body = createBody(example.measurements, defaultBodyOptions);
const draft = jacket.draft(example.measurements as MeasurementsCm, params);
const panels = jacketPanels(draft);
const assembly = jacketAssembly(jacket, draft);
const freeze = (value: unknown) => {
  if (value && typeof value === "object") { Object.freeze(value); Object.values(value).forEach(freeze); }
};

test("measurement rings satisfy requested circumferences", () => {
  for (const ratio of [0.45, 0.66, 0.95]) for (const girth of [65, 100, 145]) {
    const [a, b] = ellipseRadii(girth, ratio);
    let perimeter = 0;
    for (let i = 0; i < 64; i++) {
      const t = i * Math.PI / 32, next = (i + 1) * Math.PI / 32;
      perimeter += Math.hypot(a * (Math.sin(t) - Math.sin(next)), b * (Math.cos(t) - Math.cos(next)));
    }
    assert.ok(Math.abs(perimeter - girth) < 1e-8);
  }
  assert.equal(body.chest, 100);
  assert.ok(body.measurements.some((m) => m.label === "Waist" && m.source === "assumed"));
  assert.throws(() => createBody({ chestGirth: -1 }, defaultBodyOptions), /Invalid/);
  assert.throws(() => createBody({ chestGirth: NaN }, defaultBodyOptions), /Invalid/);
});

test("body collision produces finite points outside torso and isolated arm", () => {
  const p: Vec3 = [0, 0, 0];
  assert.ok(projectOutside(body, p) > 0);
  assert.ok(projectOutside(body, p) < 1e-4);
  const arm = body.arms[1];
  const q: Vec3 = arm.a.map((v, i) => (v + arm.b[i]) / 2) as Vec3;
  projectOutside(body, q);
  assert.ok(q.every(Number.isFinite));
  assert.ok(projectOutside(body, q) < 1e-4);
});

test("the shoulder surface landmark is tangent to the arm joint", () => {
  const root = body.arms[2];
  assert.ok(Math.abs(Math.hypot(...body.shoulder.map((v, i) => v - root.a[i])) - root.r0) < 1e-8);
  assert.ok(root.a[1] + root.r0 < body.neckY, "the arm joint must not raise the shoulder above the neck");
});

test("missing girths derive from sloper arcs before using assumptions", () => {
  const derived = createBody({ halfFrontChest: 26, halfBackChest: 24, halfFrontWaist: 21, halfBackWaist: 19, halfFrontAbdomen: 24, halfBackAbdomen: 22, halfFrontHip: 27, halfBackHip: 25 }, defaultBodyOptions);
  assert.deepEqual(derived.measurements.slice(0, 4).map((m) => [m.cm, m.source]), [[100, "derived"], [92, "derived"], [80, "derived"], [104, "derived"]]);
});

test("assembly audit distinguishes omitted seams from intentional openings", () => {
  assert.equal(auditAssembly(assembly, panels).missing.length, 0);
  assert.equal(auditAssembly(assembly, panels).duplicate.length, 0);
  assert.equal(auditAssembly(assembly, panels).openings.length, 14);
  const unsewn = { ...assembly, seams: assembly.seams.map((s, i) => i === 2 ? { ...s, enabled: false } : s) };
  assert.deepEqual(auditAssembly(unsewn, panels).missing, [{ panel: "front:-1", edge: 1 }, { panel: "front sleeve:-1", edge: 5 }]);
});

test("assembly rejects stale topology, bad indices, duplicate ids, and invalid offsets", () => {
  assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(assembly)), assembly, panels), assembly);
  assert.throws(() => validateAssembly({ ...assembly, version: "99" }, assembly, panels), /different garment/);
  assert.throws(() => validateAssembly({ ...assembly, seams: [assembly.seams[0], assembly.seams[0]] }, assembly, panels), /duplicate/);
  assert.throws(() => validateAssembly({ ...assembly, seams: [{ ...assembly.seams[0], a: [{ panel: "missing", edge: 50 }] }] }, assembly, panels), /Unknown/);
  assert.throws(() => validateAssembly({ ...assembly, placements: {} }, assembly, panels), /Invalid placement/);
});

test("triangulation preserves concave panel area and boundary edges", () => {
  const polygon: [number, number][] = [[0, 0], [12, 0], [12, 4], [4, 4], [4, 12], [0, 12]];
  const panel: Panel = { ...panels[0], piece: { ...panels[0].piece, edges: polygon.map((p, i) => ({ points: [p, polygon[(i + 1) % polygon.length]], sa: 1 })) } };
  const mesh = meshPanel(panel, 0);
  let area = 0;
  const edges = new Set<string>();
  for (let i = 0; i < mesh.triangles.length; i += 3) {
    const ids = mesh.triangles.slice(i, i + 3), [a, b, c] = ids.map((id) => mesh.points[id]);
    area += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
    ids.forEach((id, j) => edges.add([id, ids[(j + 1) % 3]].sort((a, b) => a - b).join(":")));
  }
  assert.ok(Math.abs(area - 80) < 1e-6);
  mesh.edges.forEach((edge) => edge.slice(1).forEach((id, i) => assert.ok(edges.has([edge[i], id].sort((a, b) => a - b).join(":")))));
});

test("generic meshing accepts an independent arrangement without jacket pieces", () => {
  const p: Panel = { ...panels[0], id: "swatch", source: "swatch", piece: { ...panels[0].piece, edges: [[[0, 0], [10, 0]], [[10, 0], [10, 10]], [[10, 10], [0, 10]], [[0, 10], [0, 0]]].map((points) => ({ points: points as [number, number][], sa: 1 })) } };
  const recipe = { ...assembly, seams: [], contacts: [], placements: { swatch: p.placement } };
  const { input } = meshSimulation([p], recipe, body, { material: "canvas", supports: false, arrange: (_, point) => [point[0], point[1] + 100, 3] });
  assert.equal(input.stitches.length, 0);
  assert.ok(input.positions.filter((_, i) => i % 3 === 1).every((y) => y >= 100));
  assert.ok(new ClothSolver(input).frame().metrics.meanStrain < 1e-6);
});

test("conflicting supports and invalid constraint indices fail before solving", () => {
  const conflict = { ...assembly, contacts: [assembly.contacts[0], { ...assembly.contacts[0], id: "conflict", landmark: "left wrist" as const }] };
  assert.throws(() => createSimulation(panels, conflict, body, "canvas", true), /same mesh point/);
  const { input } = createSimulation(panels, assembly, body, "canvas", true);
  assert.throws(() => new ClothSolver({ ...input, pins: [999999] }), /Invalid cloth mesh/);
});

test("adapter reads a frozen pattern and retains dimensions without allowances", () => {
  const before = JSON.stringify(draft);
  freeze(draft);
  const result = createSimulation(panels, assembly, body, "canvas", true);
  assert.equal(result.meshes.length, 10);
  assert.equal(JSON.stringify(draft), before);
  assert.ok(result.input.positions.every(Number.isFinite));
  const generous = jacket.draft(example.measurements as MeasurementsCm, { ...params, seamAllowance: 4, hemAllowance: 8 });
  const other = createSimulation(jacketPanels(generous), jacketAssembly(jacket, generous), body, "canvas", true);
  assert.deepEqual(result.input.positions, other.input.positions);
  assert.deepEqual(result.input.links, other.input.links);
});

test("default jacket simulation remains finite and reduces its seam gap", () => {
  const { meshes, input } = createSimulation(panels, assembly, body, "canvas", true);
  const solver = new ClothSolver(input), initial = solver.frame();
  const began = performance.now();
  for (let i = 0; i < Math.round(3 / defaultSolverOptions.timeStep); i++) solver.step();
  const final = solver.frame();
  console.log(JSON.stringify({ benchmark: "default jacket, 3 simulated seconds", vertices: input.positions.length / 3, triangles: meshes.reduce((s, m) => s + m.triangles.length / 3, 0), elapsedMs: performance.now() - began, initial: initial.metrics, final: final.metrics }));
  assert.ok(final.positions.every(Number.isFinite));
  assert.ok(final.metrics.seamGap < initial.metrics.seamGap);
  assert.ok(final.metrics.meanStrain < initial.metrics.meanStrain);
  assert.ok(final.metrics.seamGap < 0.5, "seam gap below 5 mm");
  assert.ok(final.metrics.meanStrain < 0.04, "mean edge strain below 4%");
  assert.ok(final.metrics.maxStretch < 0.3, "large local stretching remains a regression diagnostic");
  assert.equal(final.metrics.collapsedFaces, 0);
  assert.ok(final.metrics.speed < 1, "low strain must not mask a falling garment");
  assert.ok(final.metrics.penetration < 1);
  assert.ok(Math.max(...final.positions.filter((_, i) => i % 3 === 1)) > body.shoulder[1]);
  for (const id of input.pins) assert.deepEqual(final.positions.slice(id * 3, id * 3 + 3), input.positions.slice(id * 3, id * 3 + 3));
});

test("diagnostics distinguish extension, compression, and collapsed triangles", () => {
  const solver = new ClothSolver({ positions: new Float32Array([0, 0, 0, 15, 0, 0, 15, 0.01, 0]), links: [{ a: 0, b: 1, rest: 10, bend: false }, { a: 1, b: 2, rest: 1, bend: false }], stitches: [], pins: [], faces: [{ ids: [0, 1, 2], restArea: 5 }], body, material: "canvas" });
  const frame = solver.frame();
  assert.equal(frame.metrics.maxStretch, 0.5);
  assert.ok(Math.abs(frame.metrics.maxCompression - 0.99) < 1e-6);
  assert.equal(frame.metrics.collapsedFaces, 1);
  assert.equal(frame.extension[0], 0.5);
  assert.equal(frame.compression[0], 0);
});

test("supports can be disabled and garment ease does not resize the body", () => {
  const relaxed = jacket.draft(example.measurements as MeasurementsCm, { ...params, chestEase: 40 });
  const recipe = jacketAssembly(jacket, relaxed);
  const withSupports = createSimulation(jacketPanels(relaxed), recipe, body, "canvas", true);
  const free = createSimulation(jacketPanels(relaxed), recipe, body, "canvas", true, false);
  assert.equal(withSupports.input.pins.length, 3);
  assert.equal(free.input.pins.length, 0);
  assert.deepEqual(withSupports.input.body, body);
  assert.equal(relaxed.checks.find((c) => c.label === "finished chest / hem")?.cm, 140);
});

test("a supported cloth swatch preserves its top pins under gravity", () => {
  const emptyBody = { ...body, rings: body.rings.map((r) => ({ ...r, y: r.y - 1000 })), arms: [] };
  const solver = new ClothSolver({ positions: new Float32Array([-5, 10, 0, 5, 10, 0, -5, 0, 0, 5, 0, 0]), links: [{ a: 0, b: 1, rest: 10, bend: false }, { a: 0, b: 2, rest: 10, bend: false }, { a: 1, b: 3, rest: 10, bend: false }, { a: 2, b: 3, rest: 10, bend: false }, { a: 0, b: 3, rest: Math.sqrt(200), bend: false }], stitches: [], pins: [0, 1], body: emptyBody, material: "canvas" });
  for (let i = 0; i < 120; i++) solver.step();
  assert.deepEqual(Array.from(solver.positions.slice(0, 6)), [-5, 10, 0, 5, 10, 0]);
  assert.ok(solver.frame().metrics.meanStrain < 0.005);
});
