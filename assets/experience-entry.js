import * as THREE from "three";

const CONFIG = {
  audit: { primary: 0x57e9ff, secondary: 0x1768ff, warm: 0xffae6f, scene: "scan" },
  organizer: { primary: 0x77fff0, secondary: 0x3a65ff, warm: 0xffcb75, scene: "network" },
  draft: { primary: 0xffc27a, secondary: 0xff6f61, warm: 0x71e7ff, scene: "sheets" },
  guide: { primary: 0x80c6ff, secondary: 0x2f65ff, warm: 0xffd379, scene: "monolith" },
  workspace: { primary: 0x62f4c7, secondary: 0x1686ff, warm: 0xffb96f, scene: "files" }
};

const root = document.body;
const type = root.dataset.experience || "workspace";
const config = CONFIG[type] || CONFIG.workspace;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const state = {
  pointerX: 0,
  pointerY: 0,
  targetX: 0,
  targetY: 0,
  scroll: 0,
  dragging: false,
  dragX: 0,
  dragY: 0,
  dragRotationX: 0,
  dragRotationY: 0
};

function createOverlayLayers() {
  const canvas = document.createElement("canvas");
  canvas.id = "experience-canvas";
  canvas.setAttribute("aria-hidden", "true");
  root.prepend(canvas);

  const atmosphere = document.createElement("div");
  atmosphere.className = "xp-atmosphere";
  atmosphere.setAttribute("aria-hidden", "true");
  atmosphere.innerHTML = `
    <span class="xp-noise"></span>
    <span class="xp-vignette"></span>
    <span class="xp-horizon"></span>
    <span class="xp-scanline"></span>
  `;
  root.append(atmosphere);

  const progress = document.createElement("div");
  progress.className = "experience-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.innerHTML = "<i></i>";
  root.append(progress);

  const loader = document.createElement("div");
  loader.className = "experience-loader";
  loader.setAttribute("aria-live", "polite");
  loader.innerHTML = `
    <div class="xp-loader-mark"><span></span><span></span><span></span></div>
    <strong>INITIALIZING SPATIAL INTERFACE</strong>
    <small>${type.toUpperCase()} / GUANGDONG HNTE</small>
    <i></i>
  `;
  root.append(loader);

  const cursor = document.createElement("div");
  cursor.className = "experience-cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = '<span class="xp-cursor-dot"></span><span class="xp-cursor-ring"></span><b></b>';
  root.append(cursor);

  const transition = document.createElement("div");
  transition.className = "experience-transition";
  transition.setAttribute("aria-hidden", "true");
  root.append(transition);

  const HUD = document.createElement("div");
  HUD.className = "xp-fixed-hud";
  HUD.setAttribute("aria-hidden", "true");
  HUD.innerHTML = `
    <span class="xp-hud-left">SCENE / ${root.dataset.sceneWord || type.toUpperCase()}</span>
    <span class="xp-hud-right">34ms · GPU RENDER · <b id="xp-clock"></b></span>
  `;
  root.append(HUD);

  return { canvas, loader, cursor, transition, progress };
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

function buildParticles(scene, color, count, spread) {
  const random = seededRandom(type.length * 971 + count);
  const positions = [];
  for (let index = 0; index < count; index += 1) {
    positions.push(
      (random() - 0.5) * spread,
      (random() - 0.5) * spread * 0.65,
      (random() - 0.5) * spread * 0.55
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color,
      size: 0.026,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })
  );
  scene.add(points);
  return points;
}

function createScanScene(group) {
  const rings = [];
  for (let index = 0; index < 11; index += 1) {
    const radius = 1.25 + index * 0.18;
    const material = new THREE.MeshBasicMaterial({
      color: index % 3 === 0 ? config.warm : config.primary,
      transparent: true,
      opacity: 0.08 + (index % 4) * 0.035,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.006, 5, 96), material);
    ring.position.z = (index - 5) * 0.48;
    ring.rotation.x = 0.12 * (index % 3);
    ring.rotation.y = 0.2 * (index % 4);
    group.add(ring);
    rings.push(ring);
  }

  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(1.28, 2.95, 5.4, 64, 10, true),
    new THREE.MeshBasicMaterial({
      color: config.primary,
      wireframe: true,
      transparent: true,
      opacity: 0.045,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  cylinder.rotation.x = Math.PI / 2;
  group.add(cylinder);

  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.72, 1),
    new THREE.MeshBasicMaterial({
      color: config.primary,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    })
  );
  group.add(core);

  return (time) => {
    rings.forEach((ring, index) => {
      ring.rotation.z = time * (0.08 + index * 0.006) * (index % 2 ? -1 : 1);
      ring.position.z = ((time * 0.34 + index * 0.55) % 5.2) - 2.6;
      ring.material.opacity = 0.06 + (1 - Math.abs(ring.position.z) / 2.6) * 0.18;
    });
    cylinder.rotation.z = time * 0.04;
    core.rotation.x = time * 0.22;
    core.rotation.y = time * 0.3;
  };
}

function createNetworkScene(group) {
  const random = seededRandom(77);
  const nodes = [];
  for (let index = 0; index < 46; index += 1) {
    const radius = 1.2 + random() * 1.4;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    nodes.push(new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    ));
  }
  const coreNodes = [
    new THREE.Vector3(-0.9, 0.25, 0),
    new THREE.Vector3(0.75, 0.7, 0.15),
    new THREE.Vector3(0.15, -0.95, -0.1)
  ];
  const allNodes = [...nodes, ...coreNodes];
  const pointPositions = [];
  allNodes.forEach((point) => pointPositions.push(point.x, point.y, point.z));
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.Float32BufferAttribute(pointPositions, 3));
  group.add(new THREE.Points(
    pointGeometry,
    new THREE.PointsMaterial({
      color: config.primary,
      size: 0.055,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  ));

  const linePositions = [];
  allNodes.forEach((point, index) => {
    const nearest = allNodes
      .map((other, otherIndex) => ({ distance: point.distanceTo(other), otherIndex }))
      .filter((item) => item.otherIndex !== index)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, index > nodes.length - 1 ? 5 : 2);
    nearest.forEach((entry) => {
      const other = allNodes[entry.otherIndex];
      linePositions.push(point.x, point.y, point.z, other.x, other.y, other.z);
    });
  });
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  const lines = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({
      color: config.primary,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  group.add(lines);

  const halos = coreNodes.map((point, index) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12 + index * 0.025, 18, 18),
      new THREE.MeshBasicMaterial({
        color: index === 2 ? config.warm : config.primary,
        transparent: true,
        opacity: 0.78,
        wireframe: index === 1
      })
    );
    mesh.position.copy(point);
    group.add(mesh);
    return mesh;
  });

  return (time) => {
    lines.material.opacity = 0.09 + Math.sin(time * 0.8) * 0.035;
    group.rotation.y = time * 0.035;
    halos.forEach((mesh, index) => {
      const scale = 1 + Math.sin(time * 1.7 + index * 1.4) * 0.2;
      mesh.scale.setScalar(scale);
    });
  };
}

function createSheetsScene(group) {
  const sheets = [];
  for (let index = 0; index < 6; index += 1) {
    const geometry = new THREE.PlaneGeometry(2.75, 3.55, 24, 30);
    const material = new THREE.MeshBasicMaterial({
      color: index === 2 ? config.warm : config.primary,
      wireframe: true,
      transparent: true,
      opacity: 0.075 + index * 0.012,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const sheet = new THREE.Mesh(geometry, material);
    sheet.userData.base = geometry.attributes.position.array.slice();
    sheet.userData.index = index;
    sheet.position.set((index - 2.5) * 0.18, (index - 2.5) * -0.14, (index - 2.5) * -0.34);
    sheet.rotation.y = -0.34 + index * 0.045;
    sheet.rotation.x = 0.12;
    group.add(sheet);
    sheets.push(sheet);
  }

  return (time) => {
    group.rotation.y = -0.15 + Math.sin(time * 0.22) * 0.08;
    sheets.forEach((sheet, sheetIndex) => {
      const positions = sheet.geometry.attributes.position;
      const base = sheet.userData.base;
      for (let index = 0; index < positions.count; index += 1) {
        const x = base[index * 3];
        const y = base[index * 3 + 1];
        positions.setZ(index, Math.sin(x * 2.2 + time * 0.65 + sheetIndex) * 0.045 + Math.cos(y * 1.7 + time * 0.42) * 0.028);
      }
      positions.needsUpdate = true;
      sheet.position.y = (sheetIndex - 2.5) * -0.14 + Math.sin(time * 0.48 + sheetIndex) * 0.06;
    });
  };
}

function createMonolithScene(group) {
  const slabs = [];
  for (let index = 0; index < 9; index += 1) {
    const geometry = new THREE.BoxGeometry(2.25 - index * 0.08, 0.035, 1.35 - index * 0.035);
    const material = new THREE.MeshBasicMaterial({
      color: index % 3 === 0 ? config.warm : config.primary,
      wireframe: true,
      transparent: true,
      opacity: 0.16 - index * 0.01,
      blending: THREE.AdditiveBlending
    });
    const slab = new THREE.Mesh(geometry, material);
    slab.position.y = (index - 4) * 0.36;
    slab.rotation.y = index * 0.095;
    group.add(slab);
    slabs.push(slab);
  }

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.008, 5, 128),
    new THREE.MeshBasicMaterial({
      color: config.primary,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    })
  );
  halo.rotation.x = Math.PI / 2.3;
  group.add(halo);

  return (time) => {
    group.rotation.y = time * 0.055;
    slabs.forEach((slab, index) => {
      slab.rotation.y = index * 0.095 + Math.sin(time * 0.35 + index * 0.35) * 0.08;
      slab.position.x = Math.sin(time * 0.32 + index) * 0.04;
    });
    halo.rotation.z = time * 0.1;
  };
}

function createFilesScene(group) {
  const boxes = [];
  const random = seededRandom(1207);
  for (let index = 0; index < 18; index += 1) {
    const size = 0.18 + random() * 0.32;
    const geometry = new THREE.BoxGeometry(size, size * 0.08, size * 1.35);
    const material = new THREE.MeshBasicMaterial({
      color: index % 4 === 0 ? config.warm : config.primary,
      wireframe: true,
      transparent: true,
      opacity: 0.1 + random() * 0.12,
      blending: THREE.AdditiveBlending
    });
    const box = new THREE.Mesh(geometry, material);
    box.position.set(
      (random() - 0.5) * 5,
      (random() - 0.5) * 3.4,
      (random() - 0.5) * 4
    );
    box.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    box.userData.speed = 0.1 + random() * 0.2;
    group.add(box);
    boxes.push(box);
  }

  const core = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 1.35, 1.35),
    new THREE.MeshBasicMaterial({
      color: config.primary,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    })
  );
  group.add(core);

  return (time) => {
    group.rotation.y = time * 0.025;
    boxes.forEach((box, index) => {
      box.rotation.x += 0.002 * box.userData.speed;
      box.rotation.y += 0.003 * box.userData.speed;
      box.position.y += Math.sin(time + index) * 0.0006;
    });
    core.rotation.x = time * 0.18;
    core.rotation.y = time * 0.16;
    core.scale.setScalar(1 + Math.sin(time * 1.3) * 0.06);
  };
}

function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030b14, 0.035);
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 0, 8.4);

  const group = new THREE.Group();
  scene.add(group);
  const ambient = buildParticles(scene, config.primary, 900, 20);
  const secondaryParticles = buildParticles(scene, config.warm, 180, 9);
  secondaryParticles.position.z = -4;

  const builders = {
    scan: createScanScene,
    network: createNetworkScene,
    sheets: createSheetsScene,
    monolith: createMonolithScene,
    files: createFilesScene
  };
  const animateScene = (builders[config.scene] || createFilesScene)(group);

  function positionScene() {
    const mobile = window.innerWidth < 880;
    group.position.x = mobile ? 0 : window.innerWidth > 1300 ? 2.6 : 1.9;
    group.position.y = mobile ? 1.65 : 0.15;
    group.scale.setScalar(mobile ? 0.82 : 1);
  }
  positionScene();

  const start = performance.now();
  function frame(now) {
    const time = (now - start) / 1000;
    state.pointerX += (state.targetX - state.pointerX) * 0.035;
    state.pointerY += (state.targetY - state.pointerY) * 0.035;
    if (!reducedMotion) {
      group.rotation.x = Math.sin(time * 0.12) * 0.05 + state.pointerY * 0.055 + state.dragRotationX;
      group.rotation.y = state.pointerX * 0.09 + state.dragRotationY;
      group.position.y = (window.innerWidth < 880 ? 1.65 : 0.15) + state.scroll * -0.00062;
      root.style.setProperty("--xp-pointer-x", `${(state.pointerX * 7).toFixed(2)}px`);
      root.style.setProperty("--xp-pointer-y", `${(state.pointerY * 5).toFixed(2)}px`);
      ambient.rotation.y = time * 0.007;
      secondaryParticles.rotation.y = -time * 0.012;
      animateScene(time);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.addEventListener("resize", () => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    positionScene();
  }, { passive: true });

  window.addEventListener("pointermove", (event) => {
    state.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
    state.targetY = (event.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  return { canvas };
}

function setupReveal() {
  const candidates = [
    ...document.querySelectorAll(".section"),
    ...document.querySelectorAll(".workspace-hero"),
    ...document.querySelectorAll(".dashboard-layout"),
    ...document.querySelectorAll(".recent-section"),
    ...document.querySelectorAll(".audit-layout"),
    ...document.querySelectorAll(".organizer-summary"),
    ...document.querySelectorAll(".organizer-layout"),
    ...document.querySelectorAll(".draft-type-tabs"),
    ...document.querySelectorAll(".draft-layout"),
    ...document.querySelectorAll(".saved-drafts-section")
  ].filter((element, index, list) => list.indexOf(element) === index);
  candidates.forEach((element) => element.classList.add("xp-reveal"));
  root.classList.add("xp-ready");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("xp-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.06 });
  candidates.forEach((element) => observer.observe(element));
}

function setupTilt() {
  if (window.matchMedia("(pointer: coarse)").matches || reducedMotion) return;
  const selectors = [
    ".module-card", ".condition-card", ".checker-form", ".checker-result",
    ".score-group", ".material-card", ".risk-card", ".source-link",
    ".audit-score-card", ".file-library", ".profile-panel", ".organizer-group",
    ".draft-input-panel", ".draft-preview-panel", ".context-panel", ".progress-card",
    ".panel", ".dropzone-card", ".category-rail", ".organizer-side", ".policy-card"
  ];
  document.querySelectorAll(selectors.join(",")).forEach((element) => {
    element.classList.add("xp-tilt");
    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      element.style.setProperty("--xp-tilt-x", `${(0.5 - y) * 2.4}deg`);
      element.style.setProperty("--xp-tilt-y", `${(x - 0.5) * 2.8}deg`);
      element.style.setProperty("--xp-shine-x", `${x * 100}%`);
      element.style.setProperty("--xp-shine-y", `${y * 100}%`);
    });
    element.addEventListener("pointerleave", () => {
      element.style.setProperty("--xp-tilt-x", "0deg");
      element.style.setProperty("--xp-tilt-y", "0deg");
    });
  });
}

function setupCursor(cursor) {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  root.classList.add("xp-fine-pointer");
  window.addEventListener("pointermove", (event) => {
    cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    cursor.classList.add("is-visible");
  }, { passive: true });
  document.addEventListener("pointerover", (event) => {
    const interactive = event.target.closest("a, button, input, select, textarea, summary");
    cursor.classList.toggle("is-active", Boolean(interactive));
    const label = interactive?.getAttribute("data-cursor");
    const output = cursor.querySelector("b");
    if (label) {
      output.textContent = label;
      output.classList.add("has-label");
    } else {
      output.textContent = "";
      output.classList.remove("has-label");
    }
  });
  document.addEventListener("pointerleave", () => cursor.classList.remove("is-visible"));
}

function setupScroll(progress) {
  let ticking = false;
  const update = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    state.scroll = window.scrollY;
    const ratio = Math.min(1, window.scrollY / max);
    root.style.setProperty("--xp-scroll", ratio.toFixed(4));
    progress.querySelector("i").style.width = `${ratio * 100}%`;
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  update();
}

function setupNavigationTransition(transition) {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !url.pathname.endsWith(".html")) return;
    event.preventDefault();
    transition.classList.add("is-active");
    window.setTimeout(() => { location.href = url.href; }, reducedMotion ? 20 : 260);
  });
  window.addEventListener("pageshow", () => transition.classList.remove("is-active"));
}

function setupClickFeedback() {
  document.addEventListener("pointerdown", (event) => {
    const interactive = event.target.closest("button, a, .condition-card, .module-card, .xp-tilt");
    if (!interactive || reducedMotion) return;
    interactive.classList.remove("xp-clicked");
    void interactive.offsetWidth;
    interactive.classList.add("xp-clicked");
    window.setTimeout(() => interactive.classList.remove("xp-clicked"), 520);
  });
}

function setupClock() {
  const clock = document.getElementById("xp-clock");
  const tick = () => {
    clock.textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  };
  tick();
  window.setInterval(tick, 1000);
}

function init() {
  const overlays = createOverlayLayers();
  try {
    initScene(overlays.canvas);
  } catch (error) {
    console.warn("WebGL experience unavailable; using static fallback.", error);
    overlays.canvas.classList.add("is-unavailable");
    root.classList.add("xp-no-webgl");
  }
  setupReveal();
  setupTilt();
  setupCursor(overlays.cursor);
  setupScroll(overlays.progress);
  setupNavigationTransition(overlays.transition);
  setupClickFeedback();
  setupClock();
  window.setTimeout(() => overlays.loader.classList.add("is-hidden"), reducedMotion ? 20 : 620);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
