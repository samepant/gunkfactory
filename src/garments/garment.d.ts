import type { Measurements } from "../measurements/measurement";
import type { DraftResult } from "../pattern/pattern";

export type GunkUnits = "cm" | "mm" | "in";

export type MeasurementsCm = Record<keyof Measurements, number>;

export type GarmentParams = Record<string, number | string>;

export interface Garment {
  name: string;
  slug: string;
  version: string;
  params: GarmentParamDescriptor[];
  requiredMeasurements: (keyof Measurements)[];
  instructions: string; // plain-text sewing guide, shown alongside the pattern
  // descriptions for the fabrics named in each piece's cut, for the tech pack
  fabrics?: Record<string, { description?: string; color?: string }>;
  draft: (measurements: MeasurementsCm, params: GarmentParams) => DraftResult;
}

export interface GarmentParamDescriptor {
  name: string;
  slug: string;
  // "length" params are stored in cm and shown in the sloper's unit
  type: "length" | "number" | "select";
  default: number | string;
  options?: string[];
}
