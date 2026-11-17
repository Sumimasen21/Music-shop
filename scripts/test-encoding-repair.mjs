import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const repair = readFileSync("scripts/repair-catalog-encoding.sql", "utf8")
  .replace(/^BEGIN;|^COMMIT;/gm, "")
  .replaceAll("public.", "pg_temp.");
const setup = `BEGIN;
CREATE TEMP TABLE "Category" (slug text, name text);
CREATE TEMP TABLE "Brand" (slug text, name text);
CREATE TEMP TABLE "Product" (slug text, title text, description text, specs jsonb, stock int);
INSERT INTO pg_temp."Category" VALUES ('electric-guitars', '????????'), ('synthesizers', 'Авторское название');
INSERT INTO pg_temp."Product" VALUES ('fender-telecaster-am-pro-2', 'Unchanged', '????????', '{"body":"?????","neck":"Авторское значение","strings":6}', 7);
`;
const verify = `DO $$ BEGIN
IF (SELECT name FROM pg_temp."Category" WHERE slug='electric-guitars') <> 'Электрогитары' THEN RAISE EXCEPTION 'Category repair failed'; END IF;
IF (SELECT name FROM pg_temp."Category" WHERE slug='synthesizers') <> 'Авторское название' THEN RAISE EXCEPTION 'Valid name changed'; END IF;
IF NOT EXISTS (SELECT 1 FROM pg_temp."Product" WHERE specs->>'body'='Ольха' AND specs->>'neck'='Авторское значение' AND specs->>'strings'='6' AND stock=7 AND title='Unchanged' AND description NOT LIKE '%???%') THEN RAISE EXCEPTION 'Product preservation failed'; END IF;
END $$;
ROLLBACK;`;
const result = spawnSync(
  "docker",
  [
    "exec",
    "-i",
    "music-store-db",
    "psql",
    "-X",
    "-U",
    "admin",
    "-d",
    "music_store",
    "-v",
    "ON_ERROR_STOP=1",
  ],
  {
    input: Buffer.from(setup + repair + repair + verify, "utf8"),
    encoding: "utf8",
    windowsHide: true,
  },
);
if (result.status !== 0) {
  console.error(result.error?.message ?? result.stderr);
  process.exitCode = 1;
} else
  console.log(
    "PASS: damaged text repaired; valid text, numbers and stock preserved; repeat is safe. Temporary tables rolled back.",
  );
