import Renderer from "./components/renderer";
import Nav from "./components/nav";
import { useState } from "react";
import { Garment } from "./garments/garment";
import Sloper from "./components/sloper";
import { FullSloper } from "./measurements/measurement";

function App() {
  const [garment, setGarment] = useState<Garment | null>(null);
  const [sloper, setSloper] = useState<FullSloper | null>(null);
  return (
    <>
      <Nav setGarment={setGarment} currentGarment={garment} />
      <Renderer solids={garment?.components || []} />
      <Sloper sloper={sloper} setSloper={setSloper} />
    </>
  );
}

export default App;
