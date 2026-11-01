import { spawn, spawnSync } from "node:child_process";
const port = Number(process.env.PHYSICS_PORT || 8787);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("PHYSICS_PORT must be between 1024 and 65535");
const options = {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
};
for (const script of ["build", "db:migrate"]) {
  const result = spawnSync("npm", ["run", script], options);
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  `\nOpen http://localhost:${port} on THIS computer. Press Ctrl+C to stop.\n`,
);
const child = spawn(
  "npm",
  [
    "exec",
    "--",
    "wrangler",
    "dev",
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    "--var",
    `APP_ORIGIN:http://localhost:${port}`,
  ],
  options,
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
