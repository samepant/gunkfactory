import { star } from "@jscad/modeling/src/primitives";
import { Garment } from "../garment";

const testPant = (): Garment => {
  return {
    name: "Test Pant",
    slug: "test-pant",
    components: [
      star({ vertices: 5, center: [0, 0], innerRadius: 10, outerRadius: 20 }),
    ],
    version: "0.0.1",
    params: [
      {
        name: "waist",
        slug: "waist",
        type: "number",
      },
      {
        name: "inseam",
        slug: "inseam",
        type: "number",
      },
      {
        name: "hip",
        slug: "hip",
        type: "number",
      },
      {
        name: "rise",
        slug: "rise",
        type: "number",
      },
      {
        name: "thigh",
        slug: "thigh",
        type: "number",
      },
      {
        name: "knee",
        slug: "knee",
        type: "number",
      },
      {
        name: "hem",
        slug: "hem",
        type: "number",
      },
    ],
    unit: "cm",
  };
};

export default testPant;
