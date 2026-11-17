import { spawn } from "node:child_process";

const mode = process.argv[2];
if (!["dev", "start"].includes(mode)) throw new Error("Expected dev or start");
const children = [
  spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", mode, ...process.argv.slice(3)],
    { stdio: "inherit", windowsHide: true },
  ),
  spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "scripts/reservation-worker.mts",
      ...(process.env.RESERVATIONS_DRY_RUN === "true" ? ["--dry-run"] : []),
    ],
    { stdio: "inherit", windowsHide: true },
  ),
];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) if (child.exitCode === null) child.kill();
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
