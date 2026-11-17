import fs from "node:fs";
import crypto from "node:crypto";
const file = ".env";
let content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
if (!/^AUTH_SECRET=["']?[^"'\s]+/m.test(content)) {
  content = content.replace(/^AUTH_SECRET=.*\r?\n?/m, "");
  content += "\nAUTH_SECRET=" + crypto.randomBytes(32).toString("hex") + "\n";
}
if (!/^AUTH_URL=.+/m.test(content))
  content += "\nAUTH_URL=http://localhost:3000\n";
fs.writeFileSync(file, content);
console.log("Auth secret configured.");
