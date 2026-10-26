import test from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORY_DEFINITIONS,
  REQUIRED_CATEGORIES,
  classifyDocument,
  detectSensitiveData,
  extractSignals,
  analyzeWorkspace,
  suggestedDocumentName,
  makeOrganizationMarkdown
} from "../assets/workspace-core.mjs";
import {
  generateRDDraft,
  generateProductDraft,
  generateTransformationDraft,
  generateInnovationDraft,
  draftingWarnings
} from "../assets/drafting-core.mjs";

function document(overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    name: "文件.pdf",
    extension: "pdf",
    category: "rd",
    status: "parsed",
    text: "研发项目立项报告和结题材料",
    hash: crypto.randomUUID(),
    signals: { codes: [], dates: [], creditCodes: [], amounts: [] },
    sensitivity: [],
    classification: { confidence: 0.9 },
    ...overrides
  };
}

test("材料分类定义包含 11 个必要类别", () => {
  assert.equal(CATEGORY_DEFINITIONS.length, 12);
  assert.equal(REQUIRED_CATEGORIES.length, 11);
  assert.equal(CATEGORY_DEFINITIONS.at(-1).id, "other");
});

test("文件名优先识别研发项目、知识产权和营业执照", () => {
  assert.equal(classifyDocument({ name: "RD01_研发项目立项报告.pdf" }).category, "rd");
  assert.equal(classifyDocument({ name: "发明专利证书-核心算法.pdf" }).category, "ip");
  assert.equal(classifyDocument({ name: "企业营业执照-扫描件.jpg" }).category, "business");
  assert.equal(classifyDocument({ name: "科技成果转化逐项说明.docx" }).category, "transformation");
});

test("正文关键词可用于无明确文件名的资料", () => {
  const result = classifyDocument({
    name: "附件3.pdf",
    text: "本文件说明高新技术产品关键技术、主要技术指标与检测报告对应关系。"
  });
  assert.equal(result.category, "product");
  assert.ok(result.confidence > 0.5);
});

test("无法判断时归入待分类", () => {
  const result = classifyDocument({ name: "扫描件001.pdf", text: "附件内容" });
  assert.equal(result.category, "other");
});

test("识别统一编号、日期和金额", () => {
  const signals = extractSignals(
    "IP01 对应 RD02 和 PS03。统一社会信用代码 91310000DEM123456X，日期 2025年6月1日，研发费用 900万元。",
    "RD02.pdf"
  );
  assert.ok(signals.codes.includes("IP01"));
  assert.ok(signals.codes.includes("RD02"));
  assert.ok(signals.codes.includes("PS03"));
  assert.ok(signals.creditCodes.includes("91310000DEM123456X"));
  assert.ok(signals.dates.includes("2025年6月1日"));
  assert.ok(signals.amounts.includes("900万元"));
});

test("识别常见敏感信息类型", () => {
  const flags = detectSensitiveData(
    "身份证号 110101199001011234，手机号 13800138000，银行账号 6222021234567890123。"
  );
  assert.deepEqual(flags, ["疑似身份证号码", "疑似手机号码", "疑似银行账号"]);
});

test("完整分类且解析成功时结构得分较高", () => {
  const docs = REQUIRED_CATEGORIES.map((category, index) => document({
    id: `doc-${index}`,
    name: `${category.label}.pdf`,
    category: category.id,
    hash: `hash-${index}`
  }));
  const eligibility = {
    passed: 9,
    checks: Array.from({ length: 9 }, (_, index) => ({ id: `check-${index}`, pass: true, severity: "gate" }))
  };
  const result = analyzeWorkspace(docs, { companyName: "示例公司" }, eligibility);
  assert.equal(result.score, 100);
  assert.equal(result.stats.categoriesCovered, 11);
  assert.equal(result.missing.length, 0);
  assert.equal(result.stats.highRiskCount, 0);
});

test("缺少材料、重复文件、扫描件、敏感数据和指标失败会形成问题", () => {
  const docs = [
    document({ id: "a", name: "营业执照.pdf", category: "business", hash: "same", sensitivity: ["疑似身份证号码"] }),
    document({ id: "b", name: "营业执照副本.pdf", category: "business", hash: "same" }),
    document({ id: "c", name: "扫描件.pdf", category: "rd", status: "needs_ocr", hash: "scan" })
  ];
  const eligibility = {
    passed: 8,
    checks: [
      ...Array.from({ length: 8 }, (_, index) => ({ id: `pass-${index}`, pass: true, severity: "gate" })),
      { id: "fail", pass: false, severity: "gate", label: "科技人员占比不低于 10%", detail: "当前 5%" }
    ]
  };
  const result = analyzeWorkspace(docs, { companyName: "示例公司" }, eligibility);
  assert.ok(result.findings.some((finding) => finding.id === "duplicate-1"));
  assert.ok(result.findings.some((finding) => finding.id === "parse-c"));
  assert.ok(result.findings.some((finding) => finding.id === "sensitive-data"));
  assert.ok(result.findings.some((finding) => finding.id === "profile-fail"));
  assert.ok(result.findings.some((finding) => finding.id.startsWith("missing-")));
});

test("建议文件名包含类别和年份", () => {
  assert.equal(
    suggestedDocumentName({ name: "核心算法专利证书.pdf", category: "ip", extension: "pdf" }),
    "IP_核心算法专利证书.pdf"
  );
  assert.equal(
    suggestedDocumentName({ name: "2025年立项报告.docx", category: "rd", extension: "docx" }),
    "RD_2025_2025年立项报告.docx"
  );
});

test("整理方案按类别输出文件名和审核发现", () => {
  const docs = [document({ name: "立项报告.pdf", category: "rd", extension: "pdf" })];
  const audit = { score: 40, readiness: "材料结构不足", findings: [{ severity: "high", title: "缺少知识产权", detail: "无文件" }] };
  const markdown = makeOrganizationMarkdown(docs, audit);
  assert.match(markdown, /研发项目/);
  assert.match(markdown, /缺少知识产权/);
  assert.match(markdown, /结构审核分：40/);
});

test("研发项目草稿只组织已有字段并保留待补充提示", () => {
  const result = generateRDDraft({
    companyName: "示例公司",
    projectName: "算法研发项目",
    technicalField: "软件",
    rdGoal: "解决小样本识别问题",
    innovation: "",
    rdResult: "形成算法模块",
    coreTechnology: "视觉识别"
  });
  assert.match(result, /示例公司/);
  assert.match(result, /解决小样本识别问题/);
  assert.match(result, /【待补充：说明项目组织/);
  assert.match(result, /不得虚构研发活动/);
  assert.deepEqual(draftingWarnings({ companyName: "示例公司" }, "rd"), [
    "projectName",
    "technicalField",
    "rdGoal",
    "innovation",
    "rdResult"
  ]);
});

test("三类其他文书都能生成结构完整的草稿", () => {
  const product = generateProductDraft({
    companyName: "示例公司",
    productName: "视觉检测系统",
    technicalField: "人工智能",
    keyTechnology: "小样本识别",
    technicalIndicators: "识别率 99%",
    ipSupport: "发明专利 IP01"
  });
  const transformation = generateTransformationDraft({
    companyName: "示例公司",
    achievementSource: "研发项目 RD01",
    transformationForm: "自行投资实施",
    applicationEffect: "形成产品 PS01"
  });
  const innovation = generateInnovationDraft({
    companyName: "示例公司",
    technicalField: "人工智能",
    coreTechnology: "视觉识别",
    ipSupport: "发明专利",
    rdCapability: "建立研发机构",
    keyTechnology: "小样本算法",
    achievementEffect: "产品实现销售",
    managementSummary: "研发制度完善"
  });
  assert.match(product, /技术说明/);
  assert.match(transformation, /科技成果转化/);
  assert.match(innovation, /创新能力综合说明/);
});
