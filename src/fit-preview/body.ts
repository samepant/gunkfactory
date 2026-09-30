import type { Measurements } from "../measurements/measurement";
import type { Arm, Body, BodyOptions, Ring, Vec3 } from "./types";

export type BodyMeasurements = Partial<Record<keyof Measurements, number>>;
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => a.map((v, i) => mix(v, b[i], t)) as Vec3;

// Normalize to the perimeter of the actual 64-sided measurement ring.
export function ellipseRadii(girth: number, ratio: number): [number, number] {
  let perimeter = 0;
  for (let i = 0; i < 64; i++) {
    const a = i * Math.PI / 32, b = (i + 1) * Math.PI / 32;
    perimeter += Math.hypot(Math.cos(a) - Math.cos(b), ratio * (Math.sin(a) - Math.sin(b)));
  }
  return [girth / perimeter, girth / perimeter * ratio];
}

export function createBody(m: BodyMeasurements, options: BodyOptions): Body {
  for (const [key, value] of Object.entries(m)) {
    if (!Number.isFinite(value) || value <= 0 || value > 400) throw new Error(`Invalid body measurement: ${key}. Use positive measurements in cm.`);
  }
  if (!(options.depth >= 0.45 && options.depth <= 0.95) || !(options.armAngle >= 15 && options.armAngle <= 60) || !(options.shoulderSlope >= 5 && options.shoulderSlope <= 35)) throw new Error("Body proportions are outside the supported range.");
  const assumptions: string[] = ["Symmetric body; torso cross-sections are elliptical.", "Torso depth, shoulder slope, and arm pose are adjustable estimates."];
  const measurements: Body["measurements"] = [];
  const take = (key: keyof Measurements, label: string, fallback: number, source: "derived" | "assumed" = "assumed") => {
    const cm = m[key] ?? fallback;
    measurements.push({ label, cm, source: m[key] ? "measured" : source });
    if (!m[key] && source === "assumed") assumptions.push(`${label} is estimated (${cm.toFixed(1)} cm).`);
    return cm;
  };
  const chest = take("chestGirth", "Chest", 2 * ((m.halfFrontChest ?? 25) + (m.halfBackChest ?? 25)), m.halfFrontChest && m.halfBackChest ? "derived" : "assumed");
  if (m.chestGirth && m.halfFrontChest && m.halfBackChest && Math.abs(chest - 2 * (m.halfFrontChest + m.halfBackChest)) > 2) assumptions.push("Chest girth conflicts with front/back arcs; body uses chest girth, while the pattern uses its original measurements.");
  const hasAbdomen = !!(m.halfFrontAbdomen && m.halfBackAbdomen);
  const abdomen = take("abdomenGirth", "Abdomen", hasAbdomen ? 2 * (m.halfFrontAbdomen! + m.halfBackAbdomen!) : chest * 0.92, hasAbdomen ? "derived" : "assumed");
  const hasWaist = !!(m.halfFrontWaist && m.halfBackWaist);
  const waist = take("waistGirth", "Waist", hasWaist ? 2 * (m.halfFrontWaist! + m.halfBackWaist!) : abdomen * 0.93, hasWaist ? "derived" : "assumed");
  const hasHip = !!(m.halfFrontHip && m.halfBackHip);
  const hip = take("hipGirth", "Hip", hasHip ? 2 * (m.halfFrontHip! + m.halfBackHip!) : chest, hasHip ? "derived" : "assumed");
  const hipHeight = take("hipHeightSide", "Waist to hip", 20);
  const neckY = take("centerBack", "Back neck to waist", 45) + 2;
  const bicep = take("bicepGirth", "Bicep", chest * 0.32);
  const wrist = take("wristGirth", "Wrist", bicep * 0.55);
  const armLength = take("armLength", "Arm length", 64);
  const forearm = take("forearmLength", "Forearm length", armLength * 0.45);
  const elbow = take("elbowGirth", "Elbow", bicep * 0.82);
  const neckGirth = 2 * ((m.halfFrontNeckline ?? 11.5) + (m.halfBackNeckline ?? 8));
  const [neckRx, neckRz] = ellipseRadii(neckGirth, 0.87);
  const shoulderLength = m.shoulderSeam ?? 15;
  const slope = options.shoulderSlope * Math.PI / 180;
  const shoulder: Vec3 = [neckRx + shoulderLength * Math.cos(slope), neckY - shoulderLength * Math.sin(slope), 0];
  const angle = options.armAngle * Math.PI / 180;
  const armEnd: Vec3 = [shoulder[0] + armLength * Math.sin(angle), shoulder[1] - armLength * Math.cos(angle), 0];
  // The measured shoulder tip is a surface landmark. Placing a capsule's
  // center there adds a whole arm radius above the shoulder and erases its slope.
  const radius = bicep / (2 * Math.PI);
  const armRoot: Vec3 = [shoulder[0] - radius * Math.sin(slope), shoulder[1] - radius * Math.cos(slope), 0];
  const elbowPoint = mix3(armRoot, armEnd, clamp(1 - forearm / armLength, 0.3, 0.7));
  const makeRing = (y: number, girth: number): Ring => {
    const [rx, rz] = ellipseRadii(girth, options.depth);
    return { y, rx, rz };
  };
  const chestY = clamp((m.sideSeam ?? 21) + 2.54, 14, neckY - 15);
  const rings: Ring[] = [makeRing(-hipHeight - 5, hip * 0.96), makeRing(-hipHeight, hip), makeRing(0, waist), makeRing(chestY * 0.48, abdomen), makeRing(chestY, chest), makeRing(neckY - 12, chest * 0.93), { y: shoulder[1], rx: shoulder[0], rz: neckRz * 1.12 }, { y: neckY, rx: neckRx, rz: neckRz }, { y: neckY + 6, rx: neckRx * 0.92, rz: neckRz * 0.92 }].sort((a, b) => a.y - b.y);
  const arms: Arm[] = [-1, 1].flatMap((side) => {
    const reflect = (p: Vec3): Vec3 => [p[0] * side, p[1], p[2]];
    return [{ a: reflect(armRoot), b: reflect(elbowPoint), r0: radius, r1: elbow / (2 * Math.PI) }, { a: reflect(elbowPoint), b: reflect(armEnd), r0: elbow / (2 * Math.PI), r1: wrist / (2 * Math.PI) }];
  });
  return { rings, arms, shoulder, wrist: armEnd, neckY, chest, assumptions, measurements };
}

export function bodyRing(body: Body, y: number): Ring {
  const rings = body.rings;
  for (let i = 1; i < rings.length; i++) {
    if (y <= rings[i].y) {
      const a = rings[i - 1], b = rings[i], t = clamp((y - a.y) / (b.y - a.y), 0, 1);
      return { y, rx: mix(a.rx, b.rx, t), rz: mix(a.rz, b.rz, t) };
    }
  }
  return { ...rings[rings.length - 1], y };
}

// Same analytic surfaces are used by the viewer and particle collision.
export function projectOutside(body: Body, p: Vec3, margin = 0.45): number {
  const original = [...p];
  // Project along the loft's 3D gradient. Purely horizontal projection can
  // trap neckline vertices below the shoulder instead of lifting them onto it.
  for (let iteration = 0; iteration < 5; iteration++) {
    if (p[1] < body.rings[0].y || p[1] > body.rings[body.rings.length - 1].y) break;
    const ring = bodyRing(body, p[1]);
    const rx = ring.rx + margin, rz = ring.rz + margin;
    const f = (p[0] / rx) ** 2 + (p[2] / rz) ** 2 - 1;
    if (f >= -1e-7) break;
    const index = Math.max(1, body.rings.findIndex((r) => r.y >= p[1]));
    const a = body.rings[index - 1], b = body.rings[index];
    const drx = (b.rx - a.rx) / (b.y - a.y), drz = (b.rz - a.rz) / (b.y - a.y);
    const gradient = [2 * p[0] / (rx * rx), -2 * p[0] ** 2 * drx / (rx ** 3) - 2 * p[2] ** 2 * drz / (rz ** 3), 2 * p[2] / (rz * rz)];
    const square = gradient.reduce((sum, v) => sum + v * v, 0);
    if (square < 1e-10) { p[2] = rz; break; }
    for (let k = 0; k < 3; k++) p[k] -= f * gradient[k] / square;
  }
  for (const arm of body.arms) {
    const d = arm.b.map((v, i) => v - arm.a[i]);
    const t = clamp(d.reduce((sum, v, i) => sum + v * (p[i] - arm.a[i]), 0) / d.reduce((sum, v) => sum + v * v, 0), 0, 1);
    const c = mix3(arm.a, arm.b, t);
    const delta = p.map((v, i) => v - c[i]);
    const distance = Math.hypot(...delta), radius = mix(arm.r0, arm.r1, t) + margin;
    if (distance < radius) {
      if (distance < 1e-8) p[2] += radius;
      else for (let i = 0; i < 3; i++) p[i] = c[i] + delta[i] * radius / distance;
    }
  }
  return Math.hypot(...p.map((v, i) => v - original[i]));
}
