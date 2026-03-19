import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../");

(async () => {
  const packPath = path.resolve(rootDir, "./pack");
  const packLinkPath = path.resolve(rootDir, "./public/pack");
  const packDir = await fs.readdir(path.resolve(rootDir, "./pack"));
  let packLinkDir: string[];
  try {
    packLinkDir = await fs.readdir(packLinkPath);
    const unlinkPromiseList = packLinkDir.map((fileName) =>
      fs.unlink(path.resolve(packLinkPath, fileName)),
    );
    await Promise.all(unlinkPromiseList);
  } catch (error) {
    await fs.mkdir(packLinkPath, { recursive: true });
    packLinkDir = await fs.readdir(packLinkPath);
  }

  const linkPromiseList = packDir.map((fileName) =>
    fs.link(
      path.resolve(packPath, fileName),
      path.resolve(packLinkPath, fileName),
    ),
  );
  await Promise.all(linkPromiseList);
})();
