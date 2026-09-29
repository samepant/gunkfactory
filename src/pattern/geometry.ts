// 2D helpers for drafting. all pattern geometry is polylines of points;
// curves are sampled when they are created.

export type Point = [number, number];

export const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Point, s: number): Point => [a[0] * s, a[1] * s];
export const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1];
export const len = (a: Point) => Math.hypot(a[0], a[1]);
export const dist = (a: Point, b: Point) => len(sub(a, b));
export const norm = (a: Point): Point => scale(a, 1 / len(a));
export const lerp = (a: Point, b: Point, t: number): Point =>
  add(a, scale(sub(b, a), t));
// rotates 90°: in the y-down pattern space this turns "right" into "down"
export const perp = (a: Point): Point => [-a[1], a[0]];
export const fromAngle = (deg: number): Point => [
  Math.cos((deg * Math.PI) / 180),
  Math.sin((deg * Math.PI) / 180),
];
export const angleOf = (a: Point) => (Math.atan2(a[1], a[0]) * 180) / Math.PI;

export const cubic = (
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  steps = 32
): Point[] => {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
};

// quadratic curve through a corner, used to round a corner at `c`
export const roundCorner = (a: Point, c: Point, b: Point, steps = 16) =>
  cubic(a, lerp(a, c, 2 / 3), lerp(b, c, 2 / 3), b, steps);

export const length = (pts: Point[]) => {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i]);
  return total;
};

// split a polyline at an arc length from its start
export const splitAt = (pts: Point[], at: number): [Point[], Point[]] => {
  let walked = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = dist(pts[i - 1], pts[i]);
    if (walked + seg >= at) {
      const p = lerp(pts[i - 1], pts[i], seg === 0 ? 0 : (at - walked) / seg);
      return [
        [...pts.slice(0, i), p],
        [p, ...pts.slice(i)],
      ];
    }
    walked += seg;
  }
  return [pts, [pts[pts.length - 1]]];
};

export const pointAt = (pts: Point[], at: number): Point => {
  const [before] = splitAt(pts, at);
  return before[before.length - 1];
};

export const reverse = <T>(items: T[]) => [...items].reverse();

export const circleIntersections = (
  c0: Point,
  r0: number,
  c1: Point,
  r1: number
): Point[] => {
  const d = dist(c0, c1);
  if (d > r0 + r1 || d < Math.abs(r0 - r1) || d === 0) return [];
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r0 * r0 - a * a));
  const dir = norm(sub(c1, c0));
  const mid = add(c0, scale(dir, a));
  return [add(mid, scale(perp(dir), h)), add(mid, scale(perp(dir), -h))];
};

// intersection of line (p + t*d) with line (q + s*e)
export const lineIntersection = (
  p: Point,
  d: Point,
  q: Point,
  e: Point
): Point | null => {
  const cross = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(cross) < 1e-9) return null;
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / cross;
  return add(p, scale(d, t));
};

// bisection for an increasing function f: finds x in [lo, hi] with f(x) = target
export const solve = (
  f: (x: number) => number,
  target: number,
  lo: number,
  hi: number
) => {
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

const signedArea = (pts: Point[]) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
};

// offsets a closed outline made of consecutive edges, each by its own
// distance, and joins neighbouring segments at their intersections
export const offsetOutline = (
  edges: { points: Point[]; sa: number }[]
): Point[] => {
  const outline = edges.flatMap((e) => e.points.slice(0, -1));
  const sign = signedArea(outline) > 0 ? 1 : -1;

  const segments: [Point, Point][] = [];
  for (const edge of edges) {
    for (let i = 1; i < edge.points.length; i++) {
      const a = edge.points[i - 1];
      const b = edge.points[i];
      if (dist(a, b) < 1e-6) continue;
      const d = norm(sub(b, a));
      const n = scale([d[1], -d[0]], sign * edge.sa);
      segments.push([add(a, n), add(b, n)]);
    }
  }

  return segments.map((a, i) => {
    const b = segments[(i + 1) % segments.length];
    const da = norm(sub(a[1], a[0]));
    const db = norm(sub(b[1], b[0]));
    const nearlyParallel = Math.abs(da[0] * db[1] - da[1] * db[0]) < 1e-3;
    if (nearlyParallel) return lerp(a[1], b[0], 0.5);
    return lineIntersection(a[0], da, b[0], db) ?? a[1];
  });
};
