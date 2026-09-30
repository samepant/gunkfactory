import type { Garment } from "../garments/garment";
import { length, pointAt, dist, type Point } from "../pattern/geometry";
import type { DraftResult } from "../pattern/pattern";
import type { Assembly, Body, EdgeRef, Landmark, Panel, Seam, Vec3 } from "./types";
import { clamp, ellipseRadii, mix, mix3 } from "./body";

const regions = ["front", "back", "front sleeve", "back sleeve", "collar"] as const;
const colors: Record<string, string> = { back: "#acb890", front: "#d1d5b2", "front sleeve": "#b5c3b1", "back sleeve": "#94aa97", collar: "#d6b990" };
export const topologyOf = (draft: DraftResult) => JSON.stringify(draft.pieces.map((p) => [p.name, p.edges.length, p.cut]));
export const edgeLabel = (panel: Panel, edge: number) => {
  const names = panel.source.includes("sleeve") ? ["neck", "overarm", "cuff opening", "underarm", "lower armhole", "raglan"] : panel.source === "collar" ? ["neck attachment", "front end", "top opening", "center back fold"] : ["neck", "raglan", "lower armhole", "side", "hem opening", panel.source === "back" ? "center back fold" : "front opening"];
  return names[edge] ?? `edge ${edge + 1}`;
};
export function jacketPanels(draft: DraftResult): Panel[] {
  return regions.flatMap((source) => {
    const piece = draft.pieces.find((p) => p.name === source);
    if (!piece) throw new Error(`Missing jacket piece: ${source}`);
    const openings = source.includes("sleeve") ? [2] : source === "collar" ? [1, 2] : source === "front" ? [4, 5] : [4];
    return ([-1, 1] as const).map((side) => ({ id: `${source}:${side}`, source, side, piece, openings, color: colors[source], placement: { region: source, offset: [0, 0, 0] as Vec3 } }));
  });
}
export function jacketAssembly(garment: Garment, draft: DraftResult): Assembly {
  const seams: Seam[] = [];
  const ref = (panel: string, side: number, edge: number): EdgeRef => ({ panel: `${panel}:${side}`, edge });
  const add = (label: string, a: EdgeRef[], b: EdgeRef[], reverse = true, kind: Seam["kind"] = "sewn") => seams.push({ id: `jacket-${seams.length}`, label, a, b, reverse, enabled: true, kind });
  add("Back fold continuity", [ref("back", -1, 5)], [ref("back", 1, 5)], false, "fold");
  add("Collar fold continuity", [ref("collar", -1, 3)], [ref("collar", 1, 3)], false, "fold");
  for (const side of [-1, 1]) {
    const label = side === -1 ? "Left" : "Right";
    for (const half of ["front", "back"]) {
      add(`${label} ${half} raglan`, [ref(half, side, 1)], [ref(`${half} sleeve`, side, 5)]);
      add(`${label} ${half} lower armhole`, [ref(half, side, 2)], [ref(`${half} sleeve`, side, 4)]);
    }
    add(`${label} side seam`, [ref("front", side, 3)], [ref("back", side, 3)], false);
    add(`${label} overarm`, [ref("front sleeve", side, 1)], [ref("back sleeve", side, 1)], false);
    add(`${label} underarm`, [ref("front sleeve", side, 3)], [ref("back sleeve", side, 3)], false);
    // Each chain explicitly carries its direction, independent of garment type.
    add(`${label} collar`, [ref("collar", side, 0)], [ref("back", side, 0), ref("back sleeve", side, 0), { ...ref("front sleeve", side, 0), reverse: true }, { ...ref("front", side, 0), reverse: true }], false);
  }
  const contacts = ([-1, 1] as const).map((side) => ({ id: `shoulder-${side}`, point: ref("front sleeve", side, 1), at: 0.18, landmark: `${side < 0 ? "left" : "right"} shoulder` as Landmark }));
  contacts.push({ id: "back-neck", point: ref("back", 1, 0), at: 0, landmark: "back neck" });
  return { schema: 1, garment: garment.slug, version: garment.version, topology: topologyOf(draft), seams, contacts, placements: Object.fromEntries(jacketPanels(draft).map((p) => [p.id, p.placement])) };
}

export function validateAssembly(value: unknown, expected: Assembly, panels: Panel[]): Assembly {
  const a = value as Assembly;
  if (!a || a.schema !== 1 || a.garment !== expected.garment || a.version !== expected.version || a.topology !== expected.topology) throw new Error("Assembly belongs to a different garment version or topology. Reset the assembly or remap its seams.");
  if (!Array.isArray(a.seams) || a.seams.length > 80 || !a.placements || typeof a.placements !== "object") throw new Error("Invalid assembly document.");
  const ids = new Set<string>();
  if (!Array.isArray(a.contacts) || a.contacts.length > 20) throw new Error("Invalid body supports.");
  const contactIds = new Set<string>();
  for (const c of a.contacts) {
    const panel = panels.find((p) => p.id === c.point?.panel);
    if (!panel || typeof c.id !== "string" || contactIds.has(c.id) || !Number.isInteger(c.point.edge) || !panel.piece.edges[c.point.edge] || !Number.isFinite(c.at) || c.at < 0 || c.at > 1 || !["left shoulder", "right shoulder", "back neck", "left wrist", "right wrist"].includes(c.landmark)) throw new Error("Invalid body contact.");
    contactIds.add(c.id);
  }
  for (const s of a.seams) {
    if (!s || typeof s.id !== "string" || ids.has(s.id) || typeof s.label !== "string" || s.label.length > 150 || typeof s.enabled !== "boolean" || typeof s.reverse !== "boolean" || !["sewn", "fold", "closure"].includes(s.kind)) throw new Error("Invalid or duplicate seam.");
    ids.add(s.id);
    for (const refs of [s.a, s.b]) {
      if (!Array.isArray(refs) || refs.length < 1 || refs.length > 12) throw new Error("A seam needs two valid boundary chains.");
      for (const r of refs) {
        const p = panels.find((p) => p.id === r.panel);
        if (!p || !Number.isInteger(r.edge) || !p.piece.edges[r.edge] || (r.reverse !== undefined && typeof r.reverse !== "boolean")) throw new Error("Unknown piece or edge in assembly.");
      }
    }
  }
  const placements: Assembly["placements"] = {};
  for (const panel of panels) {
    const p = a.placements[panel.id];
    if (!p || !regions.includes(p.region) || !Array.isArray(p.offset) || p.offset.length !== 3 || p.offset.some((v) => !Number.isFinite(v) || Math.abs(v) > 100)) throw new Error(`Invalid placement for ${panel.id}.`);
    placements[panel.id] = { region: p.region, offset: [...p.offset] as Vec3 };
  }
  return { ...expected, seams: a.seams, contacts: a.contacts, placements };
}

export function seamLengths(seam: Seam, panels: Panel[]): [number, number] {
  const measure = (refs: EdgeRef[]) => refs.reduce((sum, r) => sum + length(panels.find((p) => p.id === r.panel)!.piece.edges[r.edge].points), 0);
  return [measure(seam.a), measure(seam.b)];
}

export function auditAssembly(assembly: Assembly, panels: Panel[]) {
  const usage = new Map<string, number>();
  for (const seam of assembly.seams.filter((s) => s.enabled)) for (const ref of [...seam.a, ...seam.b]) {
    const key = `${ref.panel}|${ref.edge}`;
    usage.set(key, (usage.get(key) ?? 0) + 1);
  }
  const missing: EdgeRef[] = [], duplicate: EdgeRef[] = [], openings: EdgeRef[] = [];
  for (const panel of panels) panel.piece.edges.forEach((_, edge) => {
    const count = usage.get(`${panel.id}|${edge}`) ?? 0, ref = { panel: panel.id, edge };
    if (count > 1) duplicate.push(ref);
    if (count === 0) (panel.openings?.includes(edge) ? openings : missing).push(ref);
  });
  return { missing, duplicate, openings };
}

export function placePoint(panel: Panel, p: Point, body: Body, all: Panel[]): Vec3 {
  const region = panel.placement.region;
  const side = panel.side;
  const piece = panel.piece;
  let result: Vec3;
  if (region === "collar") {
    const bottom = piece.edges[0].points, total = length(bottom);
    const t = clamp(p[0] / Math.max(...bottom.map((p) => p[0])), 0, 1);
    const at = pointAt(bottom, t * total);
    // Arrange the collar on the actual assembled neckline. A tilted circular
    // ring can start inside a shoulder, leaving collision constraints trapped.
    const parts = ["back", "back sleeve", "front sleeve", "front"].map((source, i) => {
      const target = all.find((v) => v.source === source && v.side === side)!;
      const points = target.piece.edges[0].points.slice();
      if (i >= 2) points.reverse();
      return { target, points, length: length(points) };
    });
    let walked = 0;
    const along = t * parts.reduce((sum, v) => sum + v.length, 0);
    result = [0, body.neckY, 0];
    for (const part of parts) {
      if (along <= walked + part.length + 1e-8) {
        result = placePoint(part.target, pointAt(part.points, along - walked), body, all);
        result[1] += at[1] - p[1];
        break;
      }
      walked += part.length;
    }
  } else if (region.includes("sleeve")) {
    const path = piece.edges[1].points;
    let nearest = Infinity, along = 0, walked = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], d: Point = [b[0] - a[0], b[1] - a[1]];
      const len = dist(a, b);
      if (len < 1e-8) continue;
      const t = clamp(((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (len * len), 0, 1);
      const distance = dist(p, [a[0] + t * d[0], a[1] + t * d[1]]);
      if (distance < nearest) { nearest = distance; along = walked + t * len; }
      walked += len;
    }
    const t = along / walked;
    // Both half sleeves start at the high-neck landmark, not at the raglan
    // endpoint lower on the chest. Otherwise collision traps them in the torso.
    const neck: Vec3 = [body.rings[body.rings.length - 2].rx + 0.7, body.neckY + 0.7, 0];
    const upper: Vec3 = [body.shoulder[0] + 0.7, body.shoulder[1] + 0.7, 0];
    const end: Vec3 = [body.wrist[0] + 5, body.wrist[1] - 2, 0];
    const base = t < 0.18 ? mix3(neck, upper, t / 0.18) : mix3(upper, end, (t - 0.18) / 0.82);
    const halfWidth = mix(length(piece.edges[2].points) * 1.4, length(piece.edges[2].points), t);
    const radius = halfWidth / Math.PI;
    const theta = clamp(nearest / halfWidth, 0, 1) * Math.PI;
    const axisLength = Math.hypot(end[0] - upper[0], end[1] - upper[1]);
    const nx = -(end[1] - upper[1]) / axisLength, ny = (end[0] - upper[0]) / axisLength;
    result = [side * (base[0] + radius * (Math.cos(theta) - 1) * nx), base[1] + radius * (Math.cos(theta) - 1) * ny, (region === "front sleeve" ? 1 : -1) * radius * Math.sin(theta)];
  } else {
    const width = Math.max(...piece.edges[3].points.map((p) => p[0]));
    const other = all.find((v) => v.source === (region === "front" ? "back" : "front"))!.piece;
    const otherWidth = other.edges[3].points[0][0];
    const [rx, rz] = ellipseRadii(2 * (width + otherWidth), 0.66);
    const y = -p[1], armhole = -piece.edges[3].points[0][1];
    const top = clamp((y - armhole) / Math.max(1, body.neckY - armhole), 0, 1);
    const theta = p[0] / width * Math.PI / 2;
    result = [side * Math.sin(theta) * rx, y, (region === "front" ? 1 : -1) * Math.cos(theta) * mix(rz, 5, top * top)];
  }
  return result.map((v, i) => v + panel.placement.offset[i]) as Vec3;
}
