import { useContext } from "react";
import { GarmentContext } from "../../main";
import Renderer from "../renderer";

const GunkCad = () => {
  const { garment } = useContext(GarmentContext);

  if (garment) {
    return <Renderer solids={garment.components} />;
  }

  return null;
};

export default GunkCad;
