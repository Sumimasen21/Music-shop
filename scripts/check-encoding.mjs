import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const paths = process.argv.slice(2);
const files = paths.length
  ? paths
  : execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
      .split("\0")
      .filter(
        (path) =>
          /\.(tsx?|m?js|css|json|md|prisma|ya?ml)$/.test(path) &&
          !path.endsWith("package-lock.json"),
      );
let invalid = 0;
for (const path of files) {
  const bytes = readFileSync(path);
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    invalid++;
    console.log(
      JSON.stringify({
        path,
        validUtf8: false,
        utf16Bom: bytes[0] === 255 && bytes[1] === 254,
      }),
    );
    continue;
  }
  const replacement = (text.match(/\uFFFD/g) ?? []).length;
  const questionRuns = (text.match(/\?{3,}/g) ?? []).length;
  if (paths.length || replacement || questionRuns)
    console.log(
      JSON.stringify({
        path,
        validUtf8: true,
        bytes: bytes.length,
        cyrillicCharacters: (text.match(/[\u0400-\u04ff]/g) ?? []).length,
        replacementCharacters: replacement,
        questionRuns,
        clientEncoding: /SET client_encoding = '([^']+)'/.exec(text)?.[1],
      }),
    );
}
console.log(
  JSON.stringify({ checkedFiles: files.length, invalidUtf8Files: invalid }),
);
if (invalid) process.exitCode = 1;
