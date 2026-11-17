import { readFileSync, writeFileSync } from "node:fs";

// Generate catalog-only SQL from a verified UTF-8 plain pg_dump backup.
// Never include account, order, address or authentication records.
const source = new TextDecoder("utf-8", { fatal: true }).decode(
  readFileSync("backup.utf8.sql"),
);
function unescapeCopy(value) {
  if (value === "\\N") return null;
  return value.replace(/\\([0-7]{1,3}|x[0-9a-fA-F]{1,2}|.)/g, (_, escaped) => {
    if (/^[0-7]{1,3}$/.test(escaped))
      return String.fromCharCode(parseInt(escaped, 8));
    if (/^x[0-9a-fA-F]{1,2}$/.test(escaped))
      return String.fromCharCode(parseInt(escaped.slice(1), 16));
    return (
      { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", "\\": "\\" }[
        escaped
      ] ?? escaped
    );
  });
}
function records(table) {
  const match = new RegExp(
    `COPY public\\."${table}" \\(([^)]+)\\) FROM stdin;\\r?\\n([\\s\\S]*?)\\\\\\.`,
    "m",
  ).exec(source);
  if (!match) throw new Error(`Missing ${table} COPY section`);
  const columns = match[1]
    .split(",")
    .map((column) => column.trim().replaceAll('"', ""));
  return match[2]
    .trimEnd()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const cells = line.split("\t");
      if (cells.length !== columns.length)
        throw new Error(`Invalid ${table} COPY row`);
      return Object.fromEntries(
        columns.map((column, index) => [column, unescapeCopy(cells[index])]),
      );
    });
}
const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
const damaged = (expression) =>
  `(${expression} LIKE '%???%' OR ${expression} LIKE '%╨%' OR ${expression} LIKE '%╤%')`;
const sql = [
  "-- Catalog text repair only. Review before running against a database.",
  "-- Only visibly damaged fields on matching slugs are replaced.",
  "-- Existing valid text, prices, stock, users and orders are preserved.",
  "BEGIN;",
  "SET LOCAL client_encoding = 'UTF8';",
  "SET LOCAL standard_conforming_strings = on;",
];
let updates = 0;
for (const table of ["Category", "Brand", "Product"]) {
  for (const row of records(table)) {
    const fields = table === "Product" ? ["title", "description"] : ["name"];
    for (const field of fields) {
      if (!row[field] || !/[\u0400-\u04ff]/.test(row[field])) continue;
      sql.push(
        `UPDATE public."${table}" SET "${field}" = ${quote(row[field])} WHERE slug = ${quote(row.slug)} AND ${damaged(`"${field}"`)} RETURNING slug AS repaired_${field};`,
      );
      updates++;
    }
    if (table === "Product" && row.specs) {
      const specs = JSON.parse(row.specs);
      if (!specs || Array.isArray(specs) || typeof specs !== "object") continue;
      for (const [key, value] of Object.entries(specs)) {
        if (typeof value !== "string" || !/[\u0400-\u04ff]/.test(value))
          continue;
        sql.push(
          `UPDATE public."Product" SET specs = jsonb_set(specs, ARRAY[${quote(key)}], ${quote(JSON.stringify(value))}::jsonb, false) WHERE slug = ${quote(row.slug)} AND ${damaged(`(specs->>${quote(key)})`)} RETURNING slug AS repaired_spec;`,
        );
        updates++;
      }
    }
  }
}
sql.push("COMMIT;", "");
writeFileSync("scripts/repair-catalog-encoding.sql", sql.join("\n"), {
  encoding: "utf8",
  flag: "wx",
});
console.log(`Created catalog-only repair SQL: ${updates} guarded updates`);
