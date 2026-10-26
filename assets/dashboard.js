import { auditWorkspace, seedDemoWorkspace, listDocuments, clearWorkspace } from "./workspace.js";
import { CATEGORY_DEFINITIONS } from "./workspace-core.mjs";
import { setupShell, showToast, escapeHtml, formatDate } from "./ui.js";

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function categoryLabel(id) {
  return CATEGORY_DEFINITIONS.find((item) => item.id === id)?.label || "待分类";
}

function renderRecent(documents) {
  const container = document.getElementById("recent-list");
  if (!documents.length) return;
  const recent = [...documents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  container.innerHTML = recent.map((document) => `
    <a class="recent-row" href="audit.html?document=${encodeURIComponent(document.id)}">
      <span class="file-badge">${escapeHtml((document.extension || "?").toUpperCase().slice(0, 4))}</span>
      <span class="recent-file">
        <strong>${escapeHtml(document.name)}</strong>
        <small>${escapeHtml(categoryLabel(document.category))} · ${formatDate(document.createdAt, true)}</small>
      </span>
      <span class="recent-status status-${escapeHtml(document.status)}">${document.status === "parsed" ? "已解析" : document.status === "needs_ocr" ? "待 OCR" : "待处理"}</span>
      <span aria-hidden="true">→</span>
    </a>
  `).join("");
}

async function refresh() {
  const { documents, audit, profile } = await auditWorkspace();
  const score = audit.score;
  setText("metric-score", score);
  const small = document.querySelector("#metric-score small");
  if (small) small.textContent = "/100";
  setText("metric-readiness", audit.readiness);
  setText("metric-docs", documents.length);
  setText("metric-parsed", documents.length
    ? `${audit.stats.parsed} 个已成功抽取文字`
    : "尚未上传文件");
  setText("metric-categories", audit.stats.categoriesCovered);
  const categorySmall = document.querySelector("#metric-categories small");
  if (categorySmall) categorySmall.textContent = `/${audit.stats.categoriesRequired}`;
  setText("metric-missing", audit.stats.categoriesCovered === audit.stats.categoriesRequired
    ? "全部必要类别已有文件"
    : `${audit.missing.length} 个必要类别待补充`);
  setText("metric-risks", audit.findings.length);
  setText("metric-high-risk", audit.stats.highRiskCount
    ? `${audit.stats.highRiskCount} 项高风险待处理`
    : "暂无高风险提示");
  setText("preview-score", documents.length ? score : "—");
  setText("preview-files", documents.length);
  setText("preview-missing", documents.length ? audit.missing.length : "—");
  setText("readiness-title", audit.readiness);
  setText("readiness-copy", documents.length
    ? `已导入 ${documents.length} 个文件，完成 ${audit.stats.categoriesCovered}/${audit.stats.categoriesRequired} 个必要类别。`
    : "导入文件后自动生成结构审核结果。");
  const bar = document.getElementById("readiness-bar");
  bar.style.width = `${documents.length ? score : 0}%`;
  document.querySelectorAll("#next-steps li").forEach((item, index) => {
    item.classList.toggle("is-current", documents.length ? index === 1 : index === 0);
    item.classList.toggle("is-done", documents.length ? index === 0 : false);
  });
  renderRecent(documents);
  return { documents, profile };
}

async function loadDemo() {
  const button = document.getElementById("load-demo");
  button.disabled = true;
  button.textContent = "正在建立演示工作区…";
  try {
    const existing = await listDocuments();
    if (existing.length) {
      const confirmed = window.confirm("当前工作区已有资料。演示文件会追加到现有资料中，是否继续？");
      if (!confirmed) return;
    }
    const result = await seedDemoWorkspace();
    showToast(`已导入 ${result.added.length} 个虚构演示文件。`);
    await refresh();
    window.location.href = "audit.html";
  } catch (error) {
    showToast(`演示资料加载失败：${error.message}`, "error");
  } finally {
    button.disabled = false;
    button.textContent = "加载演示资料";
  }
}

function setupClearShortcut() {
  document.addEventListener("keydown", async (event) => {
    if (!(event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "x")) return;
    if (!window.confirm("这是本地数据清理快捷键。确认删除全部资料、企业指标和草稿？")) return;
    await clearWorkspace();
    await refresh();
    showToast("本机工作区数据已清空。");
  });
}

async function init() {
  document.getElementById("protocol-warning")?.remove();
  setupShell("dashboard");
  setupClearShortcut();
  document.getElementById("load-demo").addEventListener("click", loadDemo);
  try {
    await refresh();
  } catch (error) {
    showToast(`读取本地工作区失败：${error.message}`, "error");
  }
}

document.addEventListener("DOMContentLoaded", init);
