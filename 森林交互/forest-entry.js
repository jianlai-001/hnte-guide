import * as THREE from "three";
import Lenis from "lenis";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const state = {
  scroll: 0,
  progress: 0,
  lookX: 0,
  lookY: 0,
  targetLookX: 0,
  targetLookY: 0,
  dragRotation: 0,
  dragging: false,
  dragStartX: 0,
  dragStartRotation: 0,
  activeChapter: "01",
  frameCount: 0
};

const chapters = [...document.querySelectorAll(".forest-section")];
const railLinks = [...document.querySelectorAll(".chapter-rail a")];
const navLinks = [...document.querySelectorAll(".forest-nav a")];
const loader = document.getElementById("forest-loader");
const progressBar = document.querySelector(".scroll-progress i");
const cursor = document.getElementById("forest-cursor");

function createScene() {
  const canvas = document.getElementById("forest-canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x060806, 0.046);
  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 90);
  camera.position.set(0, 0.6, 8);
  camera.lookAt(0, 0.3, -4);

  const forest = new THREE.Group();
  scene.add(forest);

  const grid = new THREE.GridHelper(70, 70, 0x375c34, 0x182b18);
  grid.position.set(0, -1.55, -24);
  grid.material.transparent = true;
  grid.material.opacity = 0.34;
  forest.add(grid);

  const random = seededRandom(73124);
  const treeCount = window.innerWidth < 700 ? 62 : 104;
  const trunkGeometry = new THREE.CylinderGeometry(0.022, 0.042, 1, 5, 1);
  const canopyGeometry = new THREE.ConeGeometry(0.52, 1.55, 6, 1, true);
  const trunkMaterial = new THREE.MeshBasicMaterial({
    color: 0xb4b8af,
    wireframe: true,
    transparent: true,
    opacity: 0.28
  });
  const canopyMaterial = new THREE.MeshBasicMaterial({
    color: 0x8cff66,
    wireframe: true,
    transparent: true,
    opacity: 0.21
  });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeCount);
  const canopies = new THREE.InstancedMesh(canopyGeometry, canopyMaterial, treeCount);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const treePositions = [];

  for (let index = 0; index < treeCount; index += 1) {
    const side = index % 2 ? 1 : -1;
    const x = side * (2.1 + random() * 7.7);
    const z = 8 - random() * 55;
    const height = 1.25 + random() * 5.6;
    const trunkScale = new THREE.Vector3(0.7 + random() * 0.6, height, 0.7 + random() * 0.6);
    position.set(x, -1.55 + height / 2, z);
    matrix.compose(position, quaternion, trunkScale);
    trunks.setMatrixAt(index, matrix);

    const crownSize = 0.58 + random() * 1.25;
    position.set(x + (random() - 0.5) * 0.2, -1.55 + height + crownSize * 0.5, z);
    scale.set(crownSize, crownSize, crownSize);
    matrix.compose(position, quaternion, scale);
    canopies.setMatrixAt(index, matrix);
    treePositions.push(position.clone());
  }
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  forest.add(trunks, canopies);

  const leafPositions = [];
  for (let index = 0; index < 1800; index += 1) {
    const tree = treePositions[Math.floor(random() * treePositions.length)];
    const radius = 0.1 + random() * 1.15;
    const angle = random() * Math.PI * 2;
    leafPositions.push(
      tree.x + Math.cos(angle) * radius,
      tree.y + (random() - 0.25) * 1.2,
      tree.z + Math.sin(angle) * radius
    );
  }
  const leavesGeometry = new THREE.BufferGeometry();
  leavesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(leafPositions, 3));
  const leaves = new THREE.Points(
    leavesGeometry,
    new THREE.PointsMaterial({
      color: 0x8cff66,
      size: 0.018,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  forest.add(leaves);

  const silverPositions = [];
  const silverColors = [];
  const silverGreen = new THREE.Color(0x8cff66);
  const silverWhite = new THREE.Color(0xe9ece2);
  for (let index = 0; index < 4200; index += 1) {
    const radius = Math.pow(random(), 0.62) * 5.8;
    const angle = random() * Math.PI * 2;
    const vertical = (random() - 0.5) * 4.6 * (1 - radius / 8);
    silverPositions.push(
      Math.cos(angle) * radius + Math.sin(radius * 1.5 + index * 0.02) * 0.45,
      1.4 + vertical + Math.sin(angle * 3.2) * 0.8,
      -4.2 - Math.sin(angle) * radius * 0.26 + (random() - 0.5) * 2.2
    );
    const color = random() > 0.82 ? silverGreen : silverWhite;
    silverColors.push(color.r, color.g, color.b);
  }
  const silverGeometry = new THREE.BufferGeometry();
  silverGeometry.setAttribute("position", new THREE.Float32BufferAttribute(silverPositions, 3));
  silverGeometry.setAttribute("color", new THREE.Float32BufferAttribute(silverColors, 3));
  const silverCloud = new THREE.Points(
    silverGeometry,
    new THREE.PointsMaterial({
      size: 0.024,
      vertexColors: true,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  forest.add(silverCloud);

  const networkPoints = [];
  const networkLines = [];
  for (let index = 0; index < 20; index += 1) {
    const x = (random() - 0.5) * 14;
    const y = -0.8 + random() * 7;
    const z = -16 - random() * 22;
    networkPoints.push(x, y, z);
    if (index > 0) {
      networkLines.push(x, y, z, (random() - 0.5) * 14, -0.5 + random() * 7, -18 - random() * 19);
    }
  }
  const networkPointGeometry = new THREE.BufferGeometry();
  networkPointGeometry.setAttribute("position", new THREE.Float32BufferAttribute(networkPoints, 3));
  const network = new THREE.Points(
    networkPointGeometry,
    new THREE.PointsMaterial({
      color: 0xd9ffe0,
      size: 0.055,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    })
  );
  scene.add(network);
  const networkLineGeometry = new THREE.BufferGeometry();
  networkLineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(networkLines, 3));
  const networkSegments = new THREE.LineSegments(
    networkLineGeometry,
    new THREE.LineBasicMaterial({
      color: 0x6fbf62,
      transparent: true,
      opacity: 0.08
    })
  );
  scene.add(networkSegments);

  const dustPositions = [];
  for (let index = 0; index < 650; index += 1) {
    dustPositions.push(
      (random() - 0.5) * 28,
      (random() - 0.5) * 16,
      -4 - random() * 40
    );
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: 0xdde6d9,
      size: 0.012,
      transparent: true,
      opacity: 0.2,
      depthWrite: false
    })
  );
  scene.add(dust);

  const startTime = performance.now();
  function render(now) {
    const time = (now - startTime) / 1000;
    if (reducedMotion) {
      camera.position.set(0, 0.6, 8);
      camera.lookAt(0, 0.3, -4);
    } else {
      state.lookX += (state.targetLookX - state.lookX) * 0.045;
      state.lookY += (state.targetLookY - state.lookY) * 0.045;
      const p = state.progress;
      camera.position.x = Math.sin(p * Math.PI * 1.55) * 3.3 + state.dragRotation * 1.4;
      camera.position.y = 0.65 + Math.sin(p * Math.PI) * 0.95 - state.lookY * 0.35;
      camera.position.z = 8 - p * 31;
      camera.lookAt(
        Math.sin(p * Math.PI * 1.4) * 1.8 + state.lookX * 1.8 - state.dragRotation,
        0.2 + state.lookY * 1.6,
        -4 - p * 27
      );
      forest.rotation.z = Math.sin(time * 0.08) * 0.004 + state.lookX * 0.006;
      leaves.rotation.y = Math.sin(time * 0.05) * 0.025;
      network.rotation.y = Math.sin(time * 0.08) * 0.03;
      networkSegments.rotation.y = network.rotation.y;
      silverCloud.rotation.y = Math.sin(time * 0.06) * 0.03;
      silverCloud.rotation.z = Math.sin(time * 0.09) * 0.016;
      silverCloud.position.z = -state.progress * 3.8;
      dust.position.z = (time * 0.17) % 6;
    }
    renderer.render(scene, camera);
    state.frameCount += 1;
    if (state.frameCount === 3) loader.classList.add("is-hidden");
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  window.addEventListener("resize", () => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }, { passive: true });

  return { scene, camera, treeCount };
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function format(value, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

function setupScroll() {
  const lenis = new Lenis({
    duration: reducedMotion ? 0 : 1.1,
    smoothWheel: !reducedMotion,
    syncTouch: false,
    wheelMultiplier: 0.85,
    touchMultiplier: 1.1
  });

  function scrollFrame(time) {
    lenis.raf(time);
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    state.scroll = window.scrollY;
    state.progress = Math.min(1, window.scrollY / max);
    document.documentElement.style.setProperty("--scroll-progress", state.progress.toFixed(4));
    progressBar.style.width = `${state.progress * 100}%`;
    updateLedger(state.progress);
    requestAnimationFrame(scrollFrame);
  }
  requestAnimationFrame(scrollFrame);

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -20 });
      history.replaceState(null, "", id);
    });
  });

  window.__forestLenis = lenis;
}

function setupReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      const chapter = entry.target.dataset.chapter;
      if (chapter) setActiveChapter(chapter);
    });
  }, { rootMargin: "-24% 0px -52% 0px", threshold: 0.08 });

  chapters.forEach((section) => {
    observer.observe(section);
    section.querySelectorAll(
      ".chapter-header, .mega-title, .chapter-copy, .chapter-metrics, .emergence-footer, .scale-top, .final-title, .final-bottom"
        + ", .digital-caption"
    ).forEach((element) => element.setAttribute("data-reveal", ""));
  });
}

function setActiveChapter(chapter) {
  if (state.activeChapter !== chapter) {
    state.activeChapter = chapter;
    document.documentElement.style.setProperty("--active-chapter", chapter);
  }
  railLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.chapter === chapter));
  navLinks.forEach((link) => {
    const target = document.querySelector(link.getAttribute("href"));
    link.classList.toggle("is-active", target?.dataset.chapter === chapter);
  });
}

function updateLedger(progress) {
  const trees = 48219 + Math.round(progress * 8641);
  const hectares = 12407 + progress * 2813;
  const carbon = 86.4 + progress * 11.9;
  const issued = 9218440 + progress * 4038820;
  document.getElementById("ledger-trees").textContent = format(trees);
  document.getElementById("ledger-hectares").textContent = format(hectares);
  document.getElementById("ledger-carbon").textContent = format(carbon, 1);
  document.getElementById("ledger-issued").textContent = format(issued);
  document.getElementById("ledger-block").textContent = String(483920 + Math.round(progress * 1470)).padStart(6, "0");
}

function setupPointer() {
  window.addEventListener("pointermove", (event) => {
    state.targetLookX = event.clientX / window.innerWidth - 0.5;
    state.targetLookY = event.clientY / window.innerHeight - 0.5;
    if (cursor) {
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      cursor.classList.add("is-visible");
    }
  }, { passive: true });

  document.addEventListener("pointerover", (event) => {
    const link = event.target.closest("a, button");
    cursor?.classList.toggle("is-active", Boolean(link));
    const label = cursor?.querySelector("b");
    if (label) label.textContent = link ? "ENTER" : "";
  });

  window.addEventListener("pointerdown", (event) => {
    if (event.target.closest("a, button")) return;
    state.dragging = true;
    state.dragStartX = event.clientX;
    state.dragStartRotation = state.dragRotation;
  });
  window.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    state.dragRotation = THREE.MathUtils.clamp(
      state.dragStartRotation - (event.clientX - state.dragStartX) * 0.0018,
      -0.75,
      0.75
    );
  }, { passive: true });
  window.addEventListener("pointerup", () => { state.dragging = false; });
  window.addEventListener("pointercancel", () => { state.dragging = false; });
}

function setupClock() {
  const clock = document.getElementById("forest-clock");
  const update = () => {
    clock.textContent = new Date().toLocaleTimeString("en-GB", { hour12: false });
  };
  update();
  window.setInterval(update, 1000);
}

function init() {
  const experience = createScene();
  setupScroll();
  setupReveal();
  setupPointer();
  setupClock();
  setActiveChapter("01");
  window.__forestDebug = {
    ...experience,
    getState: () => ({ ...state })
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
