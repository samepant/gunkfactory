import type { Garment } from "../garments/garment";
import type { DraftResult } from "../pattern/pattern";
import { edgeLabel, jacketAssembly, jacketPanels, placePoint } from "./assembly";
import { createSimulation } from "./mesh";
import type { Assembly, Body, Panel, PanelMesh, SimulationInput, Stitch } from "./types";

export interface PreviewAdapter {
  panels: (draft: DraftResult) => Panel[];
  assembly: (garment: Garment, draft: DraftResult) => Assembly;
  edgeLabel: (panel: Panel, edge: number) => string;
  simulate: typeof createJacketSimulation;
  controls: readonly (readonly [string, string, number, number])[];
  description: string;
}

function jacketClosure(meshes: PanelMesh[]): Stitch[] {
  const fronts = meshes.filter((m) => m.panel.source === "front");
  const stitches: Stitch[] = [];
  // Center-front attachment follows x=0 inside the overlap, not the cut edge.
  const minY = Math.max(...fronts.map((m) => Math.min(...m.points.map((p) => p[1])))) + 4;
  const maxY = Math.min(...fronts.map((m) => Math.max(...m.points.map((p) => p[1])))) - 5;
  for (let y = minY; y <= maxY; y += 8) {
    const ids = fronts.map((m) => {
      let best = 0, score = Infinity;
      m.points.forEach((p, i) => { const d = Math.hypot(p[0], p[1] - y); if (d < score) { score = d; best = i; } });
      return m.start + best;
    });
    stitches.push({ ids, weights: [1, -1], seam: "closure" });
  }
  return stitches;
}

export function createJacketSimulation(panels: Panel[], assembly: Assembly, body: Body, material: SimulationInput["material"], closed: boolean, supports = true, spacing = 2.8) {
  return createSimulation(panels, assembly, body, { material, supports, spacing, arrange: placePoint, attachments: closed ? jacketClosure : undefined });
}

export const previewAdapters: Record<string, PreviewAdapter> = {
  "26a-jacket": {
    panels: jacketPanels, assembly: jacketAssembly, edgeLabel, simulate: createJacketSimulation,
    controls: [["chestEase", "Chest ease", 5, 45], ["lengthBelowWaist", "Length below waist", 0, 30], ["sleeveLengthEase", "Sleeve length ease", -4, 12], ["bicepEase", "Bicep ease", 4, 24]],
    description: "Includes body panels, raglan sleeves, and outer collar. Lining, facings, pockets, throat tab, and rib cuffs are omitted.",
  },
};
