import { Geom2, Geom3 } from "@jscad/modeling/src/geometries/types";

export type GunkUnits = "cm" | "mm" | "in";

export interface Garment {
  name: string;
  slug: string;
  components: Geom3[] | Geom2[];
  version: string;
  params: GarmentParamDescriptor[];
  unit: GunkUnits;
}

export interface GarmentParamDescriptor {
  name: string;
  slug: string;
  type: "number" | "string";
}
