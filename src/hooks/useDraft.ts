import { useCallback, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";
import { Garment, GarmentParams, MeasurementsCm } from "../garments/garment";
import { fileSlopers, measurementsInCm, toSloperFile } from "../measurements";
import { useSloperStorage } from "./useSloperStorage";
import { Piece } from "../pattern/pattern";
import { cutList, pack } from "../pattern/production.ts";
import { placePiece } from "../components/piece-drawing/place.ts";
import type { FabricLayout } from "../components/projector";
import { formatCamelCaseWithSpaces } from "../util/formatting";

// the chosen sloper, saved params and resulting draft for a garment. kept in
// local storage so every view of a garment shows the same draft.
export const useDraft = (garment: Garment) => {
  const { storedSlopers } = useSloperStorage();
  const slopers = useMemo(
    () => [...fileSlopers, ...storedSlopers.map(toSloperFile)],
    [storedSlopers]
  );
  const [sloperName, setSloperName] = useLocalStorage("pattern-sloper", "");
  const sloper = slopers.find((s) => s.name === sloperName) ?? slopers[0];
  const unit = sloper?.unit ?? "cm";

  const [savedParams, setSavedParams] = useLocalStorage<GarmentParams>(
    `params-${garment.slug}`,
    {}
  );
  const params = useMemo(
    () => ({
      ...Object.fromEntries(garment.params.map((p) => [p.slug, p.default])),
      ...savedParams,
    }),
    [garment, savedParams]
  );

  const result = useMemo(() => {
    if (!sloper) {
      return { error: "no sloper yet. add a json file to /slopers or make one in the sloper form." };
    }
    const measurements = measurementsInCm(sloper);
    const missing = garment.requiredMeasurements.filter((k) => !measurements[k]);
    if (missing.length > 0) {
      return {
        error: `${sloper.name} is missing: ${missing.map(formatCamelCaseWithSpaces).join(", ")}`,
      };
    }
    try {
      const draft = garment.draft(measurements as MeasurementsCm, params);
      return { draft, fabrics: [...new Set(draft.pieces.map((p) => p.cut.fabric))] };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [sloper, garment, params]);

  return { slopers, sloper, setSloperName, unit, params, savedParams, setSavedParams, result };
};

// usable widths (between selvedges) until the user sets their own
const DEFAULT_FABRIC_WIDTHS: Record<string, number> = {
  shell: 150,
  lining: 150,
  "sleeve lining": 140,
  rib: 50,
  pocketing: 112,
};

export const useFabricSettings = () => {
  const [fabricWidths, setFabricWidths] = useLocalStorage<Record<string, number>>("fabric-widths", {});
  const [allowRotate, setAllowRotate] = useLocalStorage("fabric-allow-rotate", true);
  const fabricWidth = useCallback(
    (fabric: string) => fabricWidths[fabric] ?? DEFAULT_FABRIC_WIDTHS[fabric] ?? 150,
    [fabricWidths]
  );
  return { fabricWidths, setFabricWidths, allowRotate, setAllowRotate, fabricWidth };
};

// every copy to cut, nested per fabric
export const packFabrics = (
  pieces: Piece[],
  fabrics: string[],
  fabricWidth: (fabric: string) => number,
  allowRotate: boolean
): { layouts?: FabricLayout[]; error?: string } => {
  const copies = cutList(pieces);
  try {
    const layouts = fabrics.map((fabric) => {
      const width = fabricWidth(fabric);
      const packed = pack(
        copies.filter((c) => c.cut.fabric === fabric),
        { width, gap: 0.5, allowRotate }
      );
      return { fabric, width, length: packed.length, placed: packed.pieces.map((p) => placePiece(p)) };
    });
    return { layouts };
  } catch (e) {
    return { error: (e as Error).message };
  }
};
