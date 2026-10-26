(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.HNTEEngine = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function ratio(part, total) {
    const numerator = toNumber(part);
    const denominator = toNumber(total);
    if (denominator <= 0) return null;
    return numerator / denominator;
  }

  function rdThreshold(latestSalesWan) {
    const sales = toNumber(latestSalesWan);
    if (sales <= 5000) return 5;
    if (sales <= 20000) return 4;
    return 3;
  }

  function check(id, label, pass, detail, severity) {
    return {
      id,
      label,
      pass: Boolean(pass),
      detail,
      severity: severity || "gate"
    };
  }

  function assessEligibility(input) {
    const totalEmployees = toNumber(input.totalEmployees);
    const techEmployees = toNumber(input.techEmployees);
    const rdExpenses = toNumber(input.rdExpensesWan);
    const sales = toNumber(input.salesWan);
    const domesticRd = toNumber(input.domesticRdWan);
    const highTechRevenue = toNumber(input.highTechRevenueWan);
    const totalRevenue = toNumber(input.totalRevenueWan);
    const requiredRd = rdThreshold(input.latestSalesWan);
    const techRatio = ratio(techEmployees, totalEmployees);
    const rdRatio = ratio(rdExpenses, sales);
    const domesticRatio = ratio(domesticRd, rdExpenses);
    const revenueRatio = ratio(highTechRevenue, totalRevenue);
    const checks = [];

    checks.push(check(
      "age",
      "注册成立满 365 天",
      input.registeredOverYear === "yes",
      input.registeredOverYear === "yes" ? "已确认注册年限。" : "注册年限不足或尚未确认。"
    ));

    checks.push(check(
      "ip-ownership",
      "拥有核心知识产权所有权",
      input.ownsCoreIp === "yes",
      input.ownsCoreIp === "yes"
        ? "已确认通过自主研发、受让、受赠或并购取得所有权。"
        : "仅有许可使用权、权属不在申报企业或尚未确认。"
    ));

    checks.push(check(
      "ip-support",
      "知识产权对主要产品发挥核心支持作用",
      input.coreIpSupportsProduct === "yes",
      input.coreIpSupportsProduct === "yes"
        ? "核心知识产权与主要产品存在技术支持关系。"
        : "需要补充 IP、产品关键技术和收入之间的对应证据。"
    ));

    checks.push(check(
      "field",
      "核心技术属于重点支持领域",
      input.inSupportedField === "yes",
      input.inSupportedField === "yes"
        ? "已确认技术方向可对应到《国家重点支持的高新技术领域》。"
        : "领域不匹配或尚未完成逐级技术领域定位。"
    ));

    const techPass = totalEmployees > 0 && techRatio !== null && techRatio >= 0.1;
    checks.push(check(
      "people",
      "科技人员占比不低于 10%",
      techPass,
      totalEmployees > 0
        ? `当前填报为 ${(techRatio * 100).toFixed(2)}%，门槛 10%。`
        : "职工总数须大于 0，并按全年月平均数复核。"
    ));

    const rdPass = sales > 0 && rdRatio !== null && rdRatio * 100 >= requiredRd;
    checks.push(check(
      "rd-ratio",
      `研发费用占比不低于 ${requiredRd}%`,
      rdPass,
      sales > 0
        ? `近三年研发费用/同期销售收入为 ${(rdRatio * 100).toFixed(2)}%。`
        : "近三年销售收入须大于 0，口径应使用主营业务收入加其他业务收入。"
    ));

    const domesticPass = domesticRatio !== null && domesticRatio >= 0.6;
    checks.push(check(
      "domestic-rd",
      "境内研发费用占比不低于 60%",
      domesticPass,
      rdExpenses > 0
        ? `当前填报为 ${(domesticRatio * 100).toFixed(2)}%。`
        : "研发费用总额须大于 0，委托境外研发不得计入境内口径。"
    ));

    const revenuePass = revenueRatio !== null && revenueRatio >= 0.6;
    checks.push(check(
      "revenue",
      "高新技术产品（服务）收入占比不低于 60%",
      revenuePass,
      totalRevenue > 0
        ? `当前填报为 ${(revenueRatio * 100).toFixed(2)}%。`
        : "近一年总收入须大于 0；总收入不等于销售收入。"
    ));

    checks.push(check(
      "incident",
      "申请前一年无相关重大事故或严重违法行为",
      input.noMajorIncident === "yes",
      input.noMajorIncident === "yes"
        ? "已确认不存在适用的一票否决情形。"
        : "存在或尚未核实的重大安全、质量、环境合规风险。"
    ));

    const failed = checks.filter((item) => !item.pass);
    return {
      checks,
      passed: checks.length - failed.length,
      failed: failed.length,
      hardGateReady: failed.length === 0,
      metrics: {
        requiredRd,
        techRatio,
        rdRatio,
        domesticRatio,
        revenueRatio
      }
    };
  }

  function scoreIp(parts) {
    const advanced = Math.min(8, Math.max(0, toNumber(parts.advanced)));
    const core = Math.min(8, Math.max(0, toNumber(parts.core)));
    const count = Math.min(8, Math.max(0, toNumber(parts.count)));
    const source = Math.min(6, Math.max(0, toNumber(parts.source)));
    const standards = Math.min(2, Math.max(0, toNumber(parts.standards)));
    return Math.min(30, advanced + core + count + source + standards);
  }

  function scoreTransformation(count) {
    const value = Math.floor(toNumber(count));
    if (value >= 5) return 27;
    if (value === 4) return 21;
    if (value === 3) return 15;
    if (value === 2) return 9;
    if (value === 1) return 3;
    return 0;
  }

  function scoreOrganization(parts) {
    const system = Math.min(6, Math.max(0, toNumber(parts.system)));
    const institution = Math.min(6, Math.max(0, toNumber(parts.institution)));
    const transformation = Math.min(4, Math.max(0, toNumber(parts.transformation)));
    const talent = Math.min(4, Math.max(0, toNumber(parts.talent)));
    return Math.min(20, system + institution + transformation + talent);
  }

  function growthRate(values) {
    if (!Array.isArray(values) || values.length !== 3) return 0;
    const first = toNumber(values[0]);
    const second = toNumber(values[1]);
    const third = toNumber(values[2]);
    if (first === 0) {
      return second > 0 ? third / second - 1 : 0;
    }
    if (second === 0) return 0;
    const rate = ((second / first) + (third / second)) / 2 - 1;
    return rate <= 0 ? 0 : rate;
  }

  function growthRateScore(rate) {
    const value = toNumber(rate);
    if (value >= 0.35) return 10;
    if (value >= 0.25) return 8;
    if (value >= 0.15) return 6;
    if (value > 0.05) return 4;
    if (value > 0) return 2;
    return 0;
  }

  function scoreGrowth(parts) {
    const netAssets = growthRate(parts.netAssets);
    const sales = growthRate(parts.sales);
    return {
      netAssets,
      sales,
      netAssetsScore: growthRateScore(netAssets),
      salesScore: growthRateScore(sales),
      total: growthRateScore(netAssets) + growthRateScore(sales)
    };
  }

  function totalScore(parts) {
    const ip = scoreIp(parts.ip || {});
    const transformation = scoreTransformation(parts.transformationCount);
    const organization = scoreOrganization(parts.organization || {});
    const growth = scoreGrowth(parts.growth || {});
    const total = ip + transformation + organization + growth.total;
    return {
      ip,
      transformation,
      organization,
      growth,
      total,
      passes: total > 70
    };
  }

  return {
    toNumber,
    ratio,
    rdThreshold,
    assessEligibility,
    scoreIp,
    scoreTransformation,
    scoreOrganization,
    growthRate,
    growthRateScore,
    scoreGrowth,
    totalScore
  };
});
