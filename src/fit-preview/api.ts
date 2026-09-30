// Pure entry point for designers embedding the optional engine in another UI.
// It imports neither React nor Three.js and never writes to source patterns.
export type * from "./types";
export { defaultBodyOptions, defaultSolverOptions } from "./types";
export { createBody } from "./body";
export { auditAssembly, validateAssembly, seamLengths, topologyOf } from "./assembly";
export { createSimulation, meshPanel, type MeshingOptions } from "./mesh";
export { createJacketSimulation, previewAdapters, type PreviewAdapter } from "./adapter";
export { ClothSolver } from "./solver";
