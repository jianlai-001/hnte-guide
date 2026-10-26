import {
  CATEGORY_DEFINITIONS,
  classifyDocument,
  extractSignals,
  detectSensitiveData,
  analyzeWorkspace
} from "./workspace-core.mjs";

const DB_NAME = "hnte-workspace";
const DB_VERSION = 1;
const MAX_FILE_BYTES = 80 * 1024 * 1024;
const MAX_FILES_PER_IMPORT = 300;
const MAX_TEXT_CHARS = 450000;

let databasePromise;

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("documents")) {
        const store = db.createObjectStore("documents", { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("category", "category");
        store.createIndex("hash", "hash");
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("drafts")) {
        const store = db.createObjectStore("drafts", { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted"));
  });
}

export async function listDocuments() {
  const db = await openDatabase();
  const store = db.transaction("documents", "readonly").objectStore("documents");
  const documents = await requestResult(store.getAll());
  return documents.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export async function getDocument(id) {
  const db = await openDatabase();
  return requestResult(db.transaction("documents", "readonly").objectStore("documents").get(id));
}

export async function saveDocument(document) {
  const db = await openDatabase();
  const transaction = db.transaction("documents", "readwrite");
  transaction.objectStore("documents").put(document);
  await transactionDone(transaction);
  return document;
}

export async function updateDocument(id, changes) {
  const current = await getDocument(id);
  if (!current) throw new Error("文件不存在或已被删除。");
  const next = { ...current, ...changes, updatedAt: new Date().toISOString() };
  await saveDocument(next);
  return next;
}

export async function deleteDocument(id) {
  const db = await openDatabase();
  const transaction = db.transaction("documents", "readwrite");
  transaction.objectStore("documents").delete(id);
  await transactionDone(transaction);
}

export async function getProfile() {
  const db = await openDatabase();
  const record = await requestResult(db.transaction("settings", "readonly").objectStore("settings").get("profile"));
  return record?.value || null;
}

export async function saveProfile(profile) {
  const db = await openDatabase();
  const transaction = db.transaction("settings", "readwrite");
  transaction.objectStore("settings").put({
    key: "profile",
    value: profile,
    updatedAt: new Date().toISOString()
  });
  await transactionDone(transaction);
  return profile;
}

export async function saveDraft(draft) {
  const db = await openDatabase();
  const transaction = db.transaction("drafts", "readwrite");
  const record = {
    ...draft,
    id: draft.id || crypto.randomUUID(),
    updatedAt: new Date().toISOString()
  };
  transaction.objectStore("drafts").put(record);
  await transactionDone(transaction);
  return record;
}

export async function listDrafts() {
  const db = await openDatabase();
  const drafts = await requestResult(db.transaction("drafts", "readonly").objectStore("drafts").getAll());
  return drafts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function deleteDraft(id) {
  const db = await openDatabase();
  const transaction = db.transaction("drafts", "readwrite");
  transaction.objectStore("drafts").delete(id);
  await transactionDone(transaction);
}

export async function clearWorkspace() {
  const db = await openDatabase();
  const transaction = db.transaction(["documents", "drafts", "settings"], "readwrite");
  transaction.objectStore("documents").clear();
  transaction.objectStore("drafts").clear();
  transaction.objectStore("settings").clear();
  await transactionDone(transaction);
}

export async function removeAllDocuments() {
  const db = await openDatabase();
  const transaction = db.transaction("documents", "readwrite");
  transaction.objectStore("documents").clear();
  await transactionDone(transaction);
}

function extensionOf(name) {
  const match = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

async function sha256(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cleanText(value) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

async function extractPdf(file) {
  const pdfjs = await import("./vendor/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdf.worker.min.mjs", import.meta.url).href;
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: true
  });
  const pdf = await loadingTask.promise;
  const pages = [];
  const pageCount = Math.min(pdf.numPages, 250);
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str || "").join(" "));
    page.cleanup();
  }
  const text = cleanText(pages.join("\n\n"));
  const pageCountTotal = pdf.numPages;
  await loadingTask.destroy();
  return {
    text,
    status: text.length >= 20 ? "parsed" : "needs_ocr",
    message: text.length >= 20 ? `已解析 ${pageCount} 页 PDF。` : "PDF 未提取到足够文字，可能是扫描件。",
    pages: pageCountTotal
  };
}

async function extractDocx(file) {
  if (!window.mammoth) throw new Error("DOCX 解析组件未加载。");
  const buffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
  const text = cleanText(result.value);
  return {
    text,
    status: text.length >= 20 ? "parsed" : "needs_ocr",
    message: text.length >= 20 ? "已解析 DOCX 文本。" : "DOCX 未提取到足够文字，可能主要由扫描图片构成。",
    warnings: result.messages?.slice(0, 10).map((item) => item.message) || []
  };
}

async function extractSpreadsheet(file) {
  if (!window.readXlsxFile) throw new Error("Excel 解析组件未加载。");
  const sheets = await window.readXlsxFile(file);
  const sections = sheets.map((sheet) => {
    const rows = (sheet.data || []).slice(0, 5000).map((row) =>
      (row || []).map((cell) => cell instanceof Date ? cell.toISOString().slice(0, 10) : (cell ?? "")).join("\t")
    );
    return `工作表：${sheet.sheet}\n${rows.join("\n")}`;
  });
  const text = cleanText(sections.join("\n\n"));
  return {
    text,
    status: text.length >= 20 ? "parsed" : "needs_ocr",
    message: text.length >= 20 ? `已解析 ${sheets.length} 个工作表。` : "表格中未提取到足够文字。",
    sheets: sheets.map((sheet) => sheet.sheet)
  };
}

async function extractHtml(file) {
  const source = await file.text();
  const document = new DOMParser().parseFromString(source, "text/html");
  document.querySelectorAll("script,style,noscript").forEach((node) => node.remove());
  const text = cleanText(document.body?.innerText || document.body?.textContent || "");
  return { text, status: text ? "parsed" : "needs_ocr", message: text ? "已解析 HTML 文本。" : "HTML 中没有可用文本。" };
}

export async function extractDocument(file) {
  const extension = extensionOf(file.name);
  try {
    if (["txt", "md", "csv", "json", "xml"].includes(extension)) {
      let text = await file.text();
      if (extension === "json") {
        try {
          text = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          // Keep the original text so a malformed file can still be inspected.
        }
      }
      return { text: cleanText(text), status: "parsed", message: "已解析文本。" };
    }
    if (["html", "htm"].includes(extension)) return extractHtml(file);
    if (extension === "pdf") return extractPdf(file);
    if (extension === "docx") return extractDocx(file);
    if (["xlsx", "xlsm"].includes(extension)) return extractSpreadsheet(file);
    if (extension === "xls") {
      return { text: "", status: "unsupported", message: "旧版 .xls 暂不支持，请另存为 .xlsx 后上传。" };
    }
    if (extension === "doc") {
      return { text: "", status: "unsupported", message: "旧版 .doc 暂不支持，请另存为 .docx 后上传。" };
    }
    if (["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"].includes(extension)) {
      return { text: "", status: "needs_ocr", message: "图片需要 OCR；当前版本按文件名分类，并提示人工核对。" };
    }
    return {
      text: "",
      status: "unsupported",
      message: `暂不支持 .${extension || "未知"} 格式的自动抽取，可转换为 PDF、DOCX、XLSX 或 TXT。`
    };
  } catch (error) {
    return {
      text: "",
      status: "error",
      message: `解析失败：${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function inferMime(extension) {
  return {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain",
    md: "text/markdown"
  }[extension] || "";
}

async function expandZip(file, depth = 0) {
  if (depth > 2 || !window.JSZip) return [{ file, sourcePath: file.name }];
  const zip = await window.JSZip.loadAsync(file);
  const outputs = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || entry.name.startsWith("__MACOSX/") || entry.name.endsWith(".DS_Store")) continue;
    const blob = await entry.async("blob");
    const innerFile = new File([blob], entry.name.split("/").pop(), {
      type: inferMime(extensionOf(entry.name)),
      lastModified: file.lastModified
    });
    if (extensionOf(entry.name) === "zip") {
      outputs.push(...await expandZip(innerFile, depth + 1));
    } else {
      outputs.push({ file: innerFile, sourcePath: entry.name });
    }
  }
  return outputs;
}

async function flattenFiles(files) {
  const flattened = [];
  const errors = [];
  for (const file of files) {
    const sourcePath = file.webkitRelativePath || file.name;
    if (extensionOf(file.name) === "zip") {
      try {
        const entries = await expandZip(file);
        entries.forEach((entry) => {
          entry.sourcePath = `${file.name}/${entry.sourcePath}`;
          flattened.push(entry);
        });
      } catch (error) {
        errors.push({ name: file.name, message: `压缩包展开失败：${error.message}` });
      }
    } else {
      flattened.push({ file, sourcePath });
    }
  }
  return { flattened, errors };
}

export async function importFiles(fileList, onProgress = () => {}) {
  const requested = Array.from(fileList || []);
  if (!requested.length) return { added: [], duplicates: [], errors: [] };

  const { flattened, errors } = await flattenFiles(requested.slice(0, MAX_FILES_PER_IMPORT));
  const existing = await listDocuments();
  const existingHashes = new Map(existing.filter((item) => item.hash).map((item) => [item.hash, item]));
  const added = [];
  const duplicates = [];

  for (let index = 0; index < flattened.length; index += 1) {
    const { file, sourcePath } = flattened[index];
    onProgress({
      index: index + 1,
      total: flattened.length,
      name: file.name,
      stage: "正在读取"
    });

    if (file.size > MAX_FILE_BYTES) {
      errors.push({ name: file.name, message: "文件超过 80 MB，未导入。" });
      continue;
    }

    try {
      const buffer = await file.arrayBuffer();
      const hash = await sha256(buffer);
      if (existingHashes.has(hash)) {
        duplicates.push({ name: file.name, duplicateOf: existingHashes.get(hash).name });
        continue;
      }

      onProgress({ index: index + 1, total: flattened.length, name: file.name, stage: "正在抽取" });
      const extraction = await extractDocument(file);
      const classification = classifyDocument({
        name: file.name,
        path: sourcePath,
        text: extraction.text
      });
      const createdAt = new Date().toISOString();
      const extension = extensionOf(file.name);
      const document = {
        id: crypto.randomUUID(),
        name: file.name,
        sourcePath,
        extension,
        mime: file.type || inferMime(extension),
        size: file.size,
        lastModified: new Date(file.lastModified || Date.now()).toISOString(),
        createdAt,
        updatedAt: createdAt,
        hash,
        blob: file,
        text: extraction.text || "",
        excerpt: (extraction.text || "").slice(0, 300),
        status: extraction.status,
        extractionMessage: extraction.message || "",
        extractionMeta: {
          pages: extraction.pages || null,
          sheets: extraction.sheets || null,
          warnings: extraction.warnings || []
        },
        classification,
        category: classification.category,
        signals: extractSignals(extraction.text, file.name),
        sensitivity: detectSensitiveData(extraction.text)
      };
      await saveDocument(document);
      existingHashes.set(hash, document);
      added.push(document);
    } catch (error) {
      errors.push({ name: file.name, message: error instanceof Error ? error.message : String(error) });
    }
  }

  onProgress({ index: flattened.length, total: flattened.length, name: "导入完成", stage: "完成" });
  return { added, duplicates, errors };
}

export function profileEligibility(profile) {
  if (!profile || !window.HNTEEngine) return null;
  return window.HNTEEngine.assessEligibility(profile);
}

export async function auditWorkspace() {
  const [documents, profile] = await Promise.all([listDocuments(), getProfile()]);
  const eligibility = profileEligibility(profile);
  return {
    documents,
    profile,
    eligibility,
    audit: analyzeWorkspace(documents, profile, eligibility)
  };
}

export async function seedDemoWorkspace() {
  const demoFiles = [
    ["01_营业执照.txt", "统一社会信用代码：91310000DEM123456X\n示例科技有限公司，成立于2020年1月1日。", "business"],
    ["02_高企认定申请书.txt", "高新技术企业认定申请书\n企业承诺材料真实、合法、有效。", "application"],
    ["03_发明专利证书.txt", "发明专利证书 专利号 ZL2024DEMO001\n权利人：示例科技有限公司\n技术：工业视觉缺陷检测。IP01 对应 RD01 与 PS01。", "ip"],
    ["04_RD01立项报告.txt", "RD01 智能视觉缺陷检测算法研发项目\n立项日期：2024年3月\n目标：提高小样本缺陷识别准确率并降低误检率。", "rd"],
    ["05_RD01结题验收报告.txt", "RD01 已完成验收，形成算法、软件模块和测试记录，对应 IP01。", "rd"],
    ["06_PS01产品技术说明.txt", "PS01 工业视觉检测系统\n关键技术：小样本缺陷识别。技术指标与产品检测报告一致。", "product"],
    ["07_科技成果转化说明.txt", "科技成果转化说明\n成果来源：RD01；转化形式：自行投资实施；载体：PS01；已形成销售收入。", "transformation"],
    ["08_科技人员名单.txt", "职工总数100人，科技人员20人。人员名单、劳动合同和社保记录已准备。", "people"],
    ["09_研发费用专项审计报告.txt", "近三年研发费用900万元，其中境内810万元。财务报表与专项报告已复核。", "finance"],
    ["10_企业所得税年度纳税申报表.txt", "企业所得税年度纳税申报表，数据与财务会计报告一致。", "tax"],
    ["11_PS01销售合同清单.txt", "合同编号 DEMO-2025-001，发票及验收材料齐全，高新技术产品收入5200万元。", "contract"],
    ["12_研发组织管理制度.txt", "研发管理制度、研发机构、产学研合作、成果转化激励及人才绩效制度。", "management"]
  ];

  const files = demoFiles.map(([name, text]) => new File([text], name, {
    type: "text/plain",
    lastModified: Date.now()
  }));
  const result = await importFiles(files);
  await saveProfile({
    companyName: "示例科技有限公司",
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
  });
  return result;
}

export { CATEGORY_DEFINITIONS };
