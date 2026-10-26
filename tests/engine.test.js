const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../assets/engine.js");

const passingEligibility = {
  registeredOverYear: "yes",
  ownsCoreIp: "yes",
  coreIpSupportsProduct: "yes",
  inSupportedField: "yes",
  noMajorIncident: "yes",
  totalEmployees: 100,
  techEmployees: 10,
  latestSalesWan: 8000,
  salesWan: 18000,
  rdExpensesWan: 720,
  domesticRdWan: 432,
  highTechRevenueWan: 6000,
  totalRevenueWan: 9000
};

test("研发费用比例按最近一年销售收入分档", () => {
  assert.equal(engine.rdThreshold(0), 5);
  assert.equal(engine.rdThreshold(5000), 5);
  assert.equal(engine.rdThreshold(5000.01), 4);
  assert.equal(engine.rdThreshold(20000), 4);
  assert.equal(engine.rdThreshold(20000.01), 3);
});

test("比率计算对零分母返回 null", () => {
  assert.equal(engine.ratio(10, 100), 0.1);
  assert.equal(engine.ratio(0, 0), null);
  assert.equal(engine.ratio(10, -1), null);
});

test("全部硬门槛满足时通过资格初筛", () => {
  const result = engine.assessEligibility(passingEligibility);
  assert.equal(result.hardGateReady, true);
  assert.equal(result.failed, 0);
  assert.equal(result.passed, 9);
  assert.equal(result.metrics.requiredRd, 4);
  assert.equal(result.metrics.techRatio, 0.1);
  assert.equal(result.metrics.rdRatio, 0.04);
  assert.equal(result.metrics.domesticRatio, 0.6);
  assert.equal(result.metrics.revenueRatio, 2 / 3);
});

test("人员、研发费用、境内研发和高新收入未达门槛时失败", () => {
  const result = engine.assessEligibility({
    ...passingEligibility,
    techEmployees: 9,
    rdExpensesWan: 700,
    domesticRdWan: 400,
    highTechRevenueWan: 5000
  });
  assert.equal(result.hardGateReady, false);
  assert.equal(result.failed, 4);
  const failedIds = result.checks.filter((item) => !item.pass).map((item) => item.id);
  assert.deepEqual(failedIds, ["people", "rd-ratio", "domestic-rd", "revenue"]);
});

test("没有核心知识产权所有权不能通过", () => {
  const result = engine.assessEligibility({
    ...passingEligibility,
    ownsCoreIp: "no"
  });
  assert.equal(result.hardGateReady, false);
  assert.ok(result.checks.find((item) => item.id === "ip-ownership" && !item.pass));
});

test("知识产权得分封顶 30 分", () => {
  assert.equal(engine.scoreIp({
    advanced: 8,
    core: 8,
    count: 8,
    source: 6,
    standards: 2
  }), 30);
});

test("科技成果转化按年平均项数映射到区间中值", () => {
  assert.equal(engine.scoreTransformation(0), 0);
  assert.equal(engine.scoreTransformation(1), 3);
  assert.equal(engine.scoreTransformation(3), 15);
  assert.equal(engine.scoreTransformation(5), 27);
  assert.equal(engine.scoreTransformation(9), 27);
});

test("研发组织管理得分封顶 20 分", () => {
  assert.equal(engine.scoreOrganization({
    system: 6,
    institution: 6,
    transformation: 4,
    talent: 4
  }), 20);
});

test("成长性增长率按首尾复合口径计算", () => {
  assert.ok(Math.abs(engine.growthRate([500, 650, 850]) - 0.3038461538461539) < Number.EPSILON);
  assert.equal(engine.growthRate([0, 100, 150]), 0.5);
  assert.equal(engine.growthRate([100, 0, 150]), 0);
  assert.equal(engine.growthRate([100, 90, 80]), 0);
});

test("成长性分档边界", () => {
  assert.equal(engine.growthRateScore(0.35), 10);
  assert.equal(engine.growthRateScore(0.25), 8);
  assert.equal(engine.growthRateScore(0.15), 6);
  assert.equal(engine.growthRateScore(0.05001), 4);
  assert.equal(engine.growthRateScore(0.05), 2);
  assert.equal(engine.growthRateScore(0), 0);
});

test("100 分模拟总分正确，且 70 分不算通过", () => {
  const result = engine.totalScore({
    ip: { advanced: 8, core: 8, count: 8, source: 6, standards: 0 },
    transformationCount: 5,
    organization: { system: 6, institution: 6, transformation: 0, talent: 0 },
    growth: {
      netAssets: [500, 650, 850],
      sales: [1000, 1300, 1700]
    }
  });
  assert.equal(result.ip, 30);
  assert.equal(result.transformation, 27);
  assert.equal(result.organization, 12);
  assert.equal(result.growth.total, 16);
  assert.equal(result.total, 85);
  assert.equal(result.passes, true);

  const exactlySeventy = engine.totalScore({
    ip: { advanced: 8, core: 8, count: 8, source: 6, standards: 0 },
    transformationCount: 4,
    organization: { system: 5, institution: 6, transformation: 0, talent: 0 },
    growth: { netAssets: [500, 650, 850], sales: [100, 90, 0] }
  });
  assert.equal(exactlySeventy.total, 70);
  assert.equal(exactlySeventy.passes, false);
});
