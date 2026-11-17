import { openSync, closeSync } from "node:fs";
import { spawnSync } from "node:child_process";

const target = process.argv[2];
if (!target || !/^backup[\w.-]*\.sql$/.test(target))
  throw new Error("Usage: node scripts/backup-db.mjs backup-new.sql");
// Direct bytes to disk: no PowerShell text pipeline or console recoding.
const output = openSync(target, "wx");
try {
  const result = spawnSync(
    "docker",
    [
      "exec",
      "music-store-db",
      "pg_dump",
      "-U",
      "admin",
      "-d",
      "music_store",
      "--encoding=UTF8",
    ],
    { stdio: ["ignore", output, "pipe"], windowsHide: true },
  );
  if (result.status !== 0)
    throw new Error(
      "Backup failed; output may be incomplete. Check Docker and PostgreSQL.",
    );
  console.log(`Created UTF-8 backup: ${target}`);
} finally {
  closeSync(output);
}
