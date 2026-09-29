import { useContext } from "react";
import { GarmentContext } from "../../main";
import PatternView from "../pattern-view";

const GunkCad = () => {
  const { garment } = useContext(GarmentContext);

  if (garment) {
    return <PatternView key={garment.slug} garment={garment} />;
  }

  return null;
};

export default GunkCad;
