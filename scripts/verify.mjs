import { spawn } from "node:child_process";
import { once } from "node:events";

const port = Number(process.env.TEST_PORT ?? 3001);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid TEST_PORT");
const base = `http://localhost:${port}`;
const env = {
  ...process.env,
  NEXT_DIST_DIR: ".next-verify",
  AUTH_URL: base,
  AUTH_TRUST_HOST: "true",
  TEST_BASE_URL: base,
};
const next = "node_modules/next/dist/bin/next";
async function run(args) {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    env,
    windowsHide: true,
  });
  const [code] = await once(child, "exit");
  if (code !== 0)
    throw new Error(`Verification command exited with code ${code}`);
}
let server;
try {
  // Never reuse or stop an unrelated process already bound to the test port.
  let occupied = false;
  try {
    await fetch(base, { signal: AbortSignal.timeout(1000) });
    occupied = true;
  } catch {}
  if (occupied)
    throw new Error(
      `Port ${port} is occupied. Set TEST_PORT to another local port.`,
    );
  await run([next, "build"]);
  server = spawn(process.execPath, [next, "start", "--port", String(port)], {
    stdio: "inherit",
    env,
    windowsHide: true,
  });
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null)
      throw new Error("Verification server stopped unexpectedly");
    try {
      const result = await fetch(base, { signal: AbortSignal.timeout(1000) });
      if (result.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error("Verification server did not start");
  await run(["--import", "tsx", "scripts/integration-test.mts"]);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
}
