import {
  auditWorkspace,
  updateDocument,
  getDocument
} from "./workspace.js";
import {
  CATEGORY_DEFINITIONS,
  classifyDocument,
  suggestedDocumentName,
  makeOrganizationMarkdown
} from "./workspace-core.mjs";
import { setupShell, showToast, escapeHtml, statusLabel, downloadText } from "./ui.js";

const state = {
  documents: [],
  audit: null,
  filter: "",
  search: ""
};

function categoryById(id) {
  return CATEGORY_DEFINITIONS.find((item) => item.id === id);
}

function filtered() {
  const query = state.search.trim().toLowerCase();
  return state.documents.filter((document) => {
    if (state.filter === "revenue") return ["contract", "finance", "tax"].includes(document.category);
    if (state.filter === "ps") return ["product", "contract"].includes(document.category);
    if (state.filter && document.category !== state.filter) return false;
    if (query && !`${document.name}\n${document.sourcePath || ""}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

function categoryOptions(selected) {
  return CATEGORY_DEFINITIONS.map((category) =>
    `<option value="${category.id}" ${category.id === selected ? "selected" : ""}>${escapeHtml(category.label)}</option>`
  ).join("");
}

function renderCategoryRail() {
  const container = document.getElementById("category-list");
  container.innerHTML = CATEGORY_DEFINITIONS
    .filter((category) => category.id !== "other")
    .map((category) => `
      <button type="button" data-filter="${category.id}" class="${state.filter === category.id ? "is-active" : ""}">
        <span>${escapeHtml(category.icon)}</span>
        <strong>${escapeHtml(category.label)}</strong>
        <b>${state.documents.filter((document) => document.category === category.id).length}</b>
      </button>
    `).join("");
  document.querySelector(".rail-all")?.classList.toggle("is-active", !state.filter);
  document.getElementById("rail-all-count").textContent = state.documents.length;
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.filter);
  });
}

function renderSummary() {
  document.getElementById("organizer-total").textContent = state.documents.length;
  document.getElementById("organizer-categories").textContent = `${state.audit?.stats.categoriesCovered || 0} / 11`;
  document.getElementById("organizer-other").textContent = state.documents.filter((document) => document.category === "other").length;
  document.getElementById("organizer-findings").textContent = state.audit?.findings.length || 0;
  document.getElementById("chain-ip").textContent = `${state.documents.filter((document) => document.category === "ip").length} 个文件`;
  document.getElementById("chain-rd").textContent = `${state.documents.filter((document) => document.category === "rd").length} 个文件`;
  document.getElementById("chain-ps").textContent = `${state.documents.filter((document) => document.category === "product").length} 个文件`;
  document.getElementById("chain-revenue").textContent = `${state.documents.filter((document) => ["contract", "finance", "tax"].includes(document.category)).length} 个文件`;

  const missing = document.getElementById("missing-list");
  missing.innerHTML = state.audit?.missing.length
    ? state.audit.missing.map((category) => `
      <button type="button" data-missing="${category.id}">
        <span>!</span><div><strong>${escapeHtml(category.label)}</strong><small>${escapeHtml(category.description)}</small></div><b>→</b>
      </button>
    `).join("")
    : '<p class="all-covered">全部必要类别都已有文件，请继续核对内容质量。</p>';
}

function renderGroups() {
  const documents = filtered();
  const container = document.getElementById("organizer-groups");
  const title = state.filter ? categoryById(state.filter)?.label || "收入与财务" : "全部资料";
  document.getElementById("organizer-title").textContent = title;
  document.getElementById("organizer-copy").textContent = documents.length
    ? `${documents.length} 个文件；命名建议可随整理方案导出。`
    : "当前筛选下没有文件。";

  if (!documents.length) {
    container.innerHTML = '<div class="empty-state compact-empty"><span>⌕</span><h3>没有匹配的文件</h3><p>调整筛选或到资料审核页继续导入。</p></div>';
    return;
  }

  const grouped = new Map();
  documents.forEach((document) => {
    if (!grouped.has(document.category)) grouped.set(document.category, []);
    grouped.get(document.category).push(document);
  });
  const ordered = [...grouped.entries()].sort(([a], [b]) => {
    const indexA = CATEGORY_DEFINITIONS.findIndex((category) => category.id === a);
    const indexB = CATEGORY_DEFINITIONS.findIndex((category) => category.id === b);
    return indexA - indexB;
  });

  container.innerHTML = ordered.map(([categoryId, items]) => {
    const category = categoryById(categoryId) || categoryById("other");
    return `
      <section class="organizer-group">
        <header>
          <span class="group-icon">${escapeHtml(category.icon)}</span>
          <div><h3>${escapeHtml(category.label)}</h3><p>${escapeHtml(category.description)}</p></div>
          <b>${items.length}</b>
        </header>
        <div class="organized-files">
          ${items.map((document) => `
            <article class="organized-file" data-id="${escapeHtml(document.id)}">
              <span class="file-badge">${escapeHtml((document.extension || "?").toUpperCase().slice(0, 4))}</span>
              <div class="organized-file-main">
                <strong>${escapeHtml(document.name)}</strong>
                <span>${escapeHtml(suggestedDocumentName(document))}</span>
                <small>${escapeHtml(statusLabel(document.status))} · ${Math.round((document.classification?.confidence || 0) * 100)}% 分类置信度</small>
              </div>
              <select data-action="reclassify" aria-label="重新分类 ${escapeHtml(document.name)}">${categoryOptions(document.category)}</select>
              <a class="mini-link" href="audit.html?document=${encodeURIComponent(document.id)}">审核</a>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }).join("");
}

async function refresh() {
  const workspace = await auditWorkspace();
  state.documents = workspace.documents;
  state.audit = workspace.audit;
  renderSummary();
  renderCategoryRail();
  renderGroups();
}

async function autoOrganize() {
  if (!state.documents.length) {
    showToast("请先导入资料。", "warning");
    return;
  }
  const button = document.getElementById("auto-organize");
  button.disabled = true;
  button.textContent = "正在重新分类…";
  try {
    let changed = 0;
    for (const document of state.documents) {
      const result = classifyDocument({
        name: document.name,
        path: document.sourcePath || "",
        text: document.text || ""
      });
      if (result.category !== document.category) {
        await updateDocument(document.id, { category: result.category, classification: result });
        changed += 1;
      }
    }
    await refresh();
    showToast(`重新分类完成，${changed} 个文件类别发生变化。`, "success");
  } finally {
    button.disabled = false;
    button.textContent = "自动重新分类";
  }
}

function exportCsv() {
  const header = ["原文件名", "建议文件名", "材料类别", "解析状态", "分类置信度", "来源路径"];
  const rows = state.documents.map((document) => [
    document.name,
    suggestedDocumentName(document),
    categoryById(document.category)?.label || "待分类",
    statusLabel(document.status),
    `${Math.round((document.classification?.confidence || 0) * 100)}%`,
    document.sourcePath || ""
  ]);
  const csv = "\ufeff" + [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
  downloadText(`高企资料整理表-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
  showToast("整理表已导出。", "success");
}

function exportPlan() {
  const markdown = makeOrganizationMarkdown(state.documents, state.audit);
  downloadText(`高企资料整理方案-${new Date().toISOString().slice(0, 10)}.md`, markdown);
  showToast("整理方案已导出。", "success");
}

async function init() {
  document.getElementById("protocol-warning")?.remove();
  setupShell("organizer");
  document.getElementById("auto-organize").addEventListener("click", autoOrganize);
  document.getElementById("export-csv").addEventListener("click", exportCsv);
  document.getElementById("export-plan").addEventListener("click", exportPlan);
  document.getElementById("organizer-search").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderGroups();
  });
  document.querySelector(".category-rail").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.filter = button.dataset.filter;
    renderCategoryRail();
    renderGroups();
  });
  document.getElementById("missing-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-missing]");
    if (!button) return;
    state.filter = button.dataset.missing;
    renderCategoryRail();
    renderGroups();
  });
  document.getElementById("organizer-groups").addEventListener("change", async (event) => {
    const select = event.target.closest('[data-action="reclassify"]');
    if (!select) return;
    const article = select.closest("[data-id]");
    await updateDocument(article.dataset.id, {
      category: select.value,
      classification: { category: select.value, confidence: 1, alternatives: [], matchedKeywords: ["人工确认"] }
    });
    await refresh();
    showToast("文件归类已更新。", "success");
  });
  await refresh();
}

document.addEventListener("DOMContentLoaded", init);
