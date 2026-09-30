import { build } from "esbuild";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// Synthetic variations of the public example sloper; no personal measurements.
const cases = [
  ["default-current", {}, {}],
  ["closer-chest-current", { chestEase: 10 }, {}],
  ["relaxed-current", { chestEase: 40, bicepEase: 22 }, {}],
  ["smaller-body", {}, { measurementScale: 0.85 }],
  ["larger-body", {}, { measurementScale: 1.2 }],
  ["raised-arms", {}, { body: { armAngle: 60, shoulderSlope: 30, depth: 0.85 } }],
  ["soft-open", {}, { material: "soft", closed: false }],
  ["unsupported", {}, { supports: false }],
  ["finer-mesh", {}, { spacing: 2 }],
];
const sensitivity = [
  ["solver-120-10", {}, { solver: { timeStep: 1 / 120, iterations: 10 } }],
  ["solver-240-10", {}, { solver: { timeStep: 1 / 240, iterations: 10 } }],
  ["solver-240-20", {}, { solver: { timeStep: 1 / 240, iterations: 20 } }],
  ["solver-360-5", {}, { solver: { timeStep: 1 / 360, iterations: 5 } }],
  ["solver-480-3", {}, { solver: { timeStep: 1 / 480, iterations: 3 } }],
];
const sweep = process.argv.includes("--sensitivity");
const directory = await mkdtemp(join(tmpdir(), "gunk-fit-research-"));
const destination = "docs/fit-preview-results";
try {
  const outfile = join(directory, "benchmark.cjs");
  await build({ entryPoints: ["scripts/benchmark-fit.ts"], outfile, bundle: true, platform: "node", format: "cjs", logLevel: "warning" });
  await mkdir(destination, { recursive: true });
  const rows = [];
  for (const [name, params, settings] of sweep ? sensitivity : cases) {
    const run = spawnSync(process.execPath, [outfile, JSON.stringify(params), JSON.stringify(settings)], { encoding: "utf8", maxBuffer: 2_000_000 });
    if (run.status !== 0) throw new Error(`${name}: ${run.stderr || run.stdout}`);
    const result = JSON.parse(run.stdout);
    await writeFile(join(destination, `${name}.json`), JSON.stringify(result, null, 2) + "\n");
    const row = { name, settings: result.effectiveSettings, vertices: result.vertices, triangles: result.triangles, ms: result.ms, ...result.metrics };
    rows.push(row);
    console.log(JSON.stringify(row));
  }
  await writeFile(join(destination, sweep ? "solver-sensitivity.json" : "current-summary.json"), JSON.stringify(rows, null, 2) + "\n");
} finally { await rm(directory, { recursive: true, force: true }); }
