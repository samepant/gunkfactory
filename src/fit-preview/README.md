# Fit preview module

An optional browser experiment for viewing the 26A jacket shell on a sloper-derived mannequin. Open `#/fit/26a-jacket`, or **Fit preview** from the existing pattern page. Run the dev server with `npm run dev`.

The application lazy-loads this module. Nothing in `src/pattern`, `src/garments`, `src/measurements`, pattern drawing, packing, or projection is modified. The only application integration is a route and navigation link.

## Use

1. Select a sloper. The preview starts with the sloper selected on the pattern page and reads the existing production parameters on first opening, then keeps subsequent edits in its own React state.
2. Inspect the **Body** tab. Supplied, derived, and assumed dimensions are distinguished. Torso depth, shoulder slope, and arm pose are adjustable.
3. Press **Settle garment**. Pause, reset, orbit, inspect front/side/back, show panel boundaries, or inspect mesh strain.
4. Use **Assembly** to select a piece, change its initial position, select seam edges in 2D, reverse correspondence, and enable or disable seams. Existing sewn edges must be freed before assigning them to a new seam in the editor. The audit distinguishes intentional shell openings, unsewn required boundaries, and repeated assignments; selecting a seam shows its current gap.
5. Body contacts attach a selected point along edge A to a named body landmark. Orange dots show the resulting fixed fitting supports. They are distinct from free initial placement and may all be disabled with **Use fitting supports**.
6. Save/load the recipe on this device, or import/export JSON. Export also exposes copyable JSON for browsers that restrict downloads.

Changing body, garment, material, closure, assembly, or support settings resets the solve. Saving the assembly does not save body measurements, garment parameter edits, or a simulated mesh. Exported recipes contain only garment identity/topology, seams, placements, and supports. The standalone viewer makes no measurement uploads and requires no service accounts.

## Files and contracts

| File | Responsibility |
| --- | --- |
| `types.ts` | Serializable body, assembly, mesh, solver, and diagnostics contracts |
| `body.ts` | Measurement inference, ellipse perimeter fitting, visible/collision body geometry |
| `assembly.ts` | 26A shell adapter, recipe, initial arrangement, edge labels, schema validation |
| `adapter.ts` | Garment adapter registry, controls, and garment-specific closure attachments |
| `api.ts` | Pure engine entry point for other interfaces, without React or Three.js |
| `mesh.ts` | Constrained triangulation, rest-length links, directed boundary chains, stitching, body contacts |
| `solver.ts` | CPU reference solver with compliant distance constraints, seams, fitting pins, collision, and diagnostics |
| `simulation.worker.ts` | Worker lifecycle and bounded batches of simulation steps |
| `Viewer.tsx` | Three.js WebGL 2 scene, body/cloth drawing, camera, picking, and resource cleanup |
| `index.tsx` | Designer interface, sloper/parameter adapter, assembly storage and import/export |

All pattern/body lengths are centimeters. Gravity is 981 cm/s². The default fixed solver timestep is 1/480 s; the UI frame rate does not control it. Each step uses three constraint passes, with collision enforced on the final pass. Damping and the gravity ramp use elapsed simulated time. The worker pauses after three additional simulated seconds per run (1,440 default steps); reaching that budget is not a convergence claim. Motion is reported in cm/s so changing the timestep does not conceal motion.

The garment's seam allowances are excluded from the simulation. The rest metric comes from the drafted seam-line panel mesh. Mirrored instances retain separate stable IDs. Folded back and collar halves use continuity constraints. The outer collar connects to a directed chain of four neckline segments on each side. The overlap closes with sparse center-front attachments near x=0, not a seam joining the outer front edges.

## Assembly format

The current schema is version 1. `garment`, garment `version`, and `topology` must match the generated draft. Topology checks include source piece names, edge counts, and cutting instructions. A semantic reordering of edges with identical counts still requires the garment/recipe author to update its version.

Each seam has two arrays of edge references `{ panel, edge, reverse? }`. Array order defines a continuous chain; `reverse` on a reference flips that edge within the chain. `reverse` on the seam flips correspondence along its complete second chain. The editor currently selects whole edges; ranges within an edge and notch-specific easing are future additions.

A placement specifies an initial body region and translation in centimeters. A body contact is `{ id, point: { panel, edge }, at, landmark }`, with `at` between 0 and 1. The current coarse implementation snaps that fraction to a boundary vertex. Available landmarks are left/right shoulder, back neck, and left/right wrist. Contacts use zero inverse mass and are visible in the scene.

The same `ClothSolver` accepts arbitrary triangulated cloth links and stitching constraints. The generic mesher accepts arrangement and interior-attachment callbacks; it contains no jacket-specific placement or closure rules. To add another garment, implement a `PreviewAdapter` and register it by slug in `previewAdapters`. The route discovers that adapter. Body inference, meshing, worker, solver, and viewer can be reused. The sole existing garment has an adapter; there is no automatic reconstruction of a sewing recipe from arbitrary unnamed pattern edges.

The pure entry point can also be used without this React interface:

```ts
import { createBody, defaultBodyOptions, previewAdapters, ClothSolver } from "./fit-preview/api";

const adapter = previewAdapters[garment.slug];
const draft = garment.draft(measurementsCm, garmentParams);
const body = createBody(measurementsCm, defaultBodyOptions);
const panels = adapter.panels(draft);
const assembly = adapter.assembly(garment, draft);
const { input, meshes } = adapter.simulate(panels, assembly, body, "canvas", true);
const solver = new ClothSolver(input);
solver.step();
const frame = solver.frame(); // mesh positions, deformation, seam gaps, diagnostics
```

## Validation

```sh
npm run build
npm run test:fit
npm run benchmark:fit
npm run benchmark:fit -- '{"chestEase":10}'
npm run benchmark:fit -- '{"chestEase":40,"bicepEase":22}'
npm run benchmark:fit -- '{}' '{"solver":{"timeStep":0.004166666666666667,"iterations":10}}'
npm run research:fit
npm run research:fit -- --sensitivity
```

The tests cover measurement-ring circumference, invalid inputs, body projection, shoulder surface geometry, derived girths, seam auditing, recipe validation, concave mesh area and boundary preservation, frozen source geometry, seam-allowance independence, stable supported drape, deformation diagnostics, independent garment/body dimensions, disabled supports, and a hanging cloth swatch. The research script runs nine synthetic cases sequentially and writes detailed snapshots and a summary into `docs/fit-preview-results/`.

Research decisions and measured results are in `docs/fit-preview-research.md`; reproducible result files are in `docs/fit-preview-results/`.

## Current limits

- This is an approximate upper-body fitting mannequin, not a uniquely inferred human body or a full-body anatomical model. Head and stand are decorative; arms are straight tapered segments. Many surface and posture measurements are not fitted.
- Lining, facings, pockets, throat tab, inner collar layer, and rib cuffs are not simulated. The default closure is a sparse approximation, including when the source pattern was drafted for a zip.
- There is no cloth self-collision, continuous collision detection, or calibrated friction. Body collision samples vertices; triangles can still cross the body or another panel. Supports change the resulting fit and are not evidence that an unsupported garment would stay in place.
- Stretch links and opposite-vertex bending links are isotropic approximations. Mass is uniform per vertex. Presets do not encode actual fabric weight, anisotropy, wax treatment, or measured mechanical properties.
- Mesh strain is spring-length change, with separate extension/compression views. Collapsed faces have under 10% of their original flat area; this does not detect all triangle inversions or intersections. These values are not stress, skin pressure, ease, or comfort. Local deformation remains significant and depends on resolution; the UI reports unresolved cases.
- Static serving needs WebGL 2 and module workers. The Chromium-based in-app browser was exercised. Standalone Chrome and Safari still need a release validation pass on target machines.

Third-party notices for the pinned runtime libraries are included in `public/fit-preview-notices.txt`.
