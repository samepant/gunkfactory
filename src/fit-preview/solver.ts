import { projectOutside } from "./body";
import { defaultSolverOptions, type Metrics, type SimulationFrame, type SimulationInput, type Vec3 } from "./types";

// CPU reference solver, in centimeters and seconds. Unit inverse masses and
// heuristic compliance are intentional prototype assumptions, not fabric calibration.
export class ClothSolver {
  positions: Float32Array;
  previous: Float32Array;
  initial: Float32Array;
  steps = 0;
  stepMs = 0;
  motion = 0;
  pinned: Set<number>;
  constructor(public input: SimulationInput) {
    const count = input.positions.length / 3;
    const validId = (id: number) => Number.isInteger(id) && id >= 0 && id < count;
    const invalidPositions = !Number.isInteger(count) || count < 1 || !input.positions.every(Number.isFinite);
    const invalidLinks = input.links.some((l) => !validId(l.a) || !validId(l.b) || !Number.isFinite(l.rest) || l.rest <= 0);
    const invalidStitches = input.stitches.some((s) => !s.ids.length || s.ids.length !== s.weights.length || s.ids.some((id) => !validId(id)) || s.weights.some((w) => !Number.isFinite(w)));
    const invalidFaces = input.faces?.some((f) => f.ids.some((id) => !validId(id)) || !Number.isFinite(f.restArea) || f.restArea <= 0);
    if (invalidPositions || invalidLinks || invalidStitches || invalidFaces || input.pins.some((id) => !validId(id))) throw new Error("Invalid cloth mesh or constraint references.");
    const options = input.solver ?? defaultSolverOptions;
    if (!Number.isFinite(options.timeStep) || options.timeStep < 1 / 1000 || options.timeStep > 1 / 30 || !Number.isInteger(options.iterations) || options.iterations < 1 || options.iterations > 100) throw new Error("Unsupported solver settings.");
    this.positions = input.positions.slice();
    this.previous = input.positions.slice();
    this.initial = input.positions.slice();
    this.pinned = new Set(input.pins);
  }
  step() {
    const began = performance.now();
    const p = this.positions, options = this.input.solver ?? defaultSolverOptions, dt = options.timeStep;
    const gravity = Math.min(1, this.steps * dt / (80 / 120)) * 981;
    for (let i = 0; i < p.length; i++) {
      if (this.pinned.has(Math.floor(i / 3))) { p[i] = this.initial[i]; this.previous[i] = p[i]; continue; }
      const old = p[i];
      p[i] += (p[i] - this.previous[i]) * Math.pow(0.97, dt * 120) - (i % 3 === 1 ? gravity * dt * dt : 0);
      this.previous[i] = old;
    }
    const lambdas = new Float32Array(this.input.links.length);
    const seamLambdas = new Float32Array(this.input.stitches.length);
    const passes = options.iterations;
    for (let pass = 0; pass < passes; pass++) {
      this.input.links.forEach((link, index) => {
        const a = link.a * 3, b = link.b * 3;
        const dx = p[a] - p[b], dy = p[a + 1] - p[b + 1], dz = p[a + 2] - p[b + 2];
        const len = Math.hypot(dx, dy, dz);
        if (len < 1e-8) return;
        const compliance = link.bend ? (this.input.material === "canvas" ? 0.004 : 0.04) : (this.input.material === "canvas" ? 0.0000005 : 0.000005);
        const alpha = compliance / (dt * dt);
        const wa = this.pinned.has(link.a) ? 0 : 1, wb = this.pinned.has(link.b) ? 0 : 1;
        if (wa + wb === 0) return;
        const dl = (-(len - link.rest) - alpha * lambdas[index]) / (wa + wb + alpha);
        lambdas[index] += dl;
        const s = dl / len;
        p[a] += dx * s * wa; p[a + 1] += dy * s * wa; p[a + 2] += dz * s * wa;
        p[b] -= dx * s * wb; p[b + 1] -= dy * s * wb; p[b + 2] -= dz * s * wb;
      });
      this.input.stitches.forEach((stitch, index) => {
        const delta: Vec3 = [0, 0, 0];
        let denom = 0;
        stitch.ids.forEach((id, j) => {
          const w = stitch.weights[j]; denom += this.pinned.has(id) ? 0 : w * w;
          for (let k = 0; k < 3; k++) delta[k] += p[id * 3 + k] * w;
        });
        const len = Math.hypot(...delta);
        if (len < 1e-8 || denom < 1e-8) return;
        const alpha = 0.0000001 / (dt * dt);
        const dl = (-len - alpha * seamLambdas[index]) / (denom + alpha);
        seamLambdas[index] += dl;
        stitch.ids.forEach((id, j) => {
          if (this.pinned.has(id)) return;
          for (let k = 0; k < 3; k++) p[id * 3 + k] += delta[k] / len * stitch.weights[j] * dl;
        });
      });
      if (pass % 2 === 1 || pass === passes - 1) {
        for (let i = 0; i < p.length; i += 3) {
          if (this.pinned.has(i / 3)) continue;
          const point: Vec3 = [p[i], p[i + 1], p[i + 2]];
          projectOutside(this.input.body, point);
          p.set(point, i);
        }
      }
      for (const id of this.input.pins) for (let k = 0; k < 3; k++) p[id * 3 + k] = this.initial[id * 3 + k];
    }
    let motion = 0;
    for (let i = 0; i < p.length; i++) {
      if (!Number.isFinite(p[i]) || Math.abs(p[i]) > 1000) throw new Error("Simulation became unstable. Reset the preview and check seam directions or placement.");
      motion += (p[i] - this.previous[i]) ** 2;
    }
    this.motion = Math.sqrt(motion / (p.length / 3));
    this.steps++;
    this.stepMs = performance.now() - began;
  }
  frame(): SimulationFrame {
    const p = this.positions;
    const strain = new Float32Array(p.length / 3), counts = new Uint16Array(strain.length);
    const extension = new Float32Array(strain.length), compression = new Float32Array(strain.length);
    let meanStrain = 0, maxStrain = 0, maxStretch = 0, maxCompression = 0, collapsedFaces = 0, edgeCount = 0, seamGap = 0, penetration = 0;
    for (const link of this.input.links) {
      if (link.bend) continue;
      const a = link.a * 3, b = link.b * 3;
      const signed = Math.hypot(p[a] - p[b], p[a + 1] - p[b + 1], p[a + 2] - p[b + 2]) / link.rest - 1;
      const stretch = Math.abs(signed), positive = Math.max(0, signed), negative = Math.max(0, -signed);
      strain[link.a] += stretch; strain[link.b] += stretch;
      extension[link.a] += positive; extension[link.b] += positive;
      compression[link.a] += negative; compression[link.b] += negative;
      counts[link.a]++; counts[link.b]++;
      meanStrain += stretch; maxStrain = Math.max(maxStrain, stretch); edgeCount++;
      maxStretch = Math.max(maxStretch, positive); maxCompression = Math.max(maxCompression, negative);
    }
    for (let i = 0; i < strain.length; i++) {
      strain[i] /= counts[i] || 1;
      extension[i] /= counts[i] || 1; compression[i] /= counts[i] || 1;
      const point: Vec3 = [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
      penetration = Math.max(penetration, projectOutside(this.input.body, point, 0));
    }
    for (const face of this.input.faces ?? []) {
      const [a, b, c] = face.ids.map((id) => id * 3);
      const ab = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
      const ac = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
      const area = Math.hypot(ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]) / 2;
      if (area < face.restArea * 0.1) collapsedFaces++;
    }
    const seamGaps: Record<string, number> = {};
    for (const stitch of this.input.stitches) {
      const delta = [0, 0, 0];
      stitch.ids.forEach((id, j) => { for (let k = 0; k < 3; k++) delta[k] += p[id * 3 + k] * stitch.weights[j]; });
      seamGap = Math.max(seamGap, Math.hypot(...delta));
      seamGaps[stitch.seam] = Math.max(seamGaps[stitch.seam] ?? 0, Math.hypot(...delta));
    }
    const metrics: Metrics = { steps: this.steps, seamGap, meanStrain: meanStrain / Math.max(1, edgeCount), maxStrain, maxStretch, maxCompression, collapsedFaces, penetration, stepMs: this.stepMs, motion: this.motion, speed: this.motion / (this.input.solver?.timeStep ?? defaultSolverOptions.timeStep) };
    return { positions: p.slice(), strain, extension, compression, seamGaps, metrics };
  }
}
