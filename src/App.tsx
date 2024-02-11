import Renderer from "./components/renderer";
import { cube, cuboid, star } from "@jscad/modeling/src/primitives";
import Nav from "./components/nav";
import { useState } from "react";
import { Geom2, Geom3 } from "@jscad/modeling/src/geometries/types";

function App() {
  const [solids, setSolids] = useState<Geom3[] | Geom2[]>([]);
  return (
    <>
      <Nav />
      <Renderer solids={solids} />
      <button
        onClick={() => setSolids([cube({ center: [0, 0, 0], size: 12 })])}
      >
        Cube
      </button>
      <button
        onClick={() =>
          setSolids([
            cuboid({
              size: [100 * 1, 100, 210 + 200 * 1],
            }),
          ])
        }
      >
        Cube 2
      </button>
      <button
        onClick={() =>
          setSolids([star({ vertices: 8, innerRadius: 300, outerRadius: 400 })])
        }
      >
        Star
      </button>
    </>
  );
}

export default App;
