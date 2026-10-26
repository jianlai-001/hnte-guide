export const CATEGORY_DEFINITIONS = [
  {
    id: "application",
    label: "申请书与承诺",
    shortLabel: "申请",
    icon: "申",
    required: true,
    description: "申请书、企业承诺、系统表单和签章页",
    keywords: ["高新技术企业认定申请书", "高企申请书", "申报书", "企业承诺书", "承诺书", "申报表", "认定申请"]
  },
  {
    id: "business",
    label: "主体资质",
    shortLabel: "主体",
    icon: "照",
    required: true,
    description: "营业执照、企业登记、章程和注册信息",
    keywords: ["营业执照", "企业法人营业执照", "统一社会信用代码", "公司章程", "登记信息", "工商登记"]
  },
  {
    id: "ip",
    label: "知识产权",
    shortLabel: "IP",
    icon: "权",
    required: true,
    description: "专利、软著、集成电路布图及权属证明",
    keywords: ["发明专利", "实用新型", "外观设计", "软件著作权", "计算机软件著作权", "集成电路布图", "植物新品种", "知识产权证书", "授权通知书", "专利证书", "专利权"]
  },
  {
    id: "rd",
    label: "研发项目",
    shortLabel: "RD",
    icon: "研",
    required: true,
    description: "立项、过程、人员、费用、验收和结题材料",
    keywords: ["研发项目", "研究开发项目", "立项报告", "立项决议", "项目计划书", "结题报告", "验收报告", "研发活动", "技术路线", "阶段性成果", "RD0", "RD1", "RD2"]
  },
  {
    id: "product",
    label: "产品与服务",
    shortLabel: "PS",
    icon: "品",
    required: true,
    description: "关键技术、指标、检测、认证和产品说明",
    keywords: ["高新技术产品", "产品服务", "关键技术", "技术指标", "产品说明", "检测报告", "检验报告", "产品质量", "产品认证", "生产批文", "PS0", "PS1", "PS2"]
  },
  {
    id: "transformation",
    label: "成果转化",
    shortLabel: "转化",
    icon: "转",
    required: true,
    description: "成果来源、转化形式、产品载体和应用成效",
    keywords: ["科技成果转化", "成果转化", "转化说明", "转化成效", "成果来源", "实施转化", "推广应用", "成果应用"]
  },
  {
    id: "people",
    label: "人员材料",
    shortLabel: "人员",
    icon: "人",
    required: true,
    description: "职工、科技人员、社保、合同和月平均数",
    keywords: ["科技人员", "职工总数", "人员情况", "社保清单", "社会保险", "劳动合同", "花名册", "学历结构", "人员名单", "月平均数"]
  },
  {
    id: "finance",
    label: "财务与专项报告",
    shortLabel: "财务",
    icon: "财",
    required: true,
    description: "财务报表、研发费用辅助账、专项审计/鉴证",
    keywords: ["财务会计报告", "财务报表", "财务审计", "专项审计", "专项报告", "鉴证报告", "研发费用", "研发费用辅助账", "高新技术产品收入", "净资产"]
  },
  {
    id: "tax",
    label: "纳税申报",
    shortLabel: "税务",
    icon: "税",
    required: true,
    description: "企业所得税年度申报表主表及附表",
    keywords: ["企业所得税", "纳税申报表", "年度纳税申报", "税务", "汇算清缴", "纳税调整", "主表", "附表"]
  },
  {
    id: "contract",
    label: "合同与收入",
    shortLabel: "收入",
    icon: "收",
    required: true,
    description: "代表性合同、发票、验收和收入明细",
    keywords: ["销售合同", "技术合同", "合同清单", "发票", "收入明细", "收入汇总", "验收单", "交付", "订单", "回款"]
  },
  {
    id: "management",
    label: "研发组织管理",
    shortLabel: "管理",
    icon: "管",
    required: true,
    description: "研发制度、机构、产学研、激励和人才制度",
    keywords: ["研发管理制度", "研发组织", "组织管理制度", "研发机构", "产学研", "激励制度", "科技成果转化制度", "人才培养", "绩效评价", "创新创业平台"]
  },
  {
    id: "other",
    label: "其他与待分类",
    shortLabel: "其他",
    icon: "他",
    required: false,
    description: "补充材料或尚未识别的文件",
    keywords: []
  }
];

export const CATEGORY_MAP = new Map(CATEGORY_DEFINITIONS.map((item) => [item.id, item]));
export const REQUIRED_CATEGORIES = CATEGORY_DEFINITIONS.filter((item) => item.required);

const CATEGORY_BY_ID = Object.fromEntries(CATEGORY_DEFINITIONS.map((item) => [item.id, item]));

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("zh-CN")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatFileSize(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function classifyDocument({ name, text = "", path = "" }) {
  const fileText = normalize(name);
  const pathText = normalize(path);
  const body = normalize(text).slice(0, 120000);
  const ranked = CATEGORY_DEFINITIONS
    .filter((category) => category.id !== "other")
    .map((category) => {
      let score = 0;
      const matchedKeywords = [];
      category.keywords.forEach((keyword) => {
        const needle = normalize(keyword);
        if (!needle) return;
        let localScore = 0;
        if (fileText.includes(needle)) localScore += 8;
        if (pathText.includes(needle)) localScore += 3;
        if (body.includes(needle)) localScore += body.split(needle).length > 2 ? 3 : 1.5;
        if (localScore) {
          score += localScore;
          matchedKeywords.push(keyword);
        }
      });
      return { ...category, score, matchedKeywords };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 2) {
    return {
      category: "other",
      categoryLabel: CATEGORY_BY_ID.other.label,
      confidence: 0.15,
      alternatives: ranked.slice(0, 3).map(({ id, label, score }) => ({ id, label, score })),
      matchedKeywords: []
    };
  }

  const secondScore = ranked[1]?.score || 0;
  const total = ranked.reduce((sum, item) => sum + Math.max(item.score, 0), 0) || 1;
  const margin = Math.max(0, best.score - secondScore);
  const confidence = Math.min(0.98, 0.42 + (best.score / total) * 0.34 + Math.min(0.22, margin / 40));

  return {
    category: best.id,
    categoryLabel: best.label,
    confidence,
    alternatives: ranked.slice(0, 3).map(({ id, label, score }) => ({ id, label, score })),
    matchedKeywords: best.matchedKeywords
  };
}

export function extractSignals(text = "", name = "") {
  const source = `${name}\n${text}`;
  const codes = [...new Set(source.match(/\b(?:IP|RD|PS)\s*[-_]?\s*0?\d{1,3}\b/gi) || [])]
    .map((value) => value.replace(/\s+/g, "").toUpperCase())
    .slice(0, 30);
  const dates = [...new Set(source.match(/\b20\d{2}[-年./]\d{1,2}(?:[-月./]\d{1,2}日?)?/g) || [])]
    .slice(0, 20);
  const creditCodes = [...new Set(source.match(/(?<![0-9A-Z])[0-9A-HJ-NPQRTUWXY]{18}(?![0-9A-Z])/gi) || [])]
    .map((value) => value.toUpperCase())
    .slice(0, 10);
  const amounts = [...new Set(source.match(/\d[\d,]*(?:\.\d+)?\s*(?:万元|亿元|元)/g) || [])].slice(0, 20);
  return { codes, dates, creditCodes, amounts };
}

export function detectSensitiveData(text = "") {
  const flags = [];
  if (/(?<!\d)\d{17}[\dXx](?!\d)/.test(text)) {
    flags.push("疑似身份证号码");
  }
  if (/(?<!\d)1[3-9]\d{9}(?!\d)/.test(text)) {
    flags.push("疑似手机号码");
  }
  if (/(?:银行账号|银行账户|收款账号|开户账号)[^\n]{0,12}\d{12,}/.test(text)) {
    flags.push("疑似银行账号");
  }
  if (/(?:工资表|薪酬明细|社保明细|社保名单)/.test(text)) {
    flags.push("含薪酬或社保敏感主题");
  }
  return flags;
}

export function documentQuality(document) {
  const textLength = (document.text || "").trim().length;
  const issues = [];
  if (document.status === "needs_ocr") {
    issues.push("未提取到可用文字，可能是扫描件，需要 OCR 或人工复核。");
  }
  if (document.status === "unsupported") {
    issues.push(document.extractionMessage || "文件格式暂不支持自动抽取。");
  }
  if (document.status === "error") {
    issues.push(document.extractionMessage || "文件解析失败。");
  }
  if (textLength > 0 && textLength < 80) {
    issues.push("可提取文字很少，无法判断内容完整性。");
  }
  if ((document.classification?.confidence || 0) < 0.52) {
    issues.push("自动分类置信度较低，建议人工指定类别。");
  }
  return issues;
}

function severityWeight(severity) {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function addFinding(findings, finding) {
  findings.push({
    id: finding.id || `finding-${findings.length + 1}`,
    severity: finding.severity || "medium",
    category: finding.category || "general",
    title: finding.title,
    detail: finding.detail,
    action: finding.action || "请结合原始材料人工复核。",
    documentIds: finding.documentIds || []
  });
}

export function analyzeWorkspace(documents = [], profile = null, eligibility = null) {
  const findings = [];
  const byCategory = Object.fromEntries(CATEGORY_DEFINITIONS.map((category) => [category.id, []]));

  documents.forEach((document) => {
    const category = byCategory[document.category] ? document.category : "other";
    byCategory[category].push(document);
  });

  const missing = REQUIRED_CATEGORIES.filter((category) => byCategory[category.id].length === 0);
  missing.forEach((category) => {
    addFinding(findings, {
      id: `missing-${category.id}`,
      severity: category.id === "management" ? "medium" : "high",
      category: category.id,
      title: `缺少“${category.label}”类材料`,
      detail: `当前资料包中没有识别到${category.description}。`,
      action: `补充${category.label}材料；如现有文件已覆盖该内容，请重新分类并核对文件名。`
    });
  });

  const duplicatesByHash = new Map();
  documents.forEach((document) => {
    if (!document.hash) return;
    if (!duplicatesByHash.has(document.hash)) duplicatesByHash.set(document.hash, []);
    duplicatesByHash.get(document.hash).push(document);
  });
  const duplicates = [...duplicatesByHash.values()].filter((items) => items.length > 1);
  duplicates.forEach((items, index) => {
    addFinding(findings, {
      id: `duplicate-${index + 1}`,
      severity: "medium",
      title: "发现内容完全相同的文件",
      detail: items.map((item) => item.name).join("、"),
      action: "确认是否重复上传；保留有权版本，并删除或重新命名重复副本。",
      documentIds: items.map((item) => item.id)
    });
  });

  documents
    .filter((document) => ["needs_ocr", "unsupported", "error"].includes(document.status))
    .forEach((document) => {
      addFinding(findings, {
        id: `parse-${document.id}`,
        severity: document.status === "needs_ocr" ? "high" : "medium",
        category: document.category,
        title: `“${document.name}”未能完整抽取文字`,
        detail: documentQuality(document).join(" "),
        action: document.status === "needs_ocr"
          ? "对扫描件执行 OCR，或人工核对关键信息后再纳入结论。"
          : "转换为 PDF、DOCX、XLSX、TXT 等可解析格式后重新上传。",
        documentIds: [document.id]
      });
    });

  const lowConfidence = documents.filter((document) => (document.classification?.confidence || 0) < 0.52);
  if (lowConfidence.length) {
    addFinding(findings, {
      id: "low-classification-confidence",
      severity: "medium",
      title: `${lowConfidence.length} 个文件的自动分类可信度较低`,
      detail: lowConfidence.slice(0, 6).map((item) => item.name).join("、"),
      action: "在资料审核页人工确认类别，避免漏检或错误归组。",
      documentIds: lowConfidence.map((item) => item.id)
    });
  }

  const sensitiveDocuments = documents.filter((document) => document.sensitivity?.length);
  if (sensitiveDocuments.length) {
    addFinding(findings, {
      id: "sensitive-data",
      severity: "high",
      title: "资料包包含疑似敏感个人信息",
      detail: sensitiveDocuments.slice(0, 5).map((item) => `${item.name}（${item.sensitivity.join("、")}）`).join("；"),
      action: "仅在受控环境保留原始文件；禁止上传公开仓库，对外分享前完成脱敏。",
      documentIds: sensitiveDocuments.map((item) => item.id)
    });
  }

  const creditCodes = new Set();
  documents.forEach((document) => {
    (document.signals?.creditCodes || []).forEach((code) => creditCodes.add(code));
  });
  if (creditCodes.size > 1) {
    addFinding(findings, {
      id: "credit-code-conflict",
      severity: "high",
      title: "资料中出现多个疑似统一社会信用代码",
      detail: `识别到 ${creditCodes.size} 个不同编码：${[...creditCodes].slice(0, 6).join("、")}`,
      action: "核对所有申报材料主体是否一致；排除供应商、客户、审计机构等其他主体的编码。"
    });
  }

  if (profile && eligibility) {
    eligibility.checks.filter((item) => !item.pass).forEach((item) => {
      addFinding(findings, {
        id: `profile-${item.id}`,
        severity: item.severity === "gate" ? "high" : "medium",
        title: `企业指标未达门槛：${item.label}`,
        detail: item.detail,
        action: "先以真实财务、人事口径核对；如仍不达标，不建议用材料包装替代条件补齐。"
      });
    });
  } else if (!profile) {
    addFinding(findings, {
      id: "profile-missing",
      severity: "medium",
      title: "尚未填写企业指标自查",
      detail: "仅检查文件结构无法判断研发费用、人员和收入比例是否达标。",
      action: "在资料审核页补充注册、人员、研发费用和收入数据后重新审核。"
    });
  }

  const categoryCoverage = (REQUIRED_CATEGORIES.length - missing.length) / REQUIRED_CATEGORIES.length;
  const parseSuccess = documents.length
    ? documents.filter((document) => !["needs_ocr", "unsupported", "error"].includes(document.status)).length / documents.length
    : 0;
  const profilePassRate = eligibility
    ? eligibility.passed / eligibility.checks.length
    : 0;
  const duplicatePenalty = Math.min(8, duplicates.length * 3);
  const sensitivePenalty = Math.min(8, sensitiveDocuments.length * 3);
  const lowConfidencePenalty = Math.min(6, lowConfidence.length * 1.2);
  const rawScore = categoryCoverage * 55 + parseSuccess * 20 + profilePassRate * 25;
  const score = documents.length
    ? Math.max(0, Math.round(rawScore - duplicatePenalty - sensitivePenalty - lowConfidencePenalty))
    : 0;

  let readiness = "待上传资料";
  if (documents.length && score < 55) readiness = "材料结构不足";
  else if (documents.length && score < 75) readiness = "可开始补证与精审";
  else if (documents.length && score < 88) readiness = "材料结构较完整";
  else if (documents.length) readiness = "可进入人工终审";

  const highRiskCount = findings.filter((item) => item.severity === "high").length;
  const sortedFindings = findings.sort((a, b) =>
    severityWeight(b.severity) - severityWeight(a.severity) || a.title.localeCompare(b.title, "zh-CN")
  );

  return {
    score,
    readiness,
    findings: sortedFindings,
    byCategory,
    missing,
    duplicates,
    stats: {
      total: documents.length,
      parsed: documents.filter((document) => document.status === "parsed").length,
      needsOcr: documents.filter((document) => document.status === "needs_ocr").length,
      unsupported: documents.filter((document) => document.status === "unsupported").length,
      categoriesCovered: REQUIRED_CATEGORIES.length - missing.length,
      categoriesRequired: REQUIRED_CATEGORIES.length,
      highRiskCount,
      mediumRiskCount: findings.filter((item) => item.severity === "medium").length
    },
    disclaimer: "这是材料结构与可识别风险的辅助审核，不构成官方认定结论，也不能保证申报通过。"
  };
}

export function suggestedDocumentName(document) {
  const category = CATEGORY_MAP.get(document.category);
  const yearMatch = (document.name || "").match(/20\d{2}/);
  const year = yearMatch ? yearMatch[0] : "";
  const base = String(document.name || "未命名文件")
    .replace(/\.[^.]+$/, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return `${category?.shortLabel || "其他"}_${year ? `${year}_` : ""}${base}${document.extension ? `.${document.extension}` : ""}`;
}

export function makeOrganizationMarkdown(documents = [], audit = null) {
  const lines = [
    "# 高企申报资料整理方案",
    "",
    `- 生成时间：${new Date().toLocaleString("zh-CN")}`,
    `- 文件数量：${documents.length}`,
    audit ? `- 结构审核分：${audit.score} / 100` : null,
    audit ? `- 当前状态：${audit.readiness}` : null,
    "",
    "> 自动分类用于整理和初筛，不能替代人工确认。"
  ].filter(Boolean);

  CATEGORY_DEFINITIONS.forEach((category) => {
    const items = documents.filter((document) => document.category === category.id);
    if (!items.length) return;
    lines.push("", `## ${category.icon} ${category.label}`, "");
    items.forEach((document) => {
      lines.push(`- [ ] ${document.name} → 建议命名：\`${suggestedDocumentName(document)}\``);
    });
  });

  if (audit?.findings?.length) {
    lines.push("", "## 审核发现", "");
    audit.findings.forEach((finding) => {
      lines.push(`- [${finding.severity === "high" ? "高" : finding.severity === "medium" ? "中" : "低"}] ${finding.title}：${finding.detail}`);
    });
  }

  return lines.join("\n");
}
