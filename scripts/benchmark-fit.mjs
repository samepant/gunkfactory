import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const directory = await mkdtemp(join(tmpdir(), "gunk-fit-benchmark-"));
try {
  const outfile = join(directory, "benchmark.cjs");
  await build({ entryPoints: ["scripts/benchmark-fit.ts"], outfile, bundle: true, platform: "node", format: "cjs", logLevel: "warning" });
  const result = spawnSync(process.execPath, [outfile, ...process.argv.slice(2)], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally { await rm(directory, { recursive: true, force: true }); }
