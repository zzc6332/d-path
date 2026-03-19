import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import libPackageJson from "../lib/package.json" with { type: "json" };
import packageJson from "../package.json" with { type: "json" };
libPackageJson.version = packageJson.version;
const libPackageJsonStr = JSON.stringify(libPackageJson, null, 2);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../");

(async () => {
  const fh = await fs.open(path.resolve(rootDir, "./pack/package.json"), "w+");
  fh.write(libPackageJsonStr);
  fh.close;
})();
