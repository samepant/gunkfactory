import type { Cut, Piece } from "./pattern";
import {
  add,
  angleOf,
  dot,
  norm,
  offsetOutline,
  type Point,
  reverse,
  scale,
  sub,
} from "./geometry.ts";

export const cutLabel = (cut: Cut) =>
  `cut ${cut.count} ${cut.fabric}${cut.fold ? " on fold" : ""}${cut.mirror ? " (mirror)" : ""}`;

const mapPiece = (piece: Piece, f: (p: Point) => Point): Piece => ({
  ...piece,
  edges: piece.edges.map((e) => ({ ...e, points: e.points.map(f) })),
  grain: [f(piece.grain[0]), f(piece.grain[1])],
  notches: piece.notches.map(f),
  marks: piece.marks.map((m) => ({ ...m, points: m.points.map(f) })),
});

const reflectAcross = (a: Point, b: Point) => {
  const d = norm(sub(b, a));
  return (p: Point): Point => {
    const v = sub(p, a);
    return add(a, sub(scale(d, 2 * dot(v, d)), v));
  };
};

// opens a piece cut on the fold into its full shape
export const unfold = (piece: Piece): Piece => {
  const i = piece.edges.findIndex((e) => e.fold);
  if (i === -1) return piece;
  const fold = piece.edges[i].points;
  const reflect = reflectAcross(fold[0], fold[fold.length - 1]);
  const edges = [...piece.edges.slice(i + 1), ...piece.edges.slice(0, i)];
  const mirrored = reverse(edges).map((e) => ({
    ...e,
    points: reverse(e.points.map(reflect)),
  }));
  return {
    ...piece,
    edges: [...edges, ...mirrored],
    notches: [...piece.notches, ...piece.notches.map(reflect)],
    marks: [
      ...piece.marks,
      ...piece.marks.map((m) => ({ ...m, points: m.points.map(reflect) })),
    ],
  };
};

// every copy that has to be cut, fold pieces opened, mirrored copies flipped
export const cutList = (pieces: Piece[]) =>
  pieces.flatMap((piece) => {
    const base = piece.cut.fold ? unfold(piece) : piece;
    return Array.from({ length: piece.cut.count }, (_, i) => {
      const mirrored = piece.cut.mirror && i % 2 === 1;
      const copy = mirrored ? mapPiece(base, ([x, y]) => [-x, y]) : base;
      const name = piece.cut.count > 1 ? `${piece.name} ${i + 1}/${piece.cut.count}` : piece.name;
      // each copy is cut once, single layer
      return {
        ...copy,
        name: mirrored ? `${name} (mirrored)` : name,
        cut: { fabric: piece.cut.fabric, count: 1 },
      };
    });
  });

const rotate = (deg: number) => {
  const c = Math.cos((deg * Math.PI) / 180);
  const s = Math.sin((deg * Math.PI) / 180);
  return ([x, y]: Point): Point => [x * c - y * s, x * s + y * c];
};

const bounds = (pts: Point[]) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

// x extent of a closed polygon within the horizontal strip [y0, y1]
const stripExtent = (pts: Point[], y0: number, y1: number): [number, number] | null => {
  let lo = Infinity;
  let hi = -Infinity;
  const take = (x: number) => {
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  };
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length];
    if (a[1] >= y0 && a[1] <= y1) take(a[0]);
    for (const y of [y0, y1]) {
      if ((a[1] - y) * (b[1] - y) < 0) {
        take(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    }
  });
  return lo === Infinity ? null : [lo, hi];
};

export interface PackOptions {
  width: number; // usable fabric width, cm
  gap: number; // space kept between cut lines, cm
  allowRotate: boolean; // allow 180° turns (fabric without nap)
  step?: number; // vertical search resolution, cm
}

export interface PackResult {
  pieces: Piece[]; // in fabric space: x along the length, y across the width
  length: number;
}

// greedy leftmost-first nesting. every piece turns so its grain runs along
// the fabric length, then goes to the lowest x (then lowest y) where it
// fits. rows treat each piece as solid between its leftmost and rightmost
// cut line, so concave scoops are not filled.
export const pack = (copies: Piece[], options: PackOptions): PackResult => {
  const step = options.step ?? 0.5;
  const rowCount = Math.floor(options.width / step);

  const candidates = copies.map((piece) => {
    const aligned = mapPiece(piece, rotate(-angleOf(sub(piece.grain[1], piece.grain[0]))));
    const turns = options.allowRotate ? [0, 180] : [0];
    const orientations = turns.map((deg) => {
      const turned = mapPiece(aligned, rotate(deg));
      const b = bounds(offsetOutline(turned.edges));
      const normalised = mapPiece(turned, ([x, y]) => [x - b.minX, y - b.minY]);
      const cut = offsetOutline(normalised.edges);
      const height = b.maxY - b.minY;
      const spans: [number, number][] = [];
      for (let r = 0; r * step < height; r++) {
        const extent = stripExtent(cut, r * step - options.gap, (r + 1) * step + options.gap);
        spans.push(extent ? [extent[0] - options.gap, extent[1] + options.gap] : [0, 0]);
      }
      return { piece: normalised, spans, length: b.maxX - b.minX };
    });
    const o = orientations[0];
    return { name: piece.name, orientations, length: o.length, height: o.spans.length * step };
  });
  type Candidate = (typeof candidates)[number];

  // greedy placement depends on order, so try a few and keep the shortest
  const orders: ((a: Candidate, b: Candidate) => number)[] = [
    (a, b) => b.length * b.height - a.length * a.height,
    (a, b) => b.length - a.length,
    (a, b) => b.height - a.height,
  ];
  const results = orders.map((order) =>
    packInOrder([...candidates].sort(order), rowCount, step)
  );
  return results.reduce((best, r) => (r.length < best.length ? r : best));
};

const packInOrder = (
  candidates: {
    name: string;
    orientations: { piece: Piece; spans: [number, number][]; length: number }[];
  }[],
  rowCount: number,
  step: number
): PackResult => {
  const occupied: [number, number][][] = Array.from({ length: rowCount }, () => []);

  // smallest x >= 0 where the piece's row spans miss everything placed
  const fitX = (spans: [number, number][], row: number) => {
    const blocked: [number, number][] = [];
    spans.forEach(([a, b], r) => {
      for (const [lo, hi] of occupied[row + r]) blocked.push([lo - b, hi - a]);
    });
    blocked.sort((p, q) => p[0] - q[0]);
    let x = 0;
    for (const [lo, hi] of blocked) {
      if (lo >= x) break;
      if (hi > x) x = hi;
    }
    return x;
  };

  const placed: Piece[] = [];
  let length = 0;
  for (const candidate of candidates) {
    let best: { x: number; row: number; o: (typeof candidate.orientations)[number] } | null = null;
    for (const o of candidate.orientations) {
      for (let row = 0; row + o.spans.length <= rowCount; row++) {
        const x = fitX(o.spans, row);
        if (!best || x < best.x - 1e-6) best = { x, row, o };
      }
    }
    if (!best) {
      throw new Error(`${candidate.name} is wider than the fabric`);
    }
    const { x, row, o } = best;
    o.spans.forEach(([a, b], r) => occupied[row + r].push([x + a, x + b]));
    placed.push(mapPiece(o.piece, ([px, py]) => [px + x, py + row * step]));
    length = Math.max(length, x + o.length);
  }
  return { pieces: placed, length };
};
