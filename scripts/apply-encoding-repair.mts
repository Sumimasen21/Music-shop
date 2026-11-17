import "dotenv/config";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

if (!process.argv.includes("--apply")) {
  console.log(
    "Run with --apply to repair damaged catalog text in DATABASE_URL. Review repair-catalog-encoding.sql first.",
  );
  process.exit(0);
}
const sql = await readFile(
  new URL("./repair-catalog-encoding.sql", import.meta.url),
  "utf8",
);
const statements = sql
  .split(/\r?\n/)
  .filter((line) => line.startsWith("UPDATE public."));
if (
  statements.length !== 25 ||
  statements.some(
    (line) =>
      !line.includes(" WHERE slug = ") || !line.includes(" LIKE '%???%'"),
  )
)
  throw new Error("Repair file changed; review the script before applying");
const prisma = new PrismaClient();
try {
  const fields = await prisma.$transaction(async (tx) => {
    let changed = 0;
    for (const statement of statements) {
      const rows = await tx.$queryRawUnsafe<unknown[]>(statement);
      changed += rows.length;
    }
    return changed;
  });
  console.log(`Repaired catalog fields: ${fields}`);
} finally {
  await prisma.$disconnect();
}
