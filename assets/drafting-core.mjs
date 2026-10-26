function text(value, fallback = "【待补充】") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function sentence(value) {
  const normalized = text(value);
  return /[。！？.!?]$/.test(normalized) ? normalized : `${normalized}。`;
}

export function draftingWarnings(fields, type) {
  const required = {
    rd: ["companyName", "projectName", "technicalField", "rdGoal", "innovation", "rdResult"],
    product: ["companyName", "productName", "technicalField", "keyTechnology", "technicalIndicators", "ipSupport"],
    transformation: ["companyName", "achievementSource", "transformationForm", "applicationEffect"],
    innovation: ["companyName", "coreTechnology", "keyTechnology", "ipSupport", "rdCapability", "achievementEffect"]
  }[type] || [];
  return required.filter((key) => !String(fields[key] || "").trim());
}

export function generateRDDraft(fields) {
  const organization = fields.organizationMethod || "【待补充：说明项目组织、职责分工、进度管理与验证方式】";
  const activity = fields.rdActivities || "【待补充：说明研发过程、实验或设计活动、关键节点和测试验证】";
  return `# ${text(fields.projectName, "研发项目")}立项论证与实施说明

## 一、项目基本信息

申报单位：${text(fields.companyName)}

项目名称：${text(fields.projectName)}

技术领域：${text(fields.technicalField)}

项目周期：${text(fields.projectPeriod)}

## 二、立项背景与目标

${sentence(fields.projectBackground)}

本项目拟解决的核心技术问题是：${sentence(fields.rdGoal)}

预期形成的主要成果为：${sentence(fields.rdResult)}

## 三、核心技术内容与创新点

本项目围绕${text(fields.technicalField)}开展研究与开发。核心技术内容包括：${sentence(fields.coreTechnology)}

主要创新点包括：${sentence(fields.innovation)}

## 四、组织实施方式

${sentence(organization)}

研发活动过程如下：${sentence(activity)}

## 五、研发投入与阶段成果

项目预算及实际投入：${sentence(fields.projectBudget)}

阶段性成果：${sentence(fields.projectProgress)}

项目验收或结题结果：${sentence(fields.rdResult)}

## 六、证明材料索引

${text(fields.evidenceIndex, "【待补充：立项决议、研发过程记录、测试报告、结题/验收材料、对应知识产权证明】")}

> 本稿由结构化信息生成。所有技术表述、指标、日期、人员和金额均须由企业按原始证据核实，不得虚构研发活动。`;
}

export function generateProductDraft(fields) {
  return `# ${text(fields.productName, "高新技术产品（服务）")}技术说明

## 一、产品（服务）概况

申报单位：${text(fields.companyName)}

产品（服务）名称：${text(fields.productName)}

所属技术领域：${text(fields.technicalField)}

主要应用场景：${sentence(fields.applicationScenario)}

## 二、关键技术及技术指标

本产品（服务）的核心技术为：${sentence(fields.keyTechnology)}

主要技术指标及验证情况：${sentence(fields.technicalIndicators)}

## 三、知识产权与核心技术支撑作用

相关知识产权：${sentence(fields.ipSupport)}

上述知识产权对产品（服务）发挥核心支持作用的具体体现为：${sentence(fields.ipProductLink)}

## 四、与同类产品（服务）的比较优势

${sentence(fields.competitiveAdvantage)}

## 五、产业化与收入情况

产品或服务的交付形式：${sentence(fields.deliveryMode)}

产业化及收入贡献：${sentence(fields.revenueEvidence)}

## 六、证明材料索引

${text(fields.evidenceIndex, "【待补充：产品说明、检测报告、认证或资质、知识产权、代表性合同、发票、验收/交付材料】")}

> 本稿由结构化信息生成。技术指标、比较结论和收入数据必须与检测报告、合同发票和审计资料一致。`;
}

export function generateTransformationDraft(fields) {
  return `# 科技成果转化情况说明

## 一、成果基本情况

申报单位：${text(fields.companyName)}

科技成果名称：${text(fields.achievementName)}

成果来源及形成过程：${sentence(fields.achievementSource)}

成果权属及对应知识产权：${sentence(fields.achievementIp)}

## 二、转化方式

转化形式：${sentence(fields.transformationForm)}

转化实施过程：${sentence(fields.transformationProcess)}

## 三、形成的产品、服务或工艺

转化载体：${sentence(fields.applicationCarrier)}

技术与产品对应关系：${sentence(fields.technologyProductLink)}

## 四、应用成效

${sentence(fields.applicationEffect)}

可核验的经济或业务成效：${sentence(fields.transformationOutcome)}

## 五、证明材料索引

${text(fields.evidenceIndex, "【待补充：成果权属、转化协议或实施记录、产品/服务证明、测试或验收材料、合同发票及应用成效证明】")}

> 同一科技成果转化为多个产品通常只计一项。不得将无实际转化证据的成果计入转化数量。`;
}

export function generateInnovationDraft(fields) {
  return `# 企业创新能力综合说明

## 一、企业主营业务与核心技术

${text(fields.companyName)}围绕${text(fields.technicalField)}开展主营业务。企业核心技术为：${sentence(fields.coreTechnology)}

## 二、知识产权与竞争力

知识产权基础：${sentence(fields.ipSupport)}

知识产权对主要产品（服务）竞争力发挥作用的体现为：${sentence(fields.ipSupportEffect)}

## 三、研发活动与技术创新能力

研发组织与投入能力：${sentence(fields.rdCapability)}

主要研发方向和创新点：${sentence(fields.keyTechnology)}

## 四、科技成果转化与产业化

成果转化机制：${sentence(fields.transformationMechanism)}

主要转化成效：${sentence(fields.achievementEffect)}

## 五、研发组织管理与人才队伍

${sentence(fields.managementSummary)}

## 六、支撑材料索引

${text(fields.evidenceIndex, "【待补充：知识产权、研发项目、成果转化、组织制度、人员及财务材料索引】")}

> 本稿只组织企业已提供的事实。生成后应由技术、财务、人事和经办负责人逐项复核。`;
}

export const DRAFT_GENERATORS = {
  rd: generateRDDraft,
  product: generateProductDraft,
  transformation: generateTransformationDraft,
  innovation: generateInnovationDraft
};

export const DRAFT_LABELS = {
  rd: "研发项目立项/结题说明",
  product: "高新技术产品技术说明",
  transformation: "科技成果转化说明",
  innovation: "企业创新能力综合说明"
};
