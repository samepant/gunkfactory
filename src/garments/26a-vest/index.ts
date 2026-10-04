import type {
  Garment,
  GarmentParamDescriptor,
  GarmentParams,
  MeasurementsCm,
} from "../garment";
import type { Check, Edge, Mark, Measure, Piece, SketchLine, Trim } from "../../pattern/pattern";
import { mapPiece } from "../../pattern/production.ts";
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
  length,
  lerp,
  norm,
  perp,
  type Point,
  pointAt,
  reverse,
  roundCorner,
  scale,
  splitAt,
  sub,
} from "../../pattern/geometry.ts";

// boxy canvas work vest: low mock neck, exposed separating zip, carhartt
// style hand-warmer pockets caught in the side seam and hem with a bound
// side opening, and a fleece or wool coating lining bagged to the shell.

const params: GarmentParamDescriptor[] = [
  { name: "chest ease", slug: "chestEase", type: "length", default: 20 },
  { name: "neck ease (per quarter)", slug: "neckEase", type: "length", default: 1.5 },
  { name: "armhole drop", slug: "armholeDrop", type: "length", default: 5 },
  { name: "across ease", slug: "acrossEase", type: "length", default: 0.5 },
  { name: "shoulder narrowing", slug: "shoulderNarrowing", type: "length", default: 2 },
  { name: "shoulder tip raise", slug: "shoulderTipRaise", type: "length", default: 0 },
  { name: "length below waist", slug: "lengthBelowWaist", type: "length", default: 15 },
  { name: "front hem rounding", slug: "frontHemRound", type: "length", default: 4 },
  { name: "zip teeth width", slug: "zipTeethWidth", type: "length", default: 0.8 },
  { name: "collar height", slug: "collarHeight", type: "length", default: 4 },
  { name: "collar front rise", slug: "collarRise", type: "length", default: 0.5 },
  { name: "pocket height", slug: "pocketHeight", type: "length", default: 22 },
  { name: "pocket inset from CF", slug: "pocketInset", type: "length", default: 5 },
  { name: "pocket corner radius", slug: "pocketCornerRadius", type: "length", default: 4 },
  { name: "pocket opening width", slug: "pocketOpeningWidth", type: "length", default: 8 },
  { name: "pocket opening depth", slug: "pocketOpeningDepth", type: "length", default: 14 },
  { name: "pocket opening bulge (-1 scoop … 1 round)", slug: "pocketOpeningBulge", type: "number", default: 0.5 },
  { name: "binding finished width", slug: "bindingWidth", type: "length", default: 1 },
  { name: "chest pocket", slug: "chestPocket", type: "select", default: "left", options: ["left", "right", "none"] },
  { name: "chest zip length", slug: "chestZipLength", type: "length", default: 16 },
  { name: "chest zip from CF", slug: "chestZipFromCF", type: "length", default: 9.5 },
  { name: "chest zip top below CF neck", slug: "chestZipTop", type: "length", default: 6 },
  { name: "chest zip window width", slug: "chestZipWindow", type: "length", default: 1 },
  { name: "chest bag width", slug: "chestBagWidth", type: "length", default: 13 },
  { name: "chest bag above zip", slug: "chestBagAbove", type: "length", default: 3 },
  { name: "chest bag below zip", slug: "chestBagBelow", type: "length", default: 6 },
  { name: "chest bag corner radius", slug: "chestBagRadius", type: "length", default: 3 },
  { name: "seam allowance", slug: "seamAllowance", type: "length", default: 1 },
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
];

const roundedRect = (x0: number, y0: number, x1: number, y1: number, r: number): Point[] => [
  ...roundCorner([x0, y0 + r], [x0, y0], [x0 + r, y0]),
  ...roundCorner([x1 - r, y0], [x1, y0], [x1, y0 + r]),
  ...roundCorner([x1, y1 - r], [x1, y1], [x1 - r, y1]),
  ...roundCorner([x0 + r, y1], [x0, y1], [x0, y1 - r]),
  [x0, y0 + r],
];

// vest armhole: from the (narrowed) shoulder tip, square off the shoulder,
// down through the across point into the block's lower armhole
const vestArmhole = (torso: TorsoHalf, tip: Point) => {
  const down = perp(norm(sub(tip, torso.hnp)));
  const k = 0.4 * (torso.across[1] - tip[1]);
  const upper = cubic(tip, add(tip, scale(down, k)), add(torso.across, [0, -k]), torso.across);
  return { points: [...upper, ...torso.lowerArmhole.slice(1)], acrossAt: length(upper) };
};

const draft = (m: MeasurementsCm, params: GarmentParams) => {
  const p = params as Record<string, number>;
  const sa = p.seamAllowance;
  const hemY = p.lengthBelowWaist;
  const zipEdge = p.zipTeethWidth / 2; // fronts stop short of CF so the teeth show

  const neckWidth = neckWidthFor(m, p.neckEase);
  const torso = (half: Half) =>
    draftTorsoHalf(half, m, {
      neckEase: p.neckEase,
      shoulderTipRaise: p.shoulderTipRaise,
      armholeDrop: p.armholeDrop,
      chestEase: p.chestEase,
      acrossEase: p.acrossEase,
    }, neckWidth);
  const back = torso("back");
  const front = torso("front");

  const narrowedTip = (t: TorsoHalf) => {
    const shoulder = dist(t.hnp, t.shoulderTip) - p.shoulderNarrowing;
    return add(t.hnp, scale(norm(sub(t.shoulderTip, t.hnp)), shoulder));
  };
  const backTip = narrowedTip(back);
  const frontTip = narrowedTip(front);
  const backArmhole = vestArmhole(back, backTip);
  const frontArmhole = vestArmhole(front, frontTip);

  const pieces: Piece[] = [];
  const grain = (x: number, top: number): [Point, Point] => [
    [x, top + 6],
    [x, hemY - 6],
  ];

  // --- back, on the fold
  const backNeckY = back.neck[0][1];
  const backEdges: Edge[] = [
    { points: back.neck, sa },
    { points: [back.hnp, backTip], sa },
    { points: backArmhole.points, sa },
    { points: [back.underarm, [back.underarm[0], hemY]], sa },
    { points: [[back.underarm[0], hemY], [0, hemY]], sa },
    { points: [[0, hemY], [0, backNeckY]], sa: 0, fold: true },
  ];
  const backNotches = [
    pointAt(backArmhole.points, backArmhole.acrossAt - 0.5),
    pointAt(backArmhole.points, backArmhole.acrossAt + 0.5),
  ];

  // --- front: neck trimmed back to the zip edge, hem rounded up into it
  const frontNeckY = front.neck[0][1];
  const frontNeck = splitAt(front.neck, zipEdge)[1];
  const round = Math.max(0, p.frontHemRound);
  const roundTop: Point = [zipEdge, hemY - round];
  const hemCorner = roundCorner(roundTop, [zipEdge, hemY], [zipEdge + round, hemY]);
  const side = front.underarm[0];
  const frontEdges: Edge[] = [
    { points: frontNeck, sa },
    { points: [front.hnp, frontTip], sa },
    { points: frontArmhole.points, sa },
    { points: [front.underarm, [side, hemY]], sa },
    { points: [[side, hemY], ...reverse(hemCorner)], sa },
    { points: [roundTop, frontNeck[0]], sa },
  ];
  const frontNotches = [pointAt(frontArmhole.points, frontArmhole.acrossAt)];

  // --- hand-warmer pocket, drafted in front coordinates
  const top = hemY - p.pocketHeight;
  const inset = p.pocketInset;
  const r = p.pocketCornerRadius;
  const openStart: Point = [side - p.pocketOpeningWidth, top];
  const openEnd: Point = [side, top + p.pocketOpeningDepth];
  if (openStart[0] <= inset + r) {
    throw new Error("the pocket opening is wider than the pocket top. reduce its width or the corner radius.");
  }
  if (openEnd[1] >= hemY - sa) {
    throw new Error("the pocket opening runs past the hem. reduce its depth or raise the pocket.");
  }
  if (top <= front.underarm[1]) {
    throw new Error("the pocket reaches into the armhole. reduce the pocket height.");
  }
  // bulge > 0 rounds the opening out towards the cut-away corner, < 0 scoops it in
  const bulge = Math.max(-1, Math.min(1, p.pocketOpeningBulge));
  const pull: Point = bulge >= 0 ? [side, top] : [openStart[0], openEnd[1]];
  const k = 0.55 * Math.abs(bulge);
  const opening = cubic(openStart, lerp(openStart, pull, k), lerp(openEnd, pull, k), openEnd);
  const pocketEdges: Edge[] = [
    { points: [[inset + r, top], openStart], sa }, // turned under, topstitched
    { points: opening, sa: 0 }, // bound
    { points: [openEnd, [side, hemY]], sa }, // caught in the side seam
    { points: [[side, hemY], [inset + r, hemY]], sa }, // caught in the hem
    {
      points: [
        ...roundCorner([inset + r, hemY], [inset, hemY], [inset, hemY - r]),
        ...roundCorner([inset, top + r], [inset, top], [inset + r, top]),
      ],
      sa,
    },
  ];
  const pocketOutline = pocketEdges.flatMap((e) => e.points);

  // --- vertical zip chest pocket. the zip sits in a faced window cut in the
  // shell; the bag is the space between shell and lining, closed by a
  // rounded rectangle topstitched through both after the lining is bagged.
  const chestMarks: Mark[] = [];
  const chestPieces: Piece[] = [];
  const chestSketch: SketchLine[] = [];
  const zipX = p.chestZipFromCF;
  const zipTop = frontNeckY + p.chestZipTop;
  const zipBottom = zipTop + p.chestZipLength;
  const win = p.chestZipWindow / 2;
  if (params.chestPocket !== "none") {
    const bag = {
      x0: zipX - p.chestBagWidth / 2,
      x1: zipX + p.chestBagWidth / 2,
      y0: zipTop - p.chestBagAbove,
      y1: zipBottom + p.chestBagBelow,
    };
    const clearance = sa + 1;
    if (bag.x0 < zipEdge + clearance) {
      throw new Error("the chest pocket bag runs into the front zip. move the chest zip out from CF or narrow the bag.");
    }
    if (bag.x1 > front.across[0] - clearance) {
      throw new Error("the chest pocket bag runs into the armhole. move the chest zip toward CF or narrow the bag.");
    }
    if (bag.y0 < frontNeckY + clearance) {
      throw new Error("the chest pocket bag runs into the neckline. lower the chest zip or shorten the space above it.");
    }
    if (bag.y1 > top - 1) {
      throw new Error("the chest pocket bag overlaps the hand-warmer pocket. shorten the chest zip or the space below it.");
    }
    // window stitching, then the slash with snips into each corner
    const window = (x: number, y: number): Mark[] => [
      { kind: "dash", points: [[x - win, y], [x + win, y], [x + win, y + p.chestZipLength], [x - win, y + p.chestZipLength], [x - win, y]] },
      {
        kind: "line",
        points: [[x - win, y], [x, y + win], [x + win, y]],
      },
      { kind: "line", points: [[x, y + win], [x, y + p.chestZipLength - win]] },
      {
        kind: "line",
        points: [[x - win, y + p.chestZipLength], [x, y + p.chestZipLength - win], [x + win, y + p.chestZipLength]],
      },
    ];
    const bagLine = roundedRect(bag.x0, bag.y0, bag.x1, bag.y1, p.chestBagRadius);
    chestMarks.push(...window(zipX, zipTop), { kind: "dash", points: bagLine });
    chestSketch.push(
      {
        points: [[zipX - win, zipTop], [zipX + win, zipTop], [zipX + win, zipBottom], [zipX - win, zipBottom]],
        closed: true,
        kind: "detail",
      },
      { points: bagLine, kind: "stitch" }
    );
    const facingW = 2 * win + 8;
    chestPieces.push({
      name: "chest zip facing",
      // a light, tightly woven cotton keeps the window edges flat
      cut: { fabric: "pocketing", count: 1 },
      edges: rect(facingW, p.chestZipLength + 4, 0),
      grain: [
        [1.5, 2],
        [1.5, p.chestZipLength + 2],
      ],
      notches: [],
      marks: window(facingW / 2, 2),
    });
  }

  // the front as drafted, right side up, is the wearer's left
  const frontPiece = (name: string, withChest: boolean): Piece => ({
    name,
    cut: { fabric: "shell", count: 1 },
    edges: frontEdges,
    grain: grain(side / 2, frontNeckY),
    notches: frontNotches,
    marks: [
      { kind: "dash", points: [...pocketOutline, pocketOutline[0]] },
      ...(withChest ? chestMarks : []),
    ],
  });
  const frontLeft = frontPiece("front left", params.chestPocket === "left");
  const frontRight = mapPiece(
    frontPiece("front right", params.chestPocket === "right"),
    ([x, y]) => [-x, y]
  );

  pieces.push(
    {
      name: "back",
      cut: { fabric: "shell", count: 1, fold: true },
      edges: backEdges,
      grain: grain(back.underarm[0] / 2, backNeckY),
      notches: backNotches,
      marks: [],
    },
    frontLeft,
    frontRight,
    ...chestPieces,
    {
      name: "pocket",
      cut: { fabric: "shell", count: 2, mirror: true },
      edges: pocketEdges,
      grain: [
        [inset + (side - inset) / 2, top + 3],
        [inset + (side - inset) / 2, hemY - 3],
      ],
      notches: [],
      marks: [],
    }
  );

  // --- pocket opening binding, cut on the bias
  const bindingLength = length(opening) + 4;
  const bindingCut = p.bindingWidth * 4;
  pieces.push({
    name: "pocket binding",
    cut: { fabric: "shell", count: 2 },
    edges: rect(bindingLength, bindingCut, 0),
    grain: [
      [1, 0.5],
      [bindingCut, bindingCut - 0.5],
    ],
    notches: [],
    marks: [],
  });

  // --- mock neck collar, outer and inner
  const backNeckLength = length(back.neck);
  const collarLength = backNeckLength + length(frontNeck);
  const collar = standCollar(collarLength, p.collarHeight, p.collarRise, sa);
  for (const [name, fabric] of [["collar", "shell"], ["collar lining", "lining"]]) {
    pieces.push({
      name,
      cut: { fabric, count: 1, fold: true },
      edges: collar.edges,
      grain: collar.grain,
      notches: [pointAt(collar.bottom, backNeckLength)],
      marks: [],
    });
  }

  // --- lining, same shape as the shell
  pieces.push(
    {
      name: "back lining",
      cut: { fabric: "lining", count: 1, fold: true },
      edges: backEdges,
      grain: grain(back.underarm[0] / 2, backNeckY),
      notches: backNotches,
      marks: [],
    },
    {
      name: "front lining",
      cut: { fabric: "lining", count: 2, mirror: true },
      edges: frontEdges,
      grain: grain(side / 2, frontNeckY),
      notches: frontNotches,
      marks: [],
    }
  );

  // --- checks
  const finishedChest = 2 * (back.underarm[0] + front.underarm[0]);
  const zipLength = hemY - round - frontNeckY + p.collarHeight;
  const checks: Check[] = [
    { label: "finished chest / hem", cm: finishedChest },
    {
      label: "ease over abdomen",
      cm: finishedChest - m.abdomenGirth,
      warn: finishedChest < m.abdomenGirth + 8,
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
    { label: "shoulder seam", cm: dist(back.hnp, backTip) },
    { label: "armhole (each)", cm: length(backArmhole.points) + length(frontArmhole.points) },
    { label: "separating zip, collar top to hem curve", cm: zipLength },
    { label: "pocket opening (binding)", cm: length(opening) },
    ...(params.chestPocket !== "none"
      ? [{ label: "chest zip, non-separating", cm: p.chestZipLength }]
      : []),
    { label: "collar length (half)", cm: collarLength },
  ];

  // --- tech pack: flat drawings, points of measure, trims
  const hasChest = params.chestPocket !== "none";
  const onChestSide = (pt: Point): Point =>
    params.chestPocket === "right" ? [-pt[0], pt[1]] : pt;
  const backHalf = seamOutline(backEdges.slice(0, -1));
  const views = {
    front: {
      lines: [
        ...bothSides(collarBand(frontNeck, p.collarHeight)),
        ...bothSides({ points: seamOutline(frontEdges), closed: true }),
        ...bothSides({ points: pocketOutline, closed: true }),
        ...bothSides({ points: opening, kind: "detail" }),
        ...chestSketch.map((l) => ({ ...l, points: l.points.map(onChestSide) })),
        { points: [[0, frontNeckY - p.collarHeight], [0, hemY - round]], kind: "detail" },
      ] as SketchLine[],
      callouts: [
        { at: [0, (frontNeckY + top) / 2] as Point, text: "exposed separating zip, collar top to hem curve" },
        { at: [neckWidth / 2, frontNeckY - p.collarHeight / 2] as Point, text: "low mock neck stand collar, lined" },
        { at: pointAt(opening, length(opening) / 2), text: "hand-warmer pocket: bias-bound side opening, caught in side seam and hem" },
        ...(hasChest
          ? [{ at: onChestSide([zipX, zipTop + p.chestZipLength / 2]), text: "vertical zip chest pocket in a faced window, bag topstitched through shell and lining" }]
          : []),
        { at: [zipEdge + round / 2, hemY - round / 2] as Point, text: "front hem rounds up into the zip" },
      ],
    },
    back: {
      lines: [
        ...bothSides(collarBand(back.neck, p.collarHeight)),
        { points: [...backHalf, ...reverse(mirrorX(backHalf))], closed: true },
      ] as SketchLine[],
      callouts: [
        { at: [0, (backNeckY + hemY) / 2] as Point, text: "one-piece back, cut on the fold" },
        { at: back.across, text: "armholes bagged to the lining and topstitched" },
      ],
    },
  };
  const measures: Measure[] = [
    { label: "chest / hem, finished", cm: finishedChest },
    { label: "centre back length, neck seam to hem", cm: hemY - backNeckY },
    { label: "front length, high neck point to hem", cm: hemY - front.hnp[1] },
    { label: "shoulder seam", cm: dist(back.hnp, backTip) },
    { label: "armhole, each", cm: length(backArmhole.points) + length(frontArmhole.points) },
    { label: "collar height", cm: p.collarHeight },
    { label: "hand-warmer pocket height", cm: p.pocketHeight },
    ...(hasChest ? [{ label: "chest pocket opening", cm: p.chestZipLength }] : []),
  ];
  const trims: Trim[] = [
    { name: "separating zip", count: 1, cm: zipLength, description: "teeth exposed between the front edges" },
    ...(hasChest ? [{ name: "chest pocket zip, non-separating", count: 1, cm: p.chestZipLength }] : []),
  ];

  return { pieces, checks, views, measures, trims };
};

const instructions = `Canvas shell, fleece or wool coating lining, and a separating zip with its teeth on show. Grade the seam allowances wherever the canvas and lining are sewn together, and clip the curves.

1. Cut. Follow the cut label on each piece. Transfer the notches and the pocket placement. Cut the binding on the bias. Thread-trace the chest pocket bag line onto the right side of its front, because chalk will rub off before step 14.
2. Pocket openings. Bind the curved opening of each pocket. Press the top and inner edges under along the seam line.
3. Pockets on. Place each pocket on its front at the dashed placement. Topstitch the top and inner edges. Baste the side and bottom inside the seam allowance, so they get caught in the side seam and hem.
4. Chest zip window (shell only). Lay the facing on the front's right side over the window mark, right sides together. Stitch the window rectangle. Cut along the slash, snip into each corner, turn the facing through to the wrong side and press. Set the chest zip behind the window and edgestitch around it.
5. Shoulders. Sew the shell fronts to the shell back at the shoulders. Do the same for the lining.
6. Collars. Sew the outer collar to the shell neckline and the collar lining to the lining neckline, matching the centre back fold and the shoulder notches.
7. Zip. Baste each zip half to a shell front edge, right sides together, teeth pointing in. Set the teeth just past the seam line so they sit outside the finished edge. Run the zip from the top of the collar down to where the hem starts to round.
8. Front and collar edges. Put the lining on the shell, right sides together. Sew from the hem curve up the front, over the collar top and back down the other front, catching the zip.
9. Armholes. Sew shell to lining around each armhole, right sides together.
10. Hem. Sew shell to lining along the hem, stopping about 3cm short of each side seam.
11. Turn. Pull each front through its shoulder to the back, so the vest comes right side out.
12. Side seams. Match the armhole underarm points. Sew shell to shell and lining to lining in one continuous seam each side. Leave about 15cm open in one lining side seam.
13. Finish. Turn through the gap. Close the hem corners and the gap. Topstitch the front, collar, armholes and hem.
14. Chest pocket bag. Smooth the lining flat behind the chest pocket and pin through both layers. Topstitch the rounded rectangle through canvas and lining. That line closes off the pocket bag.`;

const vest26a: Garment = {
  name: "26A Vest",
  slug: "26a-vest",
  version: "0.1.0",
  params,
  requiredMeasurements,
  instructions,
  fabrics: {
    shell: { description: "canvas / cotton duck" },
    lining: { description: "fleece or wool coating" },
    pocketing: { description: "light, tightly woven cotton (poplin or shirting)" },
  },
  draft,
};

export default vest26a;
