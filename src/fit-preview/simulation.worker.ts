import { ClothSolver } from "./solver";
import { defaultSolverOptions, type SimulationInput } from "./types";

let solver: ClothSolver | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;
let stopAt = 0;
const publish = () => {
  if (!solver) return;
  const frame = solver.frame();
  self.postMessage({ type: "frame", ...frame, running }, { transfer: [frame.positions.buffer, frame.strain.buffer, frame.extension.buffer, frame.compression.buffer] });
};
const tick = () => {
  if (!running || !solver) return;
  try {
    for (let i = 0; i < 3; i++) solver.step();
    if (solver.steps % 6 === 0) publish();
    // Bounded work, with a visible paused state; this is not a convergence claim.
    if (solver.steps >= stopAt) { running = false; publish(); }
    else timer = setTimeout(tick, 1);
  } catch (error) {
    running = false;
    self.postMessage({ type: "error", message: (error as Error).message });
  }
};
self.onmessage = (event: MessageEvent<{ type: "init"; input: SimulationInput } | { type: "run"; running: boolean }>) => {
  clearTimeout(timer);
  try {
    if (event.data.type === "init") {
      solver = new ClothSolver(event.data.input);
      running = false;
      publish();
    } else {
      running = event.data.running;
      if (running && solver) stopAt = solver.steps + Math.round(3 / (solver.input.solver?.timeStep ?? defaultSolverOptions.timeStep));
      publish();
      if (running) timer = setTimeout(tick, 1);
    }
  } catch (error) {
    running = false;
    self.postMessage({ type: "error", message: (error as Error).message });
  }
};
