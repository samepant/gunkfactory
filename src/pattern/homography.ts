import type { Point } from "./geometry.ts";

// projective transform taking the rectangle (0,0)-(w,h) onto four screen
// corners (top-left, top-right, bottom-right, bottom-left), as a css matrix3d
export const rectToQuad = (w: number, h: number, quad: Point[]) => {
  const src: Point[] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  // solve the 8 unknowns a..h of x' = (ax + by + c) / (gx + hy + 1),
  // y' = (dx + ey + f) / (gx + hy + 1)
  const rows: number[][] = [];
  src.forEach(([x, y], i) => {
    const [u, v] = quad[i];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) {
      if (Math.abs(rows[r][col]) > Math.abs(rows[pivot][col])) pivot = r;
    }
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const f = rows[r][col] / rows[col][col];
      for (let c = col; c < 9; c++) rows[r][c] -= f * rows[col][c];
    }
  }
  const [a, b, c, d, e, f, g, hh] = rows.map((r, i) => r[8] / r[i]);
  return `matrix3d(${[a, d, 0, g, b, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1].join(",")})`;
};
