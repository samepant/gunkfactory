import Renderer from "./components/renderer";
import Nav from "./components/nav";
import { useState } from "react";
import { Garment } from "./garments/garment";

function App() {
  const [garment, setGarment] = useState<Garment>();
  return (
    <>
      <Nav setGarment={setGarment} currentGarment={garment} />
      <Renderer solids={garment?.components || []} />
    </>
  );
}

export default App;
