import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../森林交互/index.html", import.meta.url), "utf8");
const source = await readFile(new URL("../森林交互/forest-entry.js", import.meta.url), "utf8");
const css = await readFile(new URL("../森林交互/forest.css", import.meta.url), "utf8");

test("森林交互页包含视频中的内容章节", () => {
  for (const id of ["forêts", "conservation", "labor", "emergence", "digital", "scale"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /FORESTS/);
  assert.match(html, /ONCHAIN/);
  assert.match(html, /REWARDING/);
  assert.match(html, /FOREST/);
  assert.match(html, /MONETARY/);
  assert.match(html, /AT INTERNET/);
});

test("森林交互页采用Three.js、平滑滚动和模拟链上数据", () => {
  assert.match(source, /from "three"/);
  assert.match(source, /from "lenis"/);
  assert.match(source, /InstancedMesh/);
  assert.match(source, /setupScroll/);
  assert.match(source, /setupPointer/);
  assert.match(source, /ledger-issued/);
  assert.match(html, /SIMULATED LEDGER/);
  assert.match(html, /DEMO DATA ONLY/);
});

test("森林交互页遵循黑白与森林绿视觉规则", () => {
  assert.match(css, /--black:/);
  assert.match(css, /--white:/);
  assert.match(css, /--green:/);
  assert.doesNotMatch(css, /backdrop-filter/);
  assert.match(css, /prefers-reduced-motion/);
});
