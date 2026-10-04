import type {
  Garment,
  GarmentParamDescriptor,
  GarmentParams,
  MeasurementsCm,
} from "../garment";
import type { Check, Cut, Edge, Mark, Measure, Piece, SketchLine, Trim } from "../../pattern/pattern";
import {
  bothSides,
  collarBand,
  draftTorsoHalf,
  type Half,
  mirrorX,
  neckWidthFor,
  rect,
  seamOutline,
  standCollar,
  type TorsoHalf,
} from "../blocks.ts";
import {
  add,
  cubic,
  dist,
  dot,
  fromAngle,
  length,
  lerp,
  lineIntersection,
  norm,
  perp,
  type Point,
  pointAt,
  reverse,
  roundCorner,
  scale,
  solve,
  splitAt,
  sub,
} from "../../pattern/geometry.ts";

// boxy cropped chore coat with a two-piece raglan sleeve, stand collar,
// patch pockets and a bagged lining with inner storm cuffs.
//
// drafting space: cm, x away from centre back / centre front, y down,
// natural waist at y = 0. front and back are drafted separately; each
// half-sleeve is drafted off its body half and split along the raglan line.

const params: GarmentParamDescriptor[] = [
  { name: "chest ease", slug: "chestEase", type: "length", default: 25 },
  { name: "neck ease (per quarter)", slug: "neckEase", type: "length", default: 1.5 },
  { name: "armhole drop", slug: "armholeDrop", type: "length", default: 6 },
  { name: "across ease", slug: "acrossEase", type: "length", default: 1.5 },
  { name: "length below waist", slug: "lengthBelowWaist", type: "length", default: 12 },
  { name: "shoulder tip raise", slug: "shoulderTipRaise", type: "length", default: 0 },
  { name: "sleeve pitch (deg below shoulder)", slug: "sleevePitch", type: "number", default: 24 },
  { name: "sleeve length ease", slug: "sleeveLengthEase", type: "length", default: 3 },
  { name: "bicep ease", slug: "bicepEase", type: "length", default: 14 },
  { name: "sleeve hem ease", slug: "sleeveHemEase", type: "length", default: 14 },
  { name: "raglan neck offset", slug: "raglanNeck", type: "length", default: 3.5 },
  { name: "closure", slug: "closure", type: "select", default: "overlap", options: ["overlap", "zip"] },
  { name: "overlap extension", slug: "extension", type: "length", default: 3 },
  { name: "snap / button count", slug: "snapCount", type: "number", default: 5 },
  { name: "collar height", slug: "collarHeight", type: "length", default: 6.5 },
  { name: "collar front rise", slug: "collarRise", type: "length", default: 1 },
  { name: "pocket width", slug: "pocketWidth", type: "length", default: 20 },
  { name: "pocket height", slug: "pocketHeight", type: "length", default: 21 },
  { name: "pocket inset from CF", slug: "pocketInset", type: "length", default: 4 },
  { name: "pocket above hem", slug: "pocketAboveHem", type: "length", default: 6 },
  { name: "storm cuff inset", slug: "stormCuffInset", type: "length", default: 4 },
  { name: "storm cuff height", slug: "stormCuffHeight", type: "length", default: 7 },
  { name: "back lining pleat", slug: "backPleat", type: "length", default: 2 },
  { name: "seam allowance", slug: "seamAllowance", type: "length", default: 1 },
  { name: "hem allowance", slug: "hemAllowance", type: "length", default: 3 },
];

const requiredMeasurements: Garment["requiredMeasurements"] = [
  "centerBack",
  "centerFront",
  "halfBackNeckline",
  "halfFrontNeckline",
  "shoulderSeam",
  "shoulderTipToCenterWaistBack",
  "shoulderTipToCenterWaistFront",
  "halfBackChest",
  "halfFrontChest",
  "halfBackToMidArmhole",
  "halfFrontToMidArmhole",
  "sideSeam",
  "abdomenGirth",
  "hipGirth",
  "armLength",
  "bicepGirth",
  "wristGirth",
  "handGirth",
];

interface BodyHalf extends TorsoHalf {
  bodyNeck: Point[]; // centre neck -> raglan neck point
  sleeveNeck: Point[]; // raglan neck point -> high neck point
  raglan: Point[]; // raglan neck point -> across, where the raglan line meets the armhole
}

const draftBodyHalf = (
  half: Half,
  m: MeasurementsCm,
  p: Record<string, number>,
  neckWidth: number
): BodyHalf => {
  const torso = draftTorsoHalf(half, m, {
    neckEase: p.neckEase,
    shoulderTipRaise: p.shoulderTipRaise,
    armholeDrop: p.armholeDrop,
    chestEase: p.chestEase,
    acrossEase: p.acrossEase,
  }, neckWidth);
  const { neck, across } = torso;

  const [bodyNeck, sleeveNeck] = splitAt(neck, length(neck) - p.raglanNeck);
  const raglanNeckPoint = bodyNeck[bodyNeck.length - 1];
  const raglan = cubic(
    raglanNeckPoint,
    lerp(raglanNeckPoint, across, 0.33),
    add(across, [0, -0.3 * dist(raglanNeckPoint, across)]),
    across
  );

  return { ...torso, bodyNeck, sleeveNeck, raglan };
};

interface HalfSleeve {
  overarm: Point[]; // high neck point -> hem
  underarmSeam: Point[]; // hem -> sleeve underarm point
  underarmCurve: Point[]; // across -> sleeve underarm point
  hemTop: Point;
  hemBottom: Point;
  bicep: number; // half-sleeve width at the underarm
  // same half-sleeve, shortened for the lining
  lining: { overarm: Point[]; underarmSeam: Point[] };
}

const draftHalfSleeve = (
  body: BodyHalf,
  m: MeasurementsCm,
  p: Record<string, number>
): HalfSleeve => {
  const s = body.shoulderTip;
  const d = fromAngle(body.shoulderSlope + p.sleevePitch);
  const n = perp(d); // towards the underarm
  const sleeveLength = m.armLength + p.sleeveLengthEase;
  const halfWidth = (m.bicepGirth + p.bicepEase) / 2;
  const hemHalf = (m.wristGirth + p.sleeveHemEase) / 2;

  const hemTop = add(s, scale(d, sleeveLength));
  const hemBottom = add(hemTop, scale(n, hemHalf));

  // the sleeve underarm curve starts where the raglan meets the armhole and must be as
  // long as the body armhole below the crossing. slide its end along the
  // sleeve's underside line until the lengths match.
  const underside = add(s, scale(n, halfWidth));
  const curveTo = (end: Point) => {
    const u = norm(sub(hemBottom, end));
    const k = dist(body.across, end) / 3;
    return cubic(
      body.across,
      add(body.across, [0, k]),
      sub(end, scale(perp(u), k)),
      end
    );
  };
  const at = (t: number) => add(underside, scale(d, t));
  const closest = Math.max(0, dot(sub(body.across, underside), d));
  const t = solve(
    (t) => length(curveTo(at(t))),
    length(body.lowerArmhole),
    closest,
    sleeveLength * 0.8
  );
  const underarmPoint = at(t);

  const r = Math.min(6, m.shoulderSeam * 0.4);
  const shoulderDir = norm(sub(s, body.hnp));
  const overarm = [
    body.hnp,
    ...roundCorner(add(s, scale(shoulderDir, -r)), s, add(s, scale(d, r))),
    hemTop,
  ];

  const liningOverarm = splitAt(overarm, length(overarm) - p.stormCuffInset)[0];
  const liningHemTop = liningOverarm[liningOverarm.length - 1];
  const liningHemBottom =
    lineIntersection(liningHemTop, n, underarmPoint, sub(hemBottom, underarmPoint)) ??
    hemBottom;

  return {
    overarm,
    underarmSeam: [hemBottom, underarmPoint],
    underarmCurve: curveTo(underarmPoint),
    hemTop,
    hemBottom,
    bicep: halfWidth,
    lining: {
      overarm: liningOverarm,
      underarmSeam: [liningHemBottom, underarmPoint],
    },
  };
};

// shortens the longer of two straight seams (hem end first) so they match.
// returns how much was taken off.
const balanceSeams = (a: Point[], b: Point[]) => {
  const diff = length(a) - length(b);
  const longer = diff > 0 ? a : b;
  longer[0] = add(longer[0], scale(norm(sub(longer[1], longer[0])), Math.abs(diff)));
  return Math.abs(diff);
};

const midNotches =(pts: Point[], count: number): Point[] => {
  const mid = length(pts) / 2;
  return count === 1 ? [pointAt(pts, mid)] : [pointAt(pts, mid - 0.5), pointAt(pts, mid + 0.5)];
};

const draft = (m: MeasurementsCm, params: GarmentParams) => {
  const p = params as Record<string, number>;
  const overlap = params.closure === "overlap";
  const ext = overlap ? p.extension : 0;
  const sa = p.seamAllowance;
  const hemSa = p.hemAllowance;
  const hemY = p.lengthBelowWaist;

  const backNeckWidth = neckWidthFor(m, p.neckEase);
  const back = draftBodyHalf("back", m, p, backNeckWidth);
  const front = draftBodyHalf("front", m, p, backNeckWidth);
  const backSleeve = draftHalfSleeve(back, m, p);
  const frontSleeve = draftHalfSleeve(front, m, p);
  const underarmBalance = balanceSeams(backSleeve.underarmSeam, frontSleeve.underarmSeam);
  balanceSeams(backSleeve.lining.underarmSeam, frontSleeve.lining.underarmSeam);

  const pieces: Piece[] = [];
  const bodyGrain = (x: number, top: number): [Point, Point] => [
    [x, top + 8],
    [x, hemY - 8],
  ];

  // --- back
  const backNeckY = back.neck[0][1];
  const backEdges = (cbX: number): Edge[] => [
    { points: [[cbX, backNeckY], ...back.bodyNeck], sa },
    { points: back.raglan, sa },
    { points: back.lowerArmhole, sa },
    { points: [back.underarm, [back.underarm[0], hemY]], sa },
    { points: [[back.underarm[0], hemY], [cbX, hemY]], sa: hemSa },
    { points: [[cbX, hemY], [cbX, backNeckY]], sa: 0, fold: true },
  ];
  pieces.push({
    name: "back",
    cut: { fabric: "shell", count: 1, fold: true },
    edges: backEdges(0),
    grain: bodyGrain(back.underarm[0] / 2, backNeckY),
    notches: midNotches(back.raglan, 2),
    marks: [],
  });

  // --- front
  const frontNeckY = front.neck[0][1];
  const snaps: Mark[] = [];
  if (overlap && p.snapCount > 0) {
    const top = frontNeckY + 2.5;
    const bottom = hemY - 6;
    for (let i = 0; i < p.snapCount; i++) {
      const y = p.snapCount === 1 ? top : top + ((bottom - top) * i) / (p.snapCount - 1);
      snaps.push({ kind: "cross", points: [[0, y]] });
    }
  }
  const pocketTop = hemY - p.pocketAboveHem - p.pocketHeight;
  const pocketLeft = p.pocketInset;
  const pocketRight = pocketLeft + p.pocketWidth;
  const pocketBottom = hemY - p.pocketAboveHem;
  const pocketMark: Mark = {
    kind: "dash",
    points: [
      [pocketLeft, pocketTop],
      [pocketRight, pocketTop],
      [pocketRight, pocketBottom],
      [pocketLeft, pocketBottom],
      [pocketLeft, pocketTop],
    ],
  };
  const cfLine: Mark[] = overlap
    ? [{ kind: "dash", points: [[0, frontNeckY], [0, hemY]] }]
    : [];

  pieces.push({
    name: "front",
    cut: { fabric: "shell", count: 2, mirror: true },
    edges: [
      { points: [[-ext, frontNeckY], ...front.bodyNeck], sa },
      { points: front.raglan, sa },
      { points: front.lowerArmhole, sa },
      { points: [front.underarm, [front.underarm[0], hemY]], sa },
      { points: [[front.underarm[0], hemY], [-ext, hemY]], sa: hemSa },
      { points: [[-ext, hemY], [-ext, frontNeckY]], sa },
    ],
    grain: bodyGrain(front.underarm[0] / 2, frontNeckY),
    notches: midNotches(front.raglan, 1),
    marks: [...cfLine, ...snaps, pocketMark],
  });

  // --- front facing and front lining split along the facing line
  const [facingNeck, liningNeck] = splitAt(
    front.bodyNeck,
    length(front.bodyNeck) * 0.75
  );
  const facingTop = facingNeck[facingNeck.length - 1];
  const facingBottom: Point = [facingTop[0] + 3, hemY];
  pieces.push({
    name: "front facing",
    cut: { fabric: "shell", count: 2, mirror: true },
    edges: [
      { points: [[-ext, frontNeckY], ...facingNeck], sa },
      { points: [facingTop, facingBottom], sa },
      { points: [facingBottom, [-ext, hemY]], sa: hemSa },
      { points: [[-ext, hemY], [-ext, frontNeckY]], sa },
    ],
    grain: [
      [facingTop[0] / 2, frontNeckY + 5],
      [facingTop[0] / 2, hemY - 5],
    ],
    notches: [],
    marks: [...cfLine, ...snaps],
  });

  // --- storm collar, on the fold at centre back
  const backNeckLength = length(back.neck);
  const frontNeckLength = length(front.neck);
  const collarLength = backNeckLength + frontNeckLength + ext;
  const collar = standCollar(collarLength, p.collarHeight, p.collarRise, sa);
  const bottom = collar.bottom;
  pieces.push({
    name: "collar",
    cut: { fabric: "shell", count: 2, fold: true },
    edges: collar.edges,
    grain: collar.grain,
    notches: [
      pointAt(bottom, backNeckLength - p.raglanNeck),
      pointAt(bottom, backNeckLength),
      pointAt(bottom, backNeckLength + p.raglanNeck),
      ...(overlap ? [pointAt(bottom, backNeckLength + frontNeckLength)] : []),
    ],
    marks: [],
  });

  // --- half-sleeves, shell and lining
  const sleevePiece = (
    name: string,
    cut: Cut,
    body: BodyHalf,
    sleeve: HalfSleeve,
    overarm: Point[],
    underarmSeam: Point[],
    hemAllowance: number,
    notchCount: number
  ): Piece => {
    const hemTop = overarm[overarm.length - 1];
    const hemBottom = underarmSeam[0];
    const d = norm(sub(hemTop, body.shoulderTip));
    const off = scale(perp(d), sleeve.bicep / 2);
    return {
      name,
      cut,
      edges: [
        { points: body.sleeveNeck, sa },
        { points: overarm, sa },
        { points: [hemTop, hemBottom], sa: hemAllowance },
        { points: underarmSeam, sa },
        { points: reverse(sleeve.underarmCurve), sa },
        { points: reverse(body.raglan), sa },
      ],
      grain: [
        add(add(body.shoulderTip, scale(d, 10)), off),
        add(add(hemTop, scale(d, -10)), off),
      ],
      notches: midNotches(body.raglan, notchCount),
      marks: [],
    };
  };

  pieces.push(
    sleevePiece("back sleeve", { fabric: "shell", count: 2, mirror: true }, back, backSleeve, backSleeve.overarm, backSleeve.underarmSeam, hemSa, 2),
    sleevePiece("front sleeve", { fabric: "shell", count: 2, mirror: true }, front, frontSleeve, frontSleeve.overarm, frontSleeve.underarmSeam, hemSa, 1)
  );

  // --- patch pocket and throat tab
  pieces.push({
    name: "patch pocket",
    cut: { fabric: "shell", count: 2 },
    edges: rect(p.pocketWidth, p.pocketHeight, sa, hemSa),
    grain: [
      [p.pocketWidth / 2, 3],
      [p.pocketWidth / 2, p.pocketHeight - 3],
    ],
    notches: [],
    marks: [],
  });
  pieces.push({
    name: "throat tab",
    cut: { fabric: "shell", count: 2 },
    edges: rect(10, 4, sa),
    grain: [
      [2, 2],
      [8, 2],
    ],
    notches: [],
    marks: [],
  });

  // --- lining
  const liningHemSa = hemSa / 2;
  const liningBack = backEdges(-p.backPleat);
  liningBack[4] = { ...liningBack[4], sa: liningHemSa };
  pieces.push({
    name: "back lining",
    cut: { fabric: "lining", count: 1, fold: true },
    edges: liningBack,
    grain: bodyGrain(back.underarm[0] / 2, backNeckY),
    notches: midNotches(back.raglan, 2),
    marks: [{ kind: "dash", points: [[0, backNeckY], [0, hemY]] }],
  });
  pieces.push({
    name: "front lining",
    cut: { fabric: "lining", count: 2, mirror: true },
    edges: [
      { points: liningNeck, sa },
      { points: front.raglan, sa },
      { points: front.lowerArmhole, sa },
      { points: [front.underarm, [front.underarm[0], hemY]], sa },
      { points: [[front.underarm[0], hemY], facingBottom], sa: liningHemSa },
      { points: [facingBottom, facingTop], sa },
    ],
    grain: bodyGrain((facingTop[0] + front.underarm[0]) / 2, frontNeckY),
    notches: midNotches(front.raglan, 1),
    marks: [],
  });
  pieces.push(
    sleevePiece("back sleeve lining", { fabric: "sleeve lining", count: 2, mirror: true }, back, backSleeve, backSleeve.lining.overarm, backSleeve.lining.underarmSeam, sa, 2),
    sleevePiece("front sleeve lining", { fabric: "sleeve lining", count: 2, mirror: true }, front, frontSleeve, frontSleeve.lining.overarm, frontSleeve.lining.underarmSeam, sa, 1)
  );

  // --- inner storm cuff, folded in half lengthwise
  const cuffLength = m.wristGirth + 2;
  pieces.push({
    name: "storm cuff",
    cut: { fabric: "rib", count: 2 },
    edges: rect(cuffLength, p.stormCuffHeight * 2, sa),
    grain: [
      [cuffLength / 2, 2],
      [cuffLength / 2, p.stormCuffHeight * 2 - 2],
    ],
    notches: [],
    marks: [{ kind: "dash", points: [[0, p.stormCuffHeight], [cuffLength, p.stormCuffHeight]] }],
  });

  // --- checks
  const finishedChest = 2 * (back.underarm[0] + front.underarm[0]);
  const sleeveHem = m.wristGirth + p.sleeveHemEase;
  const backOverarm = length(backSleeve.overarm) + length(back.sleeveNeck);
  const frontOverarm = length(frontSleeve.overarm) + length(front.sleeveNeck);
  const checks: Check[] = [
    { label: "finished chest / hem", cm: finishedChest },
    {
      label: "ease over abdomen",
      cm: finishedChest - m.abdomenGirth,
      warn: finishedChest < m.abdomenGirth + 10,
    },
    {
      label: "ease over full hip",
      cm: finishedChest - m.hipGirth,
      warn: finishedChest < m.hipGirth,
    },
    {
      label: "back / front shoulder slope",
      text: `${back.shoulderSlope.toFixed(0)}° / ${front.shoulderSlope.toFixed(0)}°`,
      warn: [back.shoulderSlope, front.shoulderSlope].some((a) => a < 12 || a > 30),
    },
    { label: "sleeve at bicep", cm: backSleeve.bicep + frontSleeve.bicep },
    {
      label: "sleeve hem",
      cm: sleeveHem,
      warn: sleeveHem < m.handGirth + 2,
    },
    {
      label: "underarm seam trimmed to match",
      cm: underarmBalance,
      warn: underarmBalance > 1.5,
    },
    {
      label: "overarm seam back − front",
      cm: backOverarm - frontOverarm,
      warn: Math.abs(backOverarm - frontOverarm) > 0.5,
    },
    { label: "collar length (half)", cm: collarLength },
    {
      label: "pocket clearance to side seam",
      cm: front.underarm[0] - pocketRight,
      warn: front.underarm[0] - pocketRight < 2,
    },
  ];

  // --- tech pack: flat drawings, points of measure, trims
  const outlineOf = (name: string) =>
    seamOutline(pieces.find((piece) => piece.name === name)?.edges ?? []);
  const backHalf = seamOutline(pieces[0].edges.slice(0, -1)); // drop the fold
  const pocketRect: Point[] = [
    [pocketLeft, pocketTop],
    [pocketRight, pocketTop],
    [pocketRight, pocketBottom],
    [pocketLeft, pocketBottom],
  ];
  const closureLines: SketchLine[] = overlap
    ? snaps.map((s): SketchLine => {
        const [x, y] = s.points[0];
        return { points: [[x - 0.7, y], [x + 0.7, y], [x, y], [x, y - 0.7], [x, y + 0.7]], kind: "detail" };
      })
    : [{ points: [[0, frontNeckY - p.collarHeight], [0, hemY]], kind: "detail" }];
  const views = {
    front: {
      lines: [
        ...bothSides(collarBand([[-ext, frontNeckY], ...front.neck], p.collarHeight)),
        ...bothSides({ points: outlineOf("front sleeve"), closed: true }),
        ...bothSides({ points: outlineOf("front"), closed: true }),
        ...bothSides({ points: pocketRect, closed: true }),
        ...closureLines,
      ] as SketchLine[],
      callouts: [
        { at: pointAt(front.raglan, length(front.raglan) / 2), text: "two-piece raglan sleeve" },
        { at: [front.neck[front.neck.length - 1][0], frontNeckY - p.collarHeight] as Point, text: "stand storm collar with throat tab" },
        { at: [0, (frontNeckY + pocketTop) / 2] as Point, text: overlap ? "snap or button closure on an overlap extension" : "separating zip closure" },
        { at: [(pocketLeft + pocketRight) / 2, pocketTop] as Point, text: "patch pocket" },
        { at: lerp(frontSleeve.hemTop, frontSleeve.hemBottom, 0.5), text: "plain sleeve hem, rib storm cuff on the sleeve lining inside" },
      ],
    },
    back: {
      lines: [
        ...bothSides(collarBand(back.neck, p.collarHeight)),
        ...bothSides({ points: outlineOf("back sleeve"), closed: true }),
        { points: [...backHalf, ...reverse(mirrorX(backHalf))], closed: true },
      ] as SketchLine[],
      callouts: [
        { at: [0, (backNeckY + hemY) / 2] as Point, text: "one-piece back, cut on the fold" },
        { at: pointAt(backSleeve.overarm, length(backSleeve.overarm) / 2), text: "overarm seam, neck to hem" },
      ],
    },
  };
  const measures: Measure[] = [
    { label: "chest / hem, finished", cm: finishedChest },
    { label: "centre back length, neck seam to hem", cm: hemY - backNeckY },
    { label: "sleeve length, high neck point to hem", cm: backOverarm },
    { label: "bicep", cm: backSleeve.bicep + frontSleeve.bicep },
    { label: "sleeve opening", cm: sleeveHem },
    { label: "collar height", cm: p.collarHeight },
    { label: "patch pocket width", cm: p.pocketWidth },
    { label: "patch pocket height", cm: p.pocketHeight },
  ];
  const trims: Trim[] = overlap
    ? [{ name: "snaps or buttons", count: p.snapCount + 1, description: "front closure plus throat tab" }]
    : [
        { name: "separating zip", count: 1, cm: hemY - frontNeckY + p.collarHeight },
        { name: "snap", count: 1, description: "throat tab" },
      ];

  return { pieces, checks, views, measures, trims };
};

const instructions = `Make a toile in cheap cotton first. Waxed cotton keeps every needle hole, so you can't unpick fit mistakes.

Waxed cotton: hold layers with clips, not pins. Use a 100/16 denim needle, polyester thread and a 3–3.5mm stitch. Finger-press or use a cool iron through a cloth, because heat melts the wax.

1. Cut. Follow the cut label on each piece. Transfer notches, snap marks and pocket placement.
2. Pockets. Turn the top hem allowance under twice and topstitch. Press the other edges under, then topstitch the pocket onto the front at its placement.
3. Raglan seams. Sew each front sleeve to a front (single notches) and each back sleeve to the back (double notches). Topstitch.
4. Overarm seams. Sew front sleeve to back sleeve from the neck to the hem.
5. Side and underarm. Sew each side in one seam, from the body hem through the underarm to the sleeve hem.
6. Throat tab. Sew the two layers together, leaving one short end open. Turn, topstitch, and baste it to the front end of one collar piece.
7. Outer collar. Sew it to the shell neckline, matching the notches at centre back, the raglan seams and the shoulders.
8. Lining. Sew each front facing to a front lining. Build the lining the same way as the shell (steps 3–5), but leave about 20cm of one side seam open for turning. Baste the back pleat closed at the neck.
9. Storm cuffs. Sew each rib strip into a loop, then fold it in half lengthwise. Stretch it to fit the lining sleeve hem and sew it on.
10. Under collar. Sew it to the lining and facing neckline.
11. Bag the lining. With right sides together, sew the collar's top edge and front ends, then each front edge down to the hem, then the lining hem to the shell hem allowance. Turn the jacket out through the side seam opening.
12. Sleeve hems. Turn the shell sleeve hem up and topstitch. The storm cuff hangs free inside. Tack the lining to the shell at the underarm seam allowances.
13. Finish. Topstitch the front edges and the collar. Close the lining opening. Set the snaps at the marks, plus one on the throat tab.

Zip closure: sew the zip in between the shell front and the facing before bagging (step 11).`;

const jacket26a: Garment = {
  name: "26A Jacket",
  slug: "26a-jacket",
  version: "0.1.0",
  params,
  requiredMeasurements,
  instructions,
  fabrics: {
    shell: { description: "heavyweight waxed cotton" },
    lining: { description: "wool suiting or coating" },
    "sleeve lining": { description: "slippery lining: cupro, bemberg or cotton sateen" },
    rib: { description: "rib knit, for the inner storm cuffs" },
  },
  draft,
};

export default jacket26a;
