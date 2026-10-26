(function () {
  "use strict";

  const engine = window.HNTEEngine;
  const guide = window.HNTEGuide;
  const STORAGE_KEY = "hnte-guide-checklist-v1";
  const state = {
    checked: loadChecklist(),
    eligibility: null,
    score: null
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatPercent(value) {
    return value === null || !Number.isFinite(value) ? "无法计算" : `${(value * 100).toFixed(2)}%`;
  }

  function loadChecklist() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  function saveChecklist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.checked));
    } catch {
      showToast("浏览器阻止了本地存储，本次勾选仅在当前页面有效。");
    }
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 3200);
  }

  function renderConditions() {
    const container = document.getElementById("conditions-grid");
    container.innerHTML = guide.conditions.map((item) => `
      <article class="condition-card">
        <span class="condition-number">${escapeHtml(item.number)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.requirement)}</p>
        <div class="condition-detail">
          <span>核心佐证</span>
          <p>${escapeHtml(item.evidence)}</p>
        </div>
        <div class="condition-warning">${escapeHtml(item.warning)}</div>
      </article>
    `).join("");
  }

  function renderProcess() {
    const container = document.getElementById("process-list");
    container.innerHTML = guide.process.map((item, index) => `
      <li class="process-step">
        <span class="step-phase">${escapeHtml(item.phase)}</span>
        <span class="step-index">${String(index + 1).padStart(2, "0")}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
        <div class="step-output">${escapeHtml(item.output)}</div>
      </li>
    `).join("");
  }

  function renderRisks() {
    const container = document.getElementById("risk-grid");
    container.innerHTML = guide.pitfalls.map((item) => `
      <article class="risk-card" data-severity="${escapeHtml(item.severity)}">
        <span class="risk-level">${escapeHtml(item.severity)}风险</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.issue)}</p>
        <div class="risk-action">
          <span>建议动作</span>
          <p>${escapeHtml(item.action)}</p>
        </div>
      </article>
    `).join("");
  }

  function renderSchedule() {
    const container = document.getElementById("schedule-list");
    container.innerHTML = guide.schedule.map((item) => `
      <article class="schedule-item">
        <div class="schedule-window">${escapeHtml(item.window)}</div>
        <h3>${escapeHtml(item.title)}</h3>
        <ul class="schedule-tasks">
          ${item.tasks.map((task) => `<li>${escapeHtml(task)}</li>`).join("")}
        </ul>
      </article>
    `).join("");
  }

  function renderSources() {
    const container = document.getElementById("source-list");
    container.innerHTML = guide.sources.map((item, index) => `
      <a class="source-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
        <span class="source-index">${String(index + 1).padStart(2, "0")}</span>
        <span>
          <strong>${escapeHtml(item.label)}</strong>
          <small>${escapeHtml(item.note)}</small>
        </span>
        <span aria-hidden="true">↗</span>
      </a>
    `).join("");
  }

  function materialKey(categoryId, itemIndex) {
    return `${categoryId}-${itemIndex}`;
  }

  function renderMaterials() {
    const container = document.getElementById("materials-grid");
    container.innerHTML = guide.materials.map((category) => `
      <section class="material-card" aria-labelledby="material-${escapeHtml(category.id)}">
        <header>
          <h3 id="material-${escapeHtml(category.id)}">${escapeHtml(category.title)}</h3>
          <span class="material-tag">${escapeHtml(category.phase)}</span>
        </header>
        <div class="material-list">
          ${category.items.map((item, itemIndex) => {
            const key = materialKey(category.id, itemIndex);
            const checked = Boolean(state.checked[key]);
            return `
              <label class="check-row">
                <input type="checkbox" data-checklist-key="${escapeHtml(key)}" ${checked ? "checked" : ""}>
                <span>${escapeHtml(item)}</span>
              </label>
            `;
          }).join("")}
        </div>
      </section>
    `).join("");
    updateProgress();
  }

  function allMaterialItems() {
    return guide.materials.flatMap((category) =>
      category.items.map((item, itemIndex) => ({
        key: materialKey(category.id, itemIndex),
        title: item,
        category: category.title
      }))
    );
  }

  function updateProgress() {
    const items = allMaterialItems();
    const done = items.filter((item) => state.checked[item.key]).length;
    const percent = items.length ? Math.round((done / items.length) * 100) : 0;
    const ring = document.getElementById("progress-ring");
    document.getElementById("progress-percent").textContent = `${percent}%`;
    document.getElementById("progress-done").textContent = String(done);
    document.getElementById("progress-total").textContent = String(items.length);
    ring.style.setProperty("--progress", `${percent * 3.6}deg`);

    const copy = document.getElementById("progress-copy");
    if (done === 0) {
      copy.textContent = "尚未开始勾选。建议先完成资格自查，再按证据类别准备。";
    } else if (percent === 100) {
      copy.textContent = "清单已全部勾选，请继续核对材料真实性、一致性、签章和有效期。";
    } else if (percent >= 70) {
      copy.textContent = "主体材料已基本齐备，建议集中处理数据勾稽和高风险证据。";
    } else {
      copy.textContent = "材料正在准备中。优先完成核心 IP、研发费用和收入三类关键证据。";
    }
  }

  function formToObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function renderEligibility(result) {
    const container = document.getElementById("checker-result");
    const passCount = result.passed;
    const title = result.hardGateReady ? "硬门槛初筛通过" : `发现 ${result.failed} 项待处理`;
    const copy = result.hardGateReady
      ? "所有填报项均达到全国性规则门槛。下一步仍需核验创新评分、材料真实性和地方要求。"
      : "至少一项条件当前不成立或尚未确认。请先补齐缺口，再投入完整申报材料准备。";

    container.innerHTML = `
      <div class="result-content">
        <div class="result-summary">
          <div class="result-score">${passCount}/${result.checks.length}</div>
          <div>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(copy)}</p>
          </div>
        </div>
        <ul class="result-list">
          ${result.checks.map((item) => `
            <li class="result-item ${item.pass ? "is-pass" : "is-fail"}">
              <span class="result-icon">${item.pass ? "✓" : "!"}</span>
              <div>
                <strong>${escapeHtml(item.label)}</strong>
                <p>${escapeHtml(item.detail)}</p>
              </div>
            </li>
          `).join("")}
        </ul>
        <p class="result-caveat">此结果只做门槛初筛。创新能力评价仍须另算，且最终以认定机构审核为准。</p>
      </div>
    `;
  }

  function handleEligibilitySubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formToObject(form);
    const result = engine.assessEligibility(data);
    state.eligibility = { data, result };
    renderEligibility(result);
    document.querySelector(".checker-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function fillDemo() {
    const form = document.getElementById("eligibility-form");
    const values = {
      registeredOverYear: "yes",
      ownsCoreIp: "yes",
      coreIpSupportsProduct: "yes",
      inSupportedField: "yes",
      noMajorIncident: "yes",
      totalEmployees: "100",
      techEmployees: "20",
      latestSalesWan: "8000",
      salesWan: "18000",
      rdExpensesWan: "900",
      domesticRdWan: "810",
      highTechRevenueWan: "5200",
      totalRevenueWan: "8000"
    };

    Object.entries(values).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);
      if (field) field.value = value;
    });
    showToast("已填入用于演示的虚构数据，请替换为企业真实口径。");
  }

  function scoreData() {
    const form = document.getElementById("score-form");
    const data = formToObject(form);
    return {
      ip: {
        advanced: data.ipAdvanced,
        core: data.ipCore,
        count: data.ipCount,
        source: data.ipSource,
        standards: data.standards
      },
      transformationCount: data.transformationCount,
      organization: {
        system: data.orgSystem,
        institution: data.orgInstitution,
        transformation: data.orgTransformation,
        talent: data.orgTalent
      },
      growth: {
        netAssets: [data.netAssets1, data.netAssets2, data.netAssets3],
        sales: [data.sales1, data.sales2, data.sales3]
      }
    };
  }

  function updateRangeLabels() {
    const pairs = [
      ["orgSystem", "org-system-value"],
      ["orgInstitution", "org-institution-value"],
      ["orgTransformation", "org-transformation-value"],
      ["orgTalent", "org-talent-value"]
    ];
    pairs.forEach(([name, outputId]) => {
      const input = document.querySelector(`[name="${name}"]`);
      document.getElementById(outputId).textContent = input.value;
    });
  }

  function renderScore() {
    const data = scoreData();
    const result = engine.totalScore(data);
    state.score = { data, result };
    document.getElementById("score-total").textContent = String(result.total);
    const status = document.getElementById("score-status");
    status.innerHTML = result.passes ? "达到 &gt;70 分模拟线" : `距 &gt;70 门槛还差 ${Math.max(1, 71 - result.total)} 分`;
    status.classList.toggle("is-fail", !result.passes);

    const rows = [
      { title: "知识产权", value: result.ip, max: 30 },
      { title: "科技成果转化", value: result.transformation, max: 30 },
      { title: "研发组织管理", value: result.organization, max: 20 },
      { title: "企业成长性", value: result.growth.total, max: 20 }
    ];
    document.getElementById("score-breakdown").innerHTML = rows.map((row) => `
      <div class="breakdown-row">
        <div><span>${row.title}</span><span>${row.value} / ${row.max}</span></div>
        <div class="bar"><i style="width:${(row.value / row.max) * 100}%"></i></div>
      </div>
    `).join("");
  }

  function exportReport() {
    const now = new Date();
    const items = allMaterialItems();
    const completed = items.filter((item) => state.checked[item.key]);
    const pending = items.filter((item) => !state.checked[item.key]);
    const currentPath = window.location.href;
    const lines = [
      "# 高新技术企业认定申报自查报告",
      "",
      `- 生成时间：${now.toLocaleString("zh-CN")}`,
      `- 项目版本：${guide.meta.version}`,
      `- 政策核验日期：${guide.meta.asOf}`,
      `- 页面位置：${currentPath}`,
      "",
      "> 本报告由开源工具根据用户输入生成，不构成官方认定结论、审计意见或法律意见。金额与人员口径须由企业复核。",
      "",
      "## 一、硬门槛初筛"
    ];

    if (state.eligibility) {
      lines.push(
        "",
        `结论：${state.eligibility.result.hardGateReady ? "已填报门槛均通过" : `${state.eligibility.result.failed} 项未通过或待确认`}`,
        ""
      );
      state.eligibility.result.checks.forEach((item) => {
        lines.push(`- [${item.pass ? "x" : " "}] ${item.label}：${item.detail}`);
      });
    } else {
      lines.push("", "尚未运行资格自查。");
    }

    lines.push("", "## 二、创新能力评分模拟");
    if (state.score) {
      const score = state.score.result;
      lines.push(
        "",
        `- 模拟总分：${score.total} / 100`,
        `- 知识产权：${score.ip} / 30`,
        `- 科技成果转化：${score.transformation} / 30`,
        `- 研发组织管理：${score.organization} / 20`,
        `- 企业成长性：${score.growth.total} / 20`,
        `- 净资产增长率：${formatPercent(score.growth.netAssets)}`,
        `- 销售收入增长率：${formatPercent(score.growth.sales)}`,
        `- 是否达到 >70 分模拟线：${score.passes ? "是" : "否"}`,
        "",
        "注意：区间分取中值，实际得分由专家评价。"
      );
    } else {
      lines.push("", "尚未运行评分模拟。");
    }

    lines.push(
      "",
      "## 三、材料清单",
      "",
      `完成 ${completed.length} / ${items.length} 项。`,
      "",
      "### 已准备",
      ""
    );
    lines.push(...(completed.length
      ? completed.map((item) => `- [x] ${item.category}：${item.title}`)
      : ["- 暂无"]));
    lines.push("", "### 待准备", "");
    lines.push(...(pending.length
      ? pending.map((item) => `- [ ] ${item.category}：${item.title}`)
      : ["- 无"]));
    lines.push(
      "",
      "## 四、提交前人工复核",
      "",
      "- [ ] 已核对企业所在地当年度申报通知、批次和附件要求",
      "- [ ] 已在官方认定系统核验企业注册信息",
      "- [ ] 已核对 IP 权属、法律状态和 II 类 IP 历史使用情况",
      "- [ ] 已核对研发费用辅助账、专项报告、财报和纳税申报表",
      "- [ ] 已核对人员月平均数、社保记录和高新收入合同/发票",
      "- [ ] 已完成签章、扫描件清晰度、文件命名和系统一致性检查",
      "- [ ] 已留存完整纸质档案，未将真实敏感材料上传公开仓库",
      ""
    );

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `高企申报自查报告-${now.toISOString().slice(0, 10)}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("自查报告已导出，请妥善保管并核对内容。");
  }

  function resetChecklist() {
    if (!window.confirm("确认清空全部材料勾选状态？此操作不可撤销。")) return;
    state.checked = {};
    saveChecklist();
    document.querySelectorAll("[data-checklist-key]").forEach((input) => {
      input.checked = false;
    });
    updateProgress();
    showToast("材料勾选状态已清空。");
  }

  function setupNavigation() {
    const header = document.querySelector(".site-header");
    const nav = document.getElementById("site-nav");
    const toggle = document.getElementById("nav-toggle");

    function closeNav() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeNav();
    });

    window.addEventListener("scroll", () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }, { passive: true });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".site-header")) closeNav();
    });

    const navLinks = Array.from(nav.querySelectorAll('a[href^="#"]'));
    const sections = navLinks
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`);
      });
    }, { rootMargin: "-20% 0px -68% 0px", threshold: [0, 0.2, 0.5] });
    sections.forEach((section) => observer.observe(section));
  }

  function init() {
    if (!engine || !guide) {
      document.body.insertAdjacentHTML(
        "afterbegin",
        '<p style="padding:20px;background:#b84232;color:white">页面脚本加载失败，请通过本地服务器运行或检查文件是否完整。</p>'
      );
      return;
    }

    renderConditions();
    renderProcess();
    renderRisks();
    renderSchedule();
    renderSources();
    renderMaterials();
    setupNavigation();

    document.getElementById("eligibility-form").addEventListener("submit", handleEligibilitySubmit);
    document.getElementById("fill-demo").addEventListener("click", fillDemo);
    document.getElementById("eligibility-form").addEventListener("reset", () => {
      state.eligibility = null;
      document.getElementById("checker-result").innerHTML = `
        <div class="result-empty">
          <span class="result-illustration" aria-hidden="true">
            <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="37"></circle><path d="m34 51 10 10 23-25"></path></svg>
          </span>
          <h3>等待自查</h3>
          <p>填完左侧信息后，这里会列出每项门槛的当前状态和需要优先复核的数据。</p>
        </div>
      `;
    });

    const scoreForm = document.getElementById("score-form");
    scoreForm.addEventListener("input", () => {
      updateRangeLabels();
      renderScore();
    });
    scoreForm.addEventListener("change", renderScore);

    document.getElementById("materials-grid").addEventListener("change", (event) => {
      const input = event.target.closest("[data-checklist-key]");
      if (!input) return;
      state.checked[input.dataset.checklistKey] = input.checked;
      saveChecklist();
      updateProgress();
    });

    document.getElementById("export-checklist").addEventListener("click", exportReport);
    document.getElementById("reset-checklist").addEventListener("click", resetChecklist);
    document.getElementById("print-page").addEventListener("click", () => window.print());

    updateRangeLabels();
    renderScore();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
