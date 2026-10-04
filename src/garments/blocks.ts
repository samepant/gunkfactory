import type { MeasurementsCm } from "./garment";
import type { Edge } from "../pattern/pattern";
import {
  angleOf,
  circleIntersections,
  cubic,
  length,
  type Point,
  reverse,
  solve,
  sub,
} from "../pattern/geometry.ts";

// shared drafting pieces for torso garments.
//
// drafting space: cm, x away from centre back / centre front, y down,
// natural waist at y = 0.

const BACK_NECK_RISE = 2;
const ARMPIT_TO_SIDE_SEAM_PIN = 2.54; // the side seam measurement starts 1" below the armpit

export type Half = "back" | "front";

export interface TorsoParams {
  neckEase: number; // per quarter neckline
  shoulderTipRaise: number;
  armholeDrop: number; // below the body's armpit
  chestEase: number; // total, split over the four quarters
  acrossEase: number;
}

export interface TorsoHalf {
  neck: Point[]; // centre neck -> high neck point
  hnp: Point;
  shoulderTip: Point;
  underarm: Point; // side seam at the (lowered) armhole
  across: Point; // armhole point at the across back / front width
  lowerArmhole: Point[]; // across -> underarm
  shoulderSlope: number;
}

// the back neck rise is fixed, so its width sets the neck; the front shares
// that width and gets its depth from the front neckline length
export const neckWidthFor = (m: MeasurementsCm, neckEase: number) =>
  solve(
    (w) =>
      length(
        cubic(
          [0, 0],
          [0.5523 * w, 0],
          [w, -BACK_NECK_RISE + 0.5523 * BACK_NECK_RISE],
          [w, -BACK_NECK_RISE]
        )
      ),
    m.halfBackNeckline + neckEase,
    0.5,
    30
  );

export const draftTorsoHalf = (
  half: Half,
  m: MeasurementsCm,
  p: TorsoParams,
  neckWidth: number
): TorsoHalf => {
  const isBack = half === "back";
  const centreNeckY = -(isBack ? m.centerBack : m.centerFront);
  const neckLength =
    (isBack ? m.halfBackNeckline : m.halfFrontNeckline) + p.neckEase;

  // quarter-ellipse neck from centre neck (horizontal) up to the high neck point (vertical)
  const neckCurve = (depth: number) => {
    const k = 0.5523;
    const hnpY = centreNeckY - depth;
    return cubic(
      [0, centreNeckY],
      [k * neckWidth, centreNeckY],
      [neckWidth, hnpY + k * depth],
      [neckWidth, hnpY]
    );
  };
  const depth = isBack
    ? BACK_NECK_RISE
    : solve((d) => length(neckCurve(d)), neckLength, 0.2, 30);
  const neck = neckCurve(depth);
  const hnp = neck[neck.length - 1];

  // shoulder tip: shoulder seam length from the high neck point, and the
  // shoulder-tip-to-centre-waist length from the centre waist at (0, 0)
  const tipToWaist = isBack
    ? m.shoulderTipToCenterWaistBack
    : m.shoulderTipToCenterWaistFront;
  const tips = circleIntersections(hnp, m.shoulderSeam, [0, 0], tipToWaist);
  if (tips.length === 0) {
    throw new Error(
      `can't place the ${half} shoulder tip: shoulderSeam and shoulderTipToCenterWaist${isBack ? "Back" : "Front"} don't meet. re-check them.`
    );
  }
  const tip = tips[0][0] > tips[1][0] ? tips[0] : tips[1];
  const shoulderTip: Point = [tip[0], tip[1] - p.shoulderTipRaise];

  const armholeY =
    -(m.sideSeam + ARMPIT_TO_SIDE_SEAM_PIN) + p.armholeDrop;
  const underarm: Point = [
    (isBack ? m.halfBackChest : m.halfFrontChest) + p.chestEase / 4,
    armholeY,
  ];
  const across: Point = [
    (isBack ? m.halfBackToMidArmhole : m.halfFrontToMidArmhole) + p.acrossEase,
    armholeY - 0.35 * (armholeY - shoulderTip[1]),
  ];
  if (across[0] >= underarm[0]) {
    throw new Error(
      `${half} across measurement is wider than the ${half} chest. re-check them.`
    );
  }

  const h = underarm[1] - across[1];
  const w = underarm[0] - across[0];
  const lowerArmhole = cubic(
    across,
    [across[0], across[1] + 0.6 * h],
    [across[0] + 0.4 * w, underarm[1]],
    underarm
  );

  return {
    neck,
    hnp,
    shoulderTip,
    underarm,
    across,
    lowerArmhole,
    shoulderSlope: angleOf(sub(shoulderTip, hnp)),
  };
};

// stand collar on the fold at centre back. `length` is the half neckline it
// is sewn to; the front end rises by `rise` so the collar hugs the neck.
export const standCollar = (
  neckLength: number,
  height: number,
  rise: number,
  sa: number
) => {
  const curve = (span: number) =>
    cubic([0, 0], [span * 0.4, 0], [span * 0.75, 0], [span, -rise]);
  const span = solve(
    (s) => length(curve(s)),
    neckLength,
    neckLength * 0.5,
    neckLength
  );
  const bottom = curve(span);
  const top = bottom.map(([x, y]): Point => [x, y - height]);
  const end = bottom[bottom.length - 1];
  const edges: Edge[] = [
    { points: bottom, sa },
    { points: [end, top[top.length - 1]], sa },
    { points: reverse(top), sa },
    { points: [top[0], bottom[0]], sa: 0, fold: true },
  ];
  const grain: [Point, Point] = [
    [2, -height / 2],
    [span - 4, -height / 2],
  ];
  return { edges, grain, bottom };
};

export const rect = (w: number, h: number, sa: number, topSa = sa): Edge[] => [
  { points: [[0, 0], [w, 0]], sa: topSa },
  { points: [[w, 0], [w, h]], sa },
  { points: [[w, h], [0, h]], sa },
  { points: [[0, h], [0, 0]], sa },
];
