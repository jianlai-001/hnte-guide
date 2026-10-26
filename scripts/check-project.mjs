import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const failures = [];

const requiredFiles = [
  "index.html",
  "workspace.html",
  "forest.html",
  "森林交互/index.html",
  "森林交互/forest.css",
  "森林交互/forest-entry.js",
  "森林交互/forest.bundle.js",
  "森林交互/README.md",
  "森林交互/assets/README.md",
  "audit.html",
  "organizer.html",
  "draft.html",
  "guide.html",
  "assets/styles.css",
  "assets/workspace.css",
  "assets/command-center.css",
  "assets/command-center-entry.js",
  "assets/experience.css",
  "assets/experience-entry.js",
  "assets/app.js",
  "assets/data.js",
  "assets/engine.js",
  "assets/workspace-core.mjs",
  "assets/workspace.js",
  "assets/ui.js",
  "assets/dashboard.js",
  "assets/audit.js",
  "assets/organizer.js",
  "assets/draft.js",
  "assets/drafting-core.mjs",
  "assets/vendor/pdf.min.mjs",
  "assets/vendor/pdf.worker.min.mjs",
  "assets/vendor/mammoth.browser.min.js",
  "assets/vendor/read-excel-file.min.js",
  "assets/vendor/jszip.min.js",
  "assets/vendor/NOTICE.md",
  "assets/vendor/command-center.bundle.js",
  "assets/vendor/experience.bundle.js",
  "assets/guangdong-data.mjs",
  "data/guangdong.geo.json",
  "data/countries-110m.json",
  "data/README.md",
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  "CHANGELOG.md",
  "docs/CHECKLIST.md",
  "docs/CONTRIBUTING.md",
  "docs/INPUTS.md",
  "docs/POLICY-NOTES.md",
  "docs/ARCHITECTURE.md",
  "scripts/serve.mjs",
  "scripts/vendor-assets.mjs"
];

async function exists(path) {
  try {
    await access(join(root, path), constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

for (const file of requiredFiles) {
  if (!(await exists(file))) failures.push(`缺少必需文件：${file}`);
}

const pages = ["index.html", "workspace.html", "audit.html", "organizer.html", "draft.html", "guide.html", "森林交互/index.html"];
for (const page of pages) {
  const html = await readFile(join(root, page), "utf8");
  const localLinks = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((value) => !/^(?:https?:|tel:|#|mailto:)/.test(value))
    .map((value) => value.split(/[?#]/)[0]);
  for (const asset of new Set(localLinks)) {
    const resolved = normalize(join(dirname(page), asset));
    if (!(await exists(resolved))) failures.push(`${page} 引用了不存在的本地文件：${asset}`);
  }
  if (/<script[^>]+src="https?:/.test(html)) {
    failures.push(`${page} 不应依赖远程脚本`);
  }
  if (page !== "森林交互/index.html" && (!html.includes("index.html") || !html.includes("audit.html") || !html.includes("draft.html"))) {
    failures.push(`${page} 缺少完整的工作台导航`);
  }
}

const { createRequire } = await import("node:module");
const require = createRequire(import.meta.url);
const guide = require(join(root, "assets/data.js"));
const engine = require(join(root, "assets/engine.js"));
const workspace = await import(pathToFileURL(join(root, "assets/workspace-core.mjs")));
const drafting = await import(pathToFileURL(join(root, "assets/drafting-core.mjs")));
const guangdong = await import(pathToFileURL(join(root, "assets/guangdong-data.mjs")));
const guangdongGeo = JSON.parse(await readFile(join(root, "data/guangdong.geo.json"), "utf8"));

if (guide.conditions.length !== 8) failures.push("认定条件数量应为 8");
if (guide.scoring.reduce((sum, item) => sum + item.max, 0) !== 100) {
  failures.push("评分指标满分应为 100");
}
if (!guide.materials.length) failures.push("材料清单不能为空");
if (!guide.sources.every((source) => source.url.startsWith("https://"))) {
  failures.push("官方来源应使用 https 链接");
}
if (guide.meta.asOf !== "2026-10-23") failures.push("政策核验日期与当前版本不一致");
if (workspace.REQUIRED_CATEGORIES.length !== 11) failures.push("必要材料类别应为 11");
if (workspace.classifyDocument({ name: "发明专利证书.pdf" }).category !== "ip") {
  failures.push("知识产权文件分类规则异常");
}
if (!Object.keys(drafting.DRAFT_GENERATORS).every((key) => ["rd", "product", "transformation", "innovation"].includes(key))) {
  failures.push("起草器类型不完整");
}
if (guangdong.CITIES.length !== 21) failures.push("广东城市数据应为 21 个地级市");
if (guangdongGeo.features.length !== 21) failures.push("广东 GeoJSON 应包含 21 个地级市边界");
if (new Set(guangdong.CITIES.map((city) => city.id)).size !== 21) failures.push("广东城市 id 重复");
if (new Set(guangdong.CITIES.map((city) => city.code)).size !== 21) failures.push("广东城市行政区划代码重复");
const provincialCityCount = guangdong.CITIES
  .filter((city) => city.id !== "shenzhen")
  .reduce((sum, city) => sum + city.count2025, 0);
if (provincialCityCount !== guangdong.PROVINCE_RECOGNIZED_2025) {
  failures.push(`广东城市名录合计异常：${provincialCityCount}`);
}
const geoCodes = new Set(guangdongGeo.features.map((feature) => String(feature.properties.adcode)));
if (!guangdong.CITIES.every((city) => geoCodes.has(city.code))) {
  failures.push("部分城市无法对应到行政边界");
}
if (!guangdong.CITIES.every((city) => city.phone && city.portal)) {
  failures.push("城市缺少本地咨询电话或政策入口");
}

const materialKeys = new Set();
for (const category of guide.materials) {
  if (!category.id || !category.items.length) failures.push("材料分类缺少 id 或条目");
  category.items.forEach((_, index) => {
    const key = `${category.id}-${index}`;
    if (materialKeys.has(key)) failures.push(`材料条目 key 重复：${key}`);
    materialKeys.add(key);
  });
}

if (engine.rdThreshold(5000) !== 5) failures.push("研发费用分档边界 5,000 万错误");
if (engine.rdThreshold(20000) !== 4) failures.push("研发费用分档边界 2 亿错误");

if (failures.length) {
  console.error(`项目检查失败（${failures.length} 项）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`项目检查通过：${requiredFiles.length} 个必需文件、${guide.conditions.length} 项条件、${guide.materials.length} 类材料。`);
