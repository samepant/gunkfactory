// Import the triangulator directly: the package's legacy root assumes Node's
// `global` exists in the browser. No global shim is needed for this entry point.
declare module "poly2tri/src/sweepcontext.js" {
  import { SweepContext } from "poly2tri";
  export default SweepContext;
}
