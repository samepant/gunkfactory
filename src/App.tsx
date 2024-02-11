import Renderer from "./components/renderer";
import { cube } from "@jscad/modeling/src/primitives";
import Nav from "./components/nav";

function App() {
  const solids = [cube({ center: [0, 0, 0], size: 12 })];
  return (
    <>
      <Nav />
      <Renderer solids={solids} />
    </>
  );
}

export default App;
