import {
  listDocuments,
  getProfile,
  saveDraft,
  listDrafts,
  deleteDraft
} from "./workspace.js";
import {
  DRAFT_GENERATORS,
  DRAFT_LABELS,
  draftingWarnings
} from "./drafting-core.mjs";
import { setupShell, showToast, escapeHtml, downloadText, formatDate } from "./ui.js";

const FIELD_DEFINITIONS = {
  rd: [
    ["companyName", "申报企业", "text", true],
    ["projectName", "研发项目名称", "text", true],
    ["projectPeriod", "项目周期", "text", false, "例如：2024年3月—2025年6月"],
    ["technicalField", "技术领域", "text", true, "填写可对应到重点支持领域的具体方向"],
    ["projectBackground", "立项背景", "textarea", false, "说明产业需求、现有技术局限和项目必要性"],
    ["rdGoal", "拟解决的核心技术问题", "textarea", true],
    ["coreTechnology", "核心技术内容", "textarea", false],
    ["innovation", "主要创新点", "textarea", true],
    ["organizationMethod", "组织实施方式", "textarea", false, "组织、职责、进度、质量与风险管理"],
    ["rdActivities", "研发活动过程", "textarea", false, "设计、实验、测试、迭代和验证过程"],
    ["projectBudget", "预算与实际投入", "textarea", false, "须与研发辅助账和专项报告一致"],
    ["projectProgress", "阶段性成果", "textarea", false],
    ["rdResult", "验收/结题成果", "textarea", true],
    ["evidenceIndex", "证据文件索引", "textarea", false]
  ],
  product: [
    ["companyName", "申报企业", "text", true],
    ["productName", "高新技术产品（服务）名称", "text", true],
    ["technicalField", "技术领域", "text", true],
    ["applicationScenario", "主要应用场景", "textarea", false],
    ["keyTechnology", "关键技术", "textarea", true],
    ["technicalIndicators", "技术指标与验证", "textarea", true],
    ["ipSupport", "相关知识产权", "textarea", true],
    ["ipProductLink", "IP 对产品的核心支持作用", "textarea", false],
    ["competitiveAdvantage", "与同类产品的比较优势", "textarea", false],
    ["deliveryMode", "交付形式", "textarea", false],
    ["revenueEvidence", "产业化与收入贡献", "textarea", false],
    ["evidenceIndex", "证据文件索引", "textarea", false]
  ],
  transformation: [
    ["companyName", "申报企业", "text", true],
    ["achievementName", "科技成果名称", "text", false],
    ["achievementSource", "成果来源与形成过程", "textarea", true],
    ["achievementIp", "成果权属与对应知识产权", "textarea", false],
    ["transformationForm", "转化方式", "textarea", true],
    ["transformationProcess", "转化实施过程", "textarea", false],
    ["applicationCarrier", "形成的产品、服务或工艺", "textarea", false],
    ["technologyProductLink", "技术与产品对应关系", "textarea", false],
    ["applicationEffect", "实际应用成效", "textarea", true],
    ["transformationOutcome", "可核验的经济或业务成效", "textarea", false],
    ["evidenceIndex", "证据文件索引", "textarea", false]
  ],
  innovation: [
    ["companyName", "申报企业", "text", true],
    ["technicalField", "主要技术领域", "text", true],
    ["coreTechnology", "企业核心技术", "textarea", true],
    ["ipSupport", "知识产权基础", "textarea", true],
    ["ipSupportEffect", "知识产权对产品竞争力的作用", "textarea", false],
    ["rdCapability", "研发组织与投入能力", "textarea", true],
    ["keyTechnology", "研发方向与创新点", "textarea", true],
    ["transformationMechanism", "成果转化机制", "textarea", false],
    ["achievementEffect", "主要转化成效", "textarea", true],
    ["managementSummary", "研发管理与人才队伍", "textarea", false],
    ["evidenceIndex", "证据文件索引", "textarea", false]
  ]
};

const CONTEXT_CATEGORIES = {
  rd: ["rd", "ip", "finance", "people"],
  product: ["product", "ip", "contract", "finance"],
  transformation: ["transformation", "rd", "product", "contract"],
  innovation: ["ip", "rd", "product", "transformation", "management", "people"]
};

const state = {
  type: "rd",
  fieldsByType: { rd: {}, product: {}, transformation: {}, innovation: {} },
  documents: [],
  profile: null,
  drafts: [],
  outputs: {},
  activeDraftId: null
};

function fillCommonFields() {
  Object.values(state.fieldsByType).forEach((fields) => {
    if (!fields.companyName && state.profile?.companyName) fields.companyName = state.profile.companyName;
  });
}

function renderForm() {
  const fields = state.fieldsByType[state.type];
  const form = document.getElementById("draft-form");
  document.getElementById("draft-form-title").textContent = DRAFT_LABELS[state.type];
  form.innerHTML = FIELD_DEFINITIONS[state.type].map(([name, label, kind, required, hint]) => {
    const value = fields[name] || "";
    const input = kind === "textarea"
      ? `<textarea name="${name}" rows="${name === "evidenceIndex" ? 4 : 3}" ${required ? "required" : ""} placeholder="${escapeHtml(hint || "")}">${escapeHtml(value)}</textarea>`
      : `<input name="${name}" type="text" ${required ? "required" : ""} value="${escapeHtml(value)}" placeholder="${escapeHtml(hint || "")}">`;
    return `
      <label class="field ${kind === "textarea" ? "field-textarea" : ""} ${name === "evidenceIndex" ? "field-wide" : ""}">
        <span>${escapeHtml(label)} ${required ? '<i class="required-mark">必填</i>' : ""}</span>
        ${input}
      </label>
    `;
  }).join("");
  updateCompleteness();
  renderContextDocuments();
}

function readForm() {
  const form = document.getElementById("draft-form");
  return Object.fromEntries(new FormData(form).entries());
}

function updateCompleteness() {
  const fields = readForm();
  state.fieldsByType[state.type] = fields;
  const required = FIELD_DEFINITIONS[state.type].filter((field) => field[3]);
  const filled = required.filter((field) => String(fields[field[0]] || "").trim()).length;
  document.getElementById("draft-completeness").textContent = `${filled} / ${required.length} 必填`;
  document.getElementById("draft-completeness").dataset.complete = String(filled === required.length);
}

function markdownToHtml(markdown) {
  const lines = markdown.split("\n");
  const output = [];
  let inList = false;
  for (const line of lines) {
    if (line.startsWith("- ")) {
      if (!inList) {
        output.push("<ul>");
        inList = true;
      }
      output.push(`<li>${escapeHtml(line.slice(2))}</li>`);
      continue;
    }
    if (inList) {
      output.push("</ul>");
      inList = false;
    }
    if (/^###\s/.test(line)) output.push(`<h4>${escapeHtml(line.replace(/^###\s/, ""))}</h4>`);
    else if (/^##\s/.test(line)) output.push(`<h3>${escapeHtml(line.replace(/^##\s/, ""))}</h3>`);
    else if (/^#\s/.test(line)) output.push(`<h2>${escapeHtml(line.replace(/^#\s/, ""))}</h2>`);
    else if (line.startsWith("> ")) output.push(`<blockquote>${escapeHtml(line.slice(2))}</blockquote>`);
    else if (line.trim()) output.push(`<p>${escapeHtml(line)}</p>`);
  }
  if (inList) output.push("</ul>");
  return output.join("");
}

function generateDraft() {
  const form = document.getElementById("draft-form");
  if (!form.reportValidity()) {
    showToast("请先补齐标记为必填的事实信息。", "warning");
    return;
  }
  const fields = readForm();
  state.fieldsByType[state.type] = fields;
  const warnings = draftingWarnings(fields, state.type);
  const markdown = DRAFT_GENERATORS[state.type](fields);
  state.outputs[state.type] = markdown;
  state.activeDraftId = null;
  document.getElementById("draft-output").innerHTML = markdownToHtml(markdown);
  document.getElementById("draft-warning-list").innerHTML = warnings.length
    ? warnings.map((key) => {
      const label = FIELD_DEFINITIONS[state.type].find((field) => field[0] === key)?.[1] || key;
      return `<span>! ${escapeHtml(label)}仍待补充</span>`;
    }).join("")
    : '<span class="ready">必填事实信息已填写，仍需人工核对原始证据</span>';
  document.getElementById("draft-save-status").textContent = "草稿已生成，尚未保存";
  updateCompleteness();
}

function renderContextDocuments() {
  const relevant = state.documents.filter((document) => CONTEXT_CATEGORIES[state.type].includes(document.category));
  const container = document.getElementById("context-file-list");
  container.innerHTML = relevant.length
    ? relevant.slice(0, 12).map((document) => `
      <a href="audit.html?document=${encodeURIComponent(document.id)}">
        <span class="file-badge">${escapeHtml((document.extension || "?").toUpperCase().slice(0, 4))}</span>
        <div><strong>${escapeHtml(document.name)}</strong><small>${escapeHtml(document.category)}</small></div>
        <b>→</b>
      </a>
    `).join("")
    : '<p class="muted-copy">当前资料库没有与本文书直接相关的文件，请先在审核页导入。</p>';
}

function insertEvidenceIndex() {
  const relevant = state.documents.filter((document) => CONTEXT_CATEGORIES[state.type].includes(document.category));
  if (!relevant.length) {
    showToast("资料库中没有可引用的关联文件。", "warning");
    return;
  }
  const index = relevant.map((document) => `- ${document.name}（${document.category}，ID: ${document.id.slice(0, 8)}）`).join("\n");
  const field = document.querySelector('[name="evidenceIndex"]');
  field.value = index;
  state.fieldsByType[state.type].evidenceIndex = index;
  showToast(`已插入 ${relevant.length} 个证据文件索引。`, "success");
}

async function saveCurrentDraft() {
  if (!state.outputs[state.type]) generateDraft();
  if (!state.outputs[state.type]) return;
  const fields = readForm();
  const record = await saveDraft({
    id: state.activeDraftId || undefined,
    type: state.type,
    title: fields.projectName || fields.productName || fields.achievementName || DRAFT_LABELS[state.type],
    fields,
    content: state.outputs[state.type]
  });
  state.activeDraftId = record.id;
  document.getElementById("draft-save-status").textContent = "已保存到当前浏览器";
  await loadSavedDrafts();
  showToast("草稿已保存。", "success");
}

async function loadSavedDrafts() {
  state.drafts = await listDrafts();
  const container = document.getElementById("saved-drafts");
  container.innerHTML = state.drafts.length
    ? state.drafts.map((draft) => `
      <article class="saved-draft" data-draft-id="${escapeHtml(draft.id)}">
        <span>${escapeHtml(draft.type.toUpperCase())}</span>
        <div><strong>${escapeHtml(draft.title || DRAFT_LABELS[draft.type])}</strong><small>${escapeHtml(DRAFT_LABELS[draft.type])} · ${formatDate(draft.updatedAt, true)}</small></div>
        <button type="button" data-action="load">继续编辑</button>
        <button type="button" data-action="delete" aria-label="删除草稿">×</button>
      </article>
    `).join("")
    : '<div class="empty-inline"><strong>还没有保存草稿</strong><span>生成并检查内容后，可保存到本机继续修改。</span></div>';
}

function switchType(type) {
  state.type = type;
  state.activeDraftId = null;
  document.querySelectorAll("[data-draft-type]").forEach((button) => {
    const active = button.dataset.draftType === type;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  renderForm();
  if (state.outputs[type]) {
    document.getElementById("draft-output").innerHTML = markdownToHtml(state.outputs[type]);
  } else {
    document.getElementById("draft-output").innerHTML = `
      <div class="draft-placeholder">
        <span>写</span><h3>先填写左侧事实信息</h3>
        <p>点击“生成草稿”后，系统将按当前文书对应结构生成可编辑内容。</p>
      </div>
    `;
  }
}

async function init() {
  document.getElementById("protocol-warning")?.remove();
  setupShell("draft");
  state.documents = await listDocuments();
  state.profile = await getProfile();
  fillCommonFields();
  renderForm();
  await loadSavedDrafts();

  document.getElementById("draft-form").addEventListener("input", updateCompleteness);
  document.getElementById("generate-draft").addEventListener("click", generateDraft);
  document.getElementById("save-draft").addEventListener("click", saveCurrentDraft);
  document.getElementById("insert-evidence-index").addEventListener("click", insertEvidenceIndex);
  document.getElementById("copy-draft").addEventListener("click", async () => {
    const content = state.outputs[state.type];
    if (!content) return showToast("请先生成草稿。", "warning");
    try {
      await navigator.clipboard.writeText(content);
      showToast("草稿内容已复制。", "success");
    } catch {
      showToast("浏览器未允许访问剪贴板，请使用导出文件。", "warning");
    }
  });
  document.getElementById("download-draft").addEventListener("click", () => {
    const content = state.outputs[state.type];
    if (!content) return showToast("请先生成草稿。", "warning");
    downloadText(`${DRAFT_LABELS[state.type]}-${new Date().toISOString().slice(0, 10)}.md`, content);
    showToast("草稿已导出。", "success");
  });
  document.querySelector(".draft-type-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-draft-type]");
    if (button) switchType(button.dataset.draftType);
  });
  document.getElementById("saved-drafts").addEventListener("click", async (event) => {
    const article = event.target.closest("[data-draft-id]");
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!article || !action) return;
    const draft = state.drafts.find((item) => item.id === article.dataset.draftId);
    if (action === "delete") {
      if (!window.confirm("确认删除此草稿？")) return;
      await deleteDraft(article.dataset.draftId);
      await loadSavedDrafts();
      showToast("草稿已删除。");
      return;
    }
    state.type = draft.type;
    state.fieldsByType[draft.type] = draft.fields;
    state.outputs[draft.type] = draft.content;
    switchType(draft.type);
    state.activeDraftId = draft.id;
    document.getElementById("draft-output").innerHTML = markdownToHtml(draft.content);
    document.getElementById("draft-save-status").textContent = "已加载保存草稿";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

document.addEventListener("DOMContentLoaded", init);
