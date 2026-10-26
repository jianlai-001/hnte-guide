import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const vendorDir = join(root, "assets", "vendor");

const files = [
  ["node_modules/pdfjs-dist/build/pdf.min.mjs", "pdf.min.mjs"],
  ["node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
  ["node_modules/mammoth/mammoth.browser.min.js", "mammoth.browser.min.js"],
  ["node_modules/read-excel-file/bundle/read-excel-file.min.js", "read-excel-file.min.js"],
  ["node_modules/jszip/dist/jszip.min.js", "jszip.min.js"]
];

await mkdir(vendorDir, { recursive: true });

for (const [source, target] of files) {
  const targetPath = join(vendorDir, target);
  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(join(root, source), targetPath);
}

console.log(`Copied ${files.length} browser assets to assets/vendor.`);
