import { useContext } from "react";
import { GarmentContext } from "../../main";
import Renderer from "../renderer";

const GunkCad = () => {
  const { garment } = useContext(GarmentContext);

  if (garment) {
    return <Renderer solids={garment.components} />;
  }

  return <div>Loading garment . . .</div>;
};

export default GunkCad;
