import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pages = {
  "audit.html": "audit",
  "organizer.html": "organizer",
  "draft.html": "draft",
  "guide.html": "guide",
  "workspace.html": "workspace"
};

for (const [file, scene] of Object.entries(pages)) {
  test(`${file} 使用沉浸式 3D 体验层`, async () => {
    const html = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(html, /experience\.css/);
    assert.match(html, /experience\.bundle\.js/);
    assert.match(html, new RegExp(`data-experience="${scene}"`));
    assert.match(html, /class="[^"]*experience-page/);
  });
}

test("三维体验层包含五种不同的场景构建器", async () => {
  const source = await readFile(new URL("../assets/experience-entry.js", import.meta.url), "utf8");
  for (const builder of ["createScanScene", "createNetworkScene", "createSheetsScene", "createMonolithScene", "createFilesScene"]) {
    assert.match(source, new RegExp(`function ${builder}`));
  }
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /experience-progress/);
  assert.match(source, /IntersectionObserver/);
});
