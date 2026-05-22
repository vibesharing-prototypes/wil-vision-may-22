/**
 * Atlas prototype shell (`mock-hb-global-navigator` / `MockNavigator`) defaults
 * `SideNav` to boards-cloud ("Boards"). ARC Core prototypes are Risk Manager–oriented;
 * align the side nav / header app title with `risk-manager` after each install.
 */
import fs from "node:fs";
import path from "node:path";

const indexJs = path.join(
  process.cwd(),
  "node_modules",
  "@diligentcorp",
  "atlas-react-bundle",
  "dist",
  "index.js",
);

if (!fs.existsSync(indexJs)) {
  process.exit(0);
}

let content = fs.readFileSync(indexJs, "utf8");
let changed = false;

const appKeyFrom = 'appKey = "boards-cloud"';
const appKeyTo = 'appKey = "risk-manager"';
if (content.includes(appKeyFrom)) {
  content = content.replace(appKeyFrom, appKeyTo);
  changed = true;
}

/** Match MockNavigator default current app to Risk Manager (id 4 in DEFAULT_APPS). */
const currentIdFrom = "var DEFAULT_CURRENT_APP_ID = 3;";
const currentIdTo = "var DEFAULT_CURRENT_APP_ID = 4;";
if (content.includes(currentIdFrom)) {
  content = content.replace(currentIdFrom, currentIdTo);
  changed = true;
}

if (!changed) {
  process.exit(0);
}

fs.writeFileSync(indexJs, content);
console.log(
  "[patch-atlas-prototype-app-key] Atlas prototype nav defaults: appKey risk-manager, current app id 4 (Risk Manager).",
);
