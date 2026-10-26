import {
  auditWorkspace,
  importFiles,
  getDocument,
  updateDocument,
  deleteDocument,
  removeAllDocuments,
  saveProfile,
  listDocuments
} from "./workspace.js";
import { CATEGORY_DEFINITIONS, documentQuality } from "./workspace-core.mjs";
import {
  setupShell,
  showToast,
  escapeHtml,
  formatDate,
  statusLabel,
  downloadText
} from "./ui.js";

const state = {
  documents: [],
  audit: null,
  profile: null,
  filter: "",
  search: "",
  activeDocumentId: null
};

function categoryLabel(id) {
  return CATEGORY_DEFINITIONS.find((item) => item.id === id)?.label || "待分类";
}

function categoryOptions(selected = "") {
  return CATEGORY_DEFINITIONS.map((category) =>
    `<option value="${escapeHtml(category.id)}" ${category.id === selected ? "selected" : ""}>${escapeHtml(category.label)}</option>`
  ).join("");
}

function severityLabel(severity) {
  return severity === "high" ? "高" : severity === "medium" ? "中" : "低";
}

function fillProfile(profile) {
  const form = document.getElementById("profile-form");
  if (!profile) return;
  Object.entries(profile).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);
    if (field) field.value = value;
  });
}

function renderProfileResult(eligibility) {
  const container = document.getElementById("profile-result");
  const status = document.getElementById("profile-status");
  if (!eligibility) {
    container.innerHTML = "";
    status.textContent = "未填写";
    return;
  }
  status.textContent = eligibility.hardGateReady ? "门槛已通过" : `${eligibility.failed} 项待处理`;
  status.dataset.tone = eligibility.hardGateReady ? "pass" : "fail";
  container.innerHTML = `
    <div class="profile-result-title">${eligibility.hardGateReady ? "硬门槛初筛通过" : `发现 ${eligibility.failed} 项未达门槛`}</div>
    <div class="profile-checks">
      ${eligibility.checks.map((item) => `
        <span class="${item.pass ? "pass" : "fail"}"><i>${item.pass ? "✓" : "!"}</i>${escapeHtml(item.label)}</span>
      `).join("")}
    </div>
  `;
}

function renderAudit(workspace) {
  const { audit, eligibility } = workspace;
  document.getElementById("audit-score").textContent = audit.score;
  const ring = document.getElementById("audit-score-ring");
  ring.style.setProperty("--score-angle", `${audit.score * 3.6}deg`);
  document.getElementById("audit-readiness").textContent = audit.readiness;
  document.getElementById("audit-readiness-copy").textContent = audit.stats.total
    ? `已识别 ${audit.stats.total} 个文件，${audit.stats.parsed} 个成功抽取文字。${audit.disclaimer}`
    : "系统将检查必要类别、解析状态、企业指标、重复文件和敏感信息。";
  document.getElementById("coverage-text").textContent = `${audit.stats.categoriesCovered} / ${audit.stats.categoriesRequired}`;
  document.getElementById("coverage-bar").style.width = `${(audit.stats.categoriesCovered / audit.stats.categoriesRequired) * 100}%`;
  document.getElementById("stat-high").textContent = audit.stats.highRiskCount;
  document.getElementById("stat-medium").textContent = audit.stats.mediumRiskCount;
  document.getElementById("stat-ocr").textContent = audit.stats.needsOcr;
  document.getElementById("finding-count").textContent = audit.findings.length;

  const findings = document.getElementById("finding-list");
  findings.innerHTML = audit.findings.length
    ? audit.findings.map((finding) => `
      <article class="finding-item finding-${escapeHtml(finding.severity)}">
        <div class="finding-title">
          <span>${severityLabel(finding.severity)}</span>
          <strong>${escapeHtml(finding.title)}</strong>
        </div>
        <p>${escapeHtml(finding.detail)}</p>
        <div class="finding-action"><b>建议</b>${escapeHtml(finding.action)}</div>
      </article>
    `).join("")
    : '<div class="finding-empty">当前没有识别到需要提示的问题。仍须进行人工终审。</div>';
  renderProfileResult(eligibility);
}

function filteredDocuments() {
  const query = state.search.trim().toLowerCase();
  return state.documents.filter((document) => {
    if (state.filter && document.category !== state.filter) return false;
    if (!query) return true;
    return `${document.name}\n${document.text || ""}`.toLowerCase().includes(query);
  });
}

function renderDocuments() {
  const documents = filteredDocuments();
  document.getElementById("document-count").textContent = state.documents.length;
  const container = document.getElementById("document-list");
  if (!documents.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span>${state.documents.length ? "⌕" : "0"}</span>
        <h3>${state.documents.length ? "没有匹配的文件" : "还没有资料文件"}</h3>
        <p>${state.documents.length ? "调整搜索词或类别筛选。" : "在上方选择文件、整个文件夹或 ZIP 压缩包。"}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = documents.map((document) => {
    const quality = documentQuality(document);
    return `
      <article class="document-row" data-document-id="${escapeHtml(document.id)}">
        <span class="file-badge file-${escapeHtml(document.extension)}">${escapeHtml((document.extension || "?").toUpperCase().slice(0, 4))}</span>
        <div class="document-main">
          <button class="document-name" type="button" data-action="open">${escapeHtml(document.name)}</button>
          <div class="document-subline">
            <span>${escapeHtml(categoryLabel(document.category))}</span>
            <span>${escapeHtml(statusLabel(document.status))}</span>
            <span>${Math.round((document.classification?.confidence || 0) * 100)}% 分类置信度</span>
            <span>${formatDate(document.createdAt, true)}</span>
          </div>
          ${quality.length ? `<p class="document-warning">${escapeHtml(quality[0])}</p>` : ""}
        </div>
        <select class="inline-category" data-action="category" aria-label="修改 ${escapeHtml(document.name)} 的类别">
          ${categoryOptions(document.category)}
        </select>
        <button class="icon-button" type="button" data-action="open" aria-label="查看 ${escapeHtml(document.name)}">查看</button>
      </article>
    `;
  }).join("");
}

function renderCategoryFilter() {
  const select = document.getElementById("category-filter");
  const current = select.value;
  select.innerHTML = `<option value="">全部类别</option>${CATEGORY_DEFINITIONS.map((category) => `
    <option value="${escapeHtml(category.id)}">${escapeHtml(category.label)} (${state.documents.filter((document) => document.category === category.id).length})</option>
  `).join("")}`;
  select.value = current;
}

async function refresh() {
  const workspace = await auditWorkspace();
  state.documents = workspace.documents;
  state.audit = workspace.audit;
  state.profile = workspace.profile;
  fillProfile(workspace.profile);
  renderAudit(workspace);
  renderCategoryFilter();
  renderDocuments();
  return workspace;
}

function setUploadProgress(progress) {
  const panel = document.getElementById("upload-progress");
  panel.hidden = false;
  document.getElementById("upload-stage").textContent = progress.stage;
  document.getElementById("upload-name").textContent = progress.name;
  document.getElementById("upload-count").textContent = `${progress.index} / ${progress.total}`;
  document.getElementById("upload-bar").style.width = `${progress.total ? (progress.index / progress.total) * 100 : 0}%`;
}

async function handleFiles(fileList) {
  if (!fileList?.length) return;
  document.getElementById("upload-progress").hidden = false;
  try {
    const result = await importFiles(fileList, setUploadProgress);
    const messages = [`导入 ${result.added.length} 个文件`];
    if (result.duplicates.length) messages.push(`跳过 ${result.duplicates.length} 个重复文件`);
    if (result.errors.length) messages.push(`${result.errors.length} 个失败`);
    showToast(messages.join("，"), result.errors.length ? "warning" : "success");
    if (result.errors.length) {
      console.warn("文件导入问题", result.errors);
      document.getElementById("import-errors").hidden = false;
      document.getElementById("import-error-list").innerHTML = result.errors
        .map((error) => `<li><strong>${escapeHtml(error.name)}</strong><span>${escapeHtml(error.message)}</span></li>`)
        .join("");
    } else {
      document.getElementById("import-errors").hidden = true;
    }
    await refresh();
  } catch (error) {
    showToast(`导入失败：${error.message}`, "error");
  } finally {
    window.setTimeout(() => {
      document.getElementById("upload-progress").hidden = true;
      document.getElementById("upload-bar").style.width = "0";
    }, 1200);
  }
}

async function openDocument(id) {
  const document = await getDocument(id);
  if (!document) {
    showToast("文件已被删除。", "warning");
    return;
  }
  state.activeDocumentId = id;
  document.getElementById("dialog-ext").textContent = (document.extension || "FILE").toUpperCase();
  document.getElementById("dialog-title").textContent = document.name;
  document.getElementById("dialog-meta").innerHTML = `
    <span>${escapeHtml(categoryLabel(document.category))}</span>
    <span>${escapeHtml(formatDate(document.createdAt, true))}</span>
    <span>${escapeHtml(statusLabel(document.status))}</span>
    <span>${Math.round((document.classification?.confidence || 0) * 100)}% 置信度</span>
  `;
  document.getElementById("dialog-category").innerHTML = categoryOptions(document.category);
  document.getElementById("dialog-parse-note").textContent = document.extractionMessage || "";
  document.getElementById("dialog-text").textContent = document.text
    ? document.text.slice(0, 60000)
    : "未能抽取文字。请使用 OCR 或将文件转换为可解析格式后重新上传。";
  const signals = document.signals || {};
  const chips = [
    ...(signals.codes || []).map((value) => `编号 ${value}`),
    ...(signals.creditCodes || []).map((value) => `信用代码 ${value}`),
    ...(document.sensitivity || []).map((value) => `敏感：${value}`)
  ];
  document.getElementById("dialog-signals").innerHTML = chips.length
    ? chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("")
    : '<span class="muted-chip">未识别到结构化编号或敏感标记</span>';
  document.getElementById("document-dialog").showModal();
}

async function saveActiveCategory() {
  if (!state.activeDocumentId) return;
  const category = document.getElementById("dialog-category").value;
  await updateDocument(state.activeDocumentId, {
    category,
    classification: {
      category,
      confidence: 1,
      alternatives: [],
      matchedKeywords: ["人工确认"]
    }
  });
  document.getElementById("document-dialog").close();
  showToast("文件类别已人工确认。", "success");
  await refresh();
}

function currentReport() {
  const lines = [
    "# 高企申报资料审核报告",
    "",
    `- 生成时间：${new Date().toLocaleString("zh-CN")}`,
    `- 结构审核分：${state.audit?.score || 0} / 100`,
    `- 当前状态：${state.audit?.readiness || "未审核"}`,
    `- 文件数量：${state.documents.length}`,
    "",
    "> 本报告是开源工具的结构与风险辅助审核，不构成官方认定结论。",
    "",
    "## 审核发现",
    ""
  ];
  if (!state.audit?.findings.length) lines.push("暂无自动发现。仍需人工终审。");
  state.audit?.findings.forEach((finding) => {
    lines.push(`### [${severityLabel(finding.severity)}风险] ${finding.title}`, "", finding.detail, "", `建议：${finding.action}`, "");
  });
  lines.push("## 文件清单", "");
  state.documents.forEach((document) => {
    lines.push(`- [${document.status === "parsed" ? "x" : " "}] ${categoryLabel(document.category)}｜${document.name}｜${statusLabel(document.status)}`);
  });
  return lines.join("\n");
}

async function init() {
  document.getElementById("protocol-warning")?.remove();
  setupShell("audit");
  document.getElementById("choose-files").addEventListener("click", () => document.getElementById("file-input").click());
  document.getElementById("choose-folder").addEventListener("click", () => document.getElementById("folder-input").click());
  document.getElementById("file-input").addEventListener("change", (event) => {
    handleFiles(event.target.files);
    event.target.value = "";
  });
  document.getElementById("folder-input").addEventListener("change", (event) => {
    handleFiles(event.target.files);
    event.target.value = "";
  });

  const dropzone = document.getElementById("dropzone");
  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
    });
  });
  dropzone.addEventListener("drop", (event) => handleFiles(event.dataTransfer.files));

  document.getElementById("document-search").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderDocuments();
  });
  document.getElementById("category-filter").addEventListener("change", (event) => {
    state.filter = event.target.value;
    renderDocuments();
  });

  document.getElementById("document-list").addEventListener("click", (event) => {
    const row = event.target.closest("[data-document-id]");
    if (!row) return;
    if (event.target.closest('[data-action="open"]')) openDocument(row.dataset.documentId);
  });
  document.getElementById("document-list").addEventListener("change", async (event) => {
    const select = event.target.closest('[data-action="category"]');
    if (!select) return;
    const row = select.closest("[data-document-id]");
    await updateDocument(row.dataset.documentId, {
      category: select.value,
      classification: { category: select.value, confidence: 1, alternatives: [], matchedKeywords: ["人工确认"] }
    });
    showToast("分类已更新。", "success");
    await refresh();
  });

  document.getElementById("profile-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const profile = Object.fromEntries(new FormData(event.currentTarget).entries());
    await saveProfile(profile);
    showToast("企业指标已保存，审核结果已更新。", "success");
    await refresh();
  });

  document.getElementById("audit-now").addEventListener("click", async () => {
    await refresh();
    showToast("已完成重新审核。", "success");
  });
  document.getElementById("export-audit").addEventListener("click", () => {
    downloadText(`高企资料审核报告-${new Date().toISOString().slice(0, 10)}.md`, currentReport());
    showToast("审核报告已导出。", "success");
  });
  document.getElementById("clear-documents").addEventListener("click", async () => {
    if (!state.documents.length) return showToast("当前没有资料文件。", "warning");
    if (!window.confirm("确认删除全部资料文件？企业指标和草稿会保留，此操作不可撤销。")) return;
    await removeAllDocuments();
    await refresh();
    showToast("资料文件已清空。");
  });

  document.getElementById("dialog-close").addEventListener("click", () => document.getElementById("document-dialog").close());
  document.getElementById("dialog-save-category").addEventListener("click", saveActiveCategory);
  document.getElementById("dialog-download").addEventListener("click", async () => {
    const document = await getDocument(state.activeDocumentId);
    if (!document?.blob) return;
    const url = URL.createObjectURL(document.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = document.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.getElementById("dialog-delete").addEventListener("click", async () => {
    if (!state.activeDocumentId || !window.confirm("确认删除此文件？")) return;
    await deleteDocument(state.activeDocumentId);
    document.getElementById("document-dialog").close();
    await refresh();
    showToast("文件已删除。");
  });
  document.getElementById("document-dialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });

  await refresh();
  if (!state.profile) document.getElementById("profile-details").open = true;
  const params = new URLSearchParams(window.location.search);
  if (params.get("document")) openDocument(params.get("document"));
}

document.addEventListener("DOMContentLoaded", init);
