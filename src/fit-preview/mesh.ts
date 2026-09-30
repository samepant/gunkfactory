import SweepContext from "poly2tri/src/sweepcontext.js";
import { dist, length, pointAt, type Point } from "../pattern/geometry";
import { bodyRing, projectOutside } from "./body";
import type { Assembly, Body, EdgeRef, Link, Panel, PanelMesh, SimulationInput, Stitch, Triangle, Vec3 } from "./types";

const inside = (p: Point, boundary: Point[]) => {
  let yes = false;
  for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
    const a = boundary[i], b = boundary[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) yes = !yes;
  }
  return yes;
};
export function meshPanel(panel: Panel, start: number, spacing = 2.8): PanelMesh {
  if (!Number.isFinite(spacing) || spacing < 1 || spacing > 6) throw new Error("Mesh spacing must be between 1 and 6 cm.");
  const points: Point[] = [];
  const edges: number[][] = [];
  for (const edge of panel.piece.edges) {
    const len = length(edge.points);
    if (!Number.isFinite(len) || len < 1e-5) throw new Error(`${panel.source}: a boundary edge is empty or degenerate.`);
    const count = Math.max(1, Math.ceil(len / spacing));
    const indices: number[] = [];
    for (let i = 0; i < count; i++) {
      indices.push(points.length);
      points.push(pointAt(edge.points, len * i / count));
    }
    edges.push(indices);
  }
  edges.forEach((edge, i) => edge.push(edges[(i + 1) % edges.length][0]));
  if (points.some((p) => p.some((v) => !Number.isFinite(v)))) throw new Error("Pattern contains non-finite coordinates.");
  const boundary = points.slice();
  const contour = points.map(([x, y], id) => ({ x, y, id }));
  const sweep = new SweepContext(contour, { cloneArrays: true });
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  if ((maxX - minX) * (maxY - minY) / (spacing * spacing) > 10000) throw new Error("Pattern is too large for this preview resolution.");
  for (let y = minY + spacing * 0.57, row = 0; y < maxY; y += spacing * 0.866, row++) {
    for (let x = minX + spacing * (row % 2 ? 0.7 : 0.2); x < maxX; x += spacing) {
      const p: Point = [x, y];
      if (!inside(p, boundary) || boundary.some((b) => dist(p, b) < spacing * 0.5)) continue;
      sweep.addPoint({ x, y, id: points.length } as { x: number; y: number; id: number });
      points.push(p);
    }
  }
  sweep.triangulate();
  const triangles = sweep.getTriangles().flatMap((t) => t.getPoints().map((p) => (p as { x: number; y: number; id: number }).id));
  return { panel, points, edges, triangles, start };
}

// A seam samples boundary chains by arc length, not by unrelated vertex indices.
function chain(refs: EdgeRef[], meshes: PanelMesh[]) {
  const ids: number[] = [];
  const distances: number[] = [];
  let total = 0;
  refs.forEach((ref) => {
    const mesh = meshes.find((m) => m.panel.id === ref.panel)!;
    let edge = mesh.edges[ref.edge].slice();
    if (ref.reverse) edge = edge.reverse();
    edge.forEach((id, i) => {
      if (i > 0) total += dist(mesh.points[edge[i - 1]], mesh.points[id]);
      ids.push(mesh.start + id); distances.push(total);
    });
  });
  return { ids, distances, total };
}
function sample(c: ReturnType<typeof chain>, t: number): { ids: number[]; weights: number[] } {
  const at = Math.max(0, Math.min(1, t)) * c.total;
  for (let i = 1; i < c.ids.length; i++) {
    if (at <= c.distances[i] && c.distances[i] > c.distances[i - 1]) {
      const blend = (at - c.distances[i - 1]) / (c.distances[i] - c.distances[i - 1]);
      return { ids: [c.ids[i - 1], c.ids[i]], weights: [1 - blend, blend] };
    }
  }
  return { ids: [c.ids[c.ids.length - 1]], weights: [1] };
}

export interface MeshingOptions {
  material: SimulationInput["material"];
  supports: boolean;
  spacing?: number;
  arrange: (panel: Panel, point: Point, body: Body, all: Panel[]) => Vec3;
  attachments?: (meshes: PanelMesh[]) => Stitch[];
}

export function createSimulation(panels: Panel[], assembly: Assembly, body: Body, options: MeshingOptions) {
  const { material, supports, arrange, attachments, spacing = 2.8 } = options;
  const meshes: PanelMesh[] = [];
  let count = 0;
  const placedPanels = panels.map((panel) => ({ ...panel, placement: assembly.placements[panel.id] }));
  for (const panel of placedPanels) {
    const mesh = meshPanel(panel, count, spacing);
    meshes.push(mesh); count += mesh.points.length;
  }
  if (count > 18000) throw new Error("Preview exceeds the interactive mesh budget.");
  const positions = new Float32Array(count * 3);
  const links: Link[] = [];
  const faces: Triangle[] = [];
  for (const mesh of meshes) {
    mesh.points.forEach((p, i) => positions.set(arrange(mesh.panel, p, body, placedPanels), (mesh.start + i) * 3));
    const edges = new Map<string, { a: number; b: number; opposite: number }>();
    for (let i = 0; i < mesh.triangles.length; i += 3) {
      const t = mesh.triangles.slice(i, i + 3);
      const [a, b, c] = t.map((id) => mesh.points[id]);
      const restArea = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
      if (restArea < 1e-8) throw new Error("Triangulation contains a degenerate face.");
      faces.push({ ids: t.map((id) => id + mesh.start) as Triangle["ids"], restArea });
      for (let j = 0; j < 3; j++) {
        const a = t[j], b = t[(j + 1) % 3], opposite = t[(j + 2) % 3];
        const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
        const neighbor = edges.get(key);
        if (neighbor) links.push({ a: mesh.start + neighbor.opposite, b: mesh.start + opposite, rest: dist(mesh.points[neighbor.opposite], mesh.points[opposite]), bend: true });
        else {
          edges.set(key, { a, b, opposite });
          links.push({ a: mesh.start + a, b: mesh.start + b, rest: dist(mesh.points[a], mesh.points[b]), bend: false });
        }
      }
    }
  }
  const stitches: Stitch[] = [];
  for (const seam of assembly.seams.filter((s) => s.enabled)) {
    const a = chain(seam.a, meshes), b = chain(seam.b, meshes);
    const n = Math.ceil(Math.max(a.total, b.total) / spacing);
    for (let i = 0; i <= n; i++) {
      const sa = sample(a, i / n), sb = sample(b, seam.reverse ? 1 - i / n : i / n);
      stitches.push({ ids: [...sa.ids, ...sb.ids], weights: [...sa.weights, ...sb.weights.map((w) => -w)], seam: seam.id });
    }
  }
  if (attachments) stitches.push(...attachments(meshes));
  const pins: number[] = [];
  if (supports) for (const contact of assembly.contacts) {
    const mesh = meshes.find((m) => m.panel.id === contact.point.panel)!;
    const edge = mesh.edges[contact.point.edge];
    const at = contact.point.reverse ? 1 - contact.at : contact.at;
    const id = edge[Math.round(at * (edge.length - 1))] + mesh.start;
    const side = contact.landmark.startsWith("left") ? -1 : 1;
    let target: Vec3;
    if (contact.landmark === "back neck") target = [0, body.neckY - 2, -bodyRing(body, body.neckY - 2).rz - 0.7];
    else if (contact.landmark.includes("shoulder")) target = [side * (body.shoulder[0] + 0.7), body.shoulder[1] + 0.7, 0];
    else target = [side * body.wrist[0], body.wrist[1], body.arms[1].r1 + 0.7];
    projectOutside(body, target);
    if (pins.includes(id)) {
      if (Math.hypot(...target.map((v, i) => v - positions[id * 3 + i])) > 0.01) throw new Error("Two body contacts constrain the same mesh point to different landmarks. Move or remove one contact.");
      continue;
    }
    positions.set(target, id * 3); pins.push(id);
  }
  const input: SimulationInput = { positions, links, stitches, pins, body, material, faces };
  return { meshes, input };
}
