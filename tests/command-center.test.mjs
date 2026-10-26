import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CITIES,
  OFFICIAL_SOURCES,
  PROVINCE_RECOGNIZED_2025,
  SHENZHEN_BATCH_2025,
  VERIFIED_AT
} from "../assets/guangdong-data.mjs";

const geo = JSON.parse(await readFile(new URL("../data/guangdong.geo.json", import.meta.url), "utf8"));

test("广东指挥中心覆盖21个地级市且城市标识唯一", () => {
  assert.equal(CITIES.length, 21);
  assert.equal(geo.features.length, 21);
  assert.equal(new Set(CITIES.map((city) => city.id)).size, 21);
  assert.equal(new Set(CITIES.map((city) => city.code)).size, 21);
  const geoCodes = new Set(geo.features.map((feature) => String(feature.properties.adcode)));
  assert.ok(CITIES.every((city) => geoCodes.has(city.code)));
});

test("20个地市官方名录合计与省公告一致", () => {
  const sum = CITIES
    .filter((city) => city.id !== "shenzhen")
    .reduce((total, city) => total + city.count2025, 0);
  assert.equal(sum, PROVINCE_RECOGNIZED_2025);
  assert.equal(PROVINCE_RECOGNIZED_2025, 11871);
  assert.equal(SHENZHEN_BATCH_2025, 7249);
});

test("每个城市有电话、政策入口和单一地图口径", () => {
  for (const city of CITIES) {
    assert.ok(city.phone, `${city.name} 缺少电话`);
    assert.ok(city.portal.startsWith("http"), `${city.name} 缺少政策入口`);
    assert.ok(city.count2025 > 0, `${city.name} 缺少名录数量`);
    assert.ok(city.countNote, `${city.name} 缺少口径说明`);
  }
});

test("最新政策来源与核验日期可追溯", () => {
  assert.equal(VERIFIED_AT, "2026-10-23");
  assert.match(OFFICIAL_SOURCES.province2026Notice.url, /^https:\/\/gdstc\.gd\.gov\.cn\//);
  assert.match(OFFICIAL_SOURCES.province2026Notice.title, /2026/);
  assert.match(OFFICIAL_SOURCES.provinceList2025.url, /^https:\/\/gdstc\.gd\.gov\.cn\//);
});

test("深圳采用单列口径，不与省级名录重复", () => {
  const shenzhen = CITIES.find((city) => city.id === "shenzhen");
  assert.equal(shenzhen.metricScope, "shenzhen");
  assert.equal(shenzhen.countNote, "2025年第一批备案名录");
});
