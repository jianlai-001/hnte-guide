import * as THREE from "three";
import { geoCentroid, geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import guangdongGeo from "../data/guangdong.geo.json";
import {
  CITIES,
  CITY_BY_CODE,
  OFFICIAL_SOURCES,
  PROVINCE_RECOGNIZED_2025,
  SHENZHEN_BATCH_2025,
  VERIFIED_AT
} from "./guangdong-data.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";
const GLOBE_RADIUS = 2;
const CITY_RADIUS = GLOBE_RADIUS + 0.025;
const GUANGDONG_CENTER = [113.2665, 23.1322];
const LABEL_OFFSETS = {
  shaoguan: [-18, -27],
  qingyuan: [-24, -11],
  heyuan: [24, -16],
  meizhou: [25, 2],
  chaozhou: [26, -8],
  jieyang: [22, 12],
  shantou: [32, 24],
  zhaoqing: [-28, 2],
  foshan: [-21, 12],
  guangzhou: [-20, -18],
  huizhou: [28, -15],
  dongguan: [20, -3],
  shenzhen: [31, 17],
  zhongshan: [-8, 20],
  zhuhai: [24, 33],
  jiangmen: [-31, 19],
  yunfu: [-31, 1],
  yangjiang: [-25, 17],
  maoming: [-30, -1],
  zhanjiang: [-20, 29],
  shanwei: [24, 4]
};

const formatter = new Intl.NumberFormat("zh-CN");
const orderedCities = [...CITIES].sort((a, b) => b.count2025 - a.count2025);
const cityDataById = new Map(CITIES.map((city) => [city.id, city]));
const cityFeatures = guangdongGeo.features.map((item) => ({
  ...item,
  geometry: {
    ...item.geometry,
    coordinates: item.geometry.coordinates.map((polygon) =>
      polygon.map((ring) => ring.slice().reverse())
    )
  }
}));
const featureByCode = new Map(cityFeatures.map((item) => [String(item.properties.adcode), item]));

const state = {
  selectedCityId: "shenzhen",
  mapProjection: null,
  mapPaths: new Map(),
  mapLabels: new Map(),
  markerMeshes: [],
  selectedMarkerPosition: null,
  cameraTarget: {
    lon: GUANGDONG_CENTER[0],
    lat: GUANGDONG_CENTER[1],
    distance: 6.2
  },
  cameraCurrent: {
    lon: GUANGDONG_CENTER[0],
    lat: GUANGDONG_CENTER[1],
    distance: 8.6
  },
  dragging: false,
  pointerStart: null,
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
};

function latLonToVector3(lon, lat, radius) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function cameraPosition(lon, lat, distance) {
  return latLonToVector3(lon, lat, distance);
}

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(120, 248, 255, 1)");
  gradient.addColorStop(0.15, "rgba(61, 228, 255, 0.88)");
  gradient.addColorStop(0.44, "rgba(61, 228, 255, 0.22)");
  gradient.addColorStop(1, "rgba(61, 228, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addGlobeLineGeometry(parent, geometry, options = {}) {
  const radius = options.radius || GLOBE_RADIUS + 0.008;
  const positions = [];

  function addRing(ring) {
    for (let index = 0; index < ring.length - 1; index += 1) {
      const first = latLonToVector3(ring[index][0], ring[index][1], radius);
      const second = latLonToVector3(ring[index + 1][0], ring[index + 1][1], radius);
      positions.push(first.x, first.y, first.z, second.x, second.y, second.z);
    }
  }

  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach(addRing);
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon) => polygon.forEach(addRing));
  }

  if (!positions.length) return null;
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: options.color || 0x1b9bcc,
    transparent: true,
    opacity: options.opacity ?? 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const lines = new THREE.LineSegments(lineGeometry, material);
  parent.add(lines);
  return lines;
}

function buildGlobe() {
  const canvas = document.getElementById("globe-canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  const sphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 96, 64);
  const sphereMaterial = new THREE.MeshPhongMaterial({
    color: 0x03101e,
    emissive: 0x011322,
    emissiveIntensity: 0.7,
    specular: 0x2aa4ce,
    shininess: 18,
    transparent: true,
    opacity: 0.9
  });
  globeGroup.add(new THREE.Mesh(sphereGeometry, sphereMaterial));

  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0x1596c7,
    wireframe: true,
    transparent: true,
    opacity: 0.075,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS + 0.002, 36, 24), wireMaterial));

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS * 1.075, 64, 48),
    new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float rim = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.4);
          gl_FragColor = vec4(0.03, 0.62, 1.0, rim * 0.55);
        }
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false
    })
  );
  globeGroup.add(atmosphere);

  const worldFeatures = feature(worldAtlas, worldAtlas.objects.countries).features;
  worldFeatures.forEach((country) => {
    addGlobeLineGeometry(globeGroup, country.geometry, {
      radius: GLOBE_RADIUS + 0.012,
      color: 0x27b7df,
      opacity: 0.28
    });
  });

  cityFeatures.forEach((cityFeature) => {
    addGlobeLineGeometry(globeGroup, cityFeature.geometry, {
      radius: GLOBE_RADIUS + 0.026,
      color: 0x57e8ff,
      opacity: 0.82
    });
  });

  const dotPositions = [];
  for (let lat = -78; lat <= 78; lat += 3) {
    const circumference = Math.cos(THREE.MathUtils.degToRad(lat));
    const longitudeStep = Math.max(2.2, 3.4 / Math.max(circumference, 0.15));
    for (let lon = -180; lon < 180; lon += longitudeStep) {
      const point = latLonToVector3(lon, lat, GLOBE_RADIUS + 0.008);
      dotPositions.push(point.x, point.y, point.z);
    }
  }
  const dotGeometry = new THREE.BufferGeometry();
  dotGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dotPositions, 3));
  globeGroup.add(new THREE.Points(
    dotGeometry,
    new THREE.PointsMaterial({
      color: 0x55dfff,
      size: 0.009,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  ));

  const glowTexture = createGlowTexture();
  const maxCount = Math.max(...CITIES.map((city) => city.count2025));
  const cityMeshes = [];
  cityFeatures.forEach((cityFeature) => {
    const city = CITY_BY_CODE.get(String(cityFeature.properties.adcode));
    if (!city) return;
    const [lon, lat] = geoCentroid(cityFeature);
    const position = latLonToVector3(lon, lat, CITY_RADIUS);
    const intensity = Math.log10(city.count2025 + 1) / Math.log10(maxCount + 1);
    const color = new THREE.Color().setHSL(0.53 - intensity * 0.04, 0.92, 0.46 + intensity * 0.3);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.014 + intensity * 0.013, 10, 10),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
    );
    core.position.copy(position);
    core.userData = { cityId: city.id, lon, lat, position };
    globeGroup.add(core);

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture,
      color,
      transparent: true,
      opacity: 0.38 + intensity * 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    sprite.position.copy(position.clone().multiplyScalar(1.012));
    const scale = 0.08 + intensity * 0.11;
    sprite.scale.set(scale, scale, 1);
    globeGroup.add(sprite);
    cityMeshes.push({ core, sprite, city, position, intensity });
  });

  const selectedRing = new THREE.Mesh(
    new THREE.RingGeometry(0.055, 0.063, 48),
    new THREE.MeshBasicMaterial({
      color: 0x7af4ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  globeGroup.add(selectedRing);

  const orbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(GLOBE_RADIUS * 1.22, 0.003, 6, 160),
    new THREE.MeshBasicMaterial({
      color: 0x166dac,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  orbitRing.rotation.x = Math.PI / 2.9;
  orbitRing.rotation.z = -0.28;
  globeGroup.add(orbitRing);

  const starPositions = [];
  const random = seededRandom(42);
  for (let index = 0; index < 1600; index += 1) {
    const radius = 10 + random() * 22;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    starPositions.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0x7ac9ff,
      size: 0.025,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  scene.add(stars);

  const ambient = new THREE.AmbientLight(0x699fc7, 1.25);
  const keyLight = new THREE.DirectionalLight(0x72e7ff, 2.4);
  keyLight.position.set(-4, 5, 7);
  const rimLight = new THREE.DirectionalLight(0x1378ff, 1.8);
  rimLight.position.set(5, -3, -4);
  scene.add(ambient, keyLight, rimLight);

  function updateSelectedMarker() {
    const city = cityDataById.get(state.selectedCityId);
    const cityFeature = featureByCode.get(city.code);
    const [lon, lat] = geoCentroid(cityFeature);
    const position = latLonToVector3(lon, lat, CITY_RADIUS * 1.012);
    selectedRing.position.copy(position);
    selectedRing.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      position.clone().normalize()
    );
    state.selectedMarkerPosition = position;
  }
  updateSelectedMarker();
  state.updateGlobeSelection = updateSelectedMarker;

  const animationStart = performance.now();
  function animate(now) {
    const elapsed = (now - animationStart) / 1000;
    state.cameraCurrent.lon += (state.cameraTarget.lon - state.cameraCurrent.lon) * 0.045;
    state.cameraCurrent.lat += (state.cameraTarget.lat - state.cameraCurrent.lat) * 0.045;
    state.cameraCurrent.distance += (state.cameraTarget.distance - state.cameraCurrent.distance) * 0.055;
    camera.position.copy(cameraPosition(
      state.cameraCurrent.lon,
      state.cameraCurrent.lat,
      state.cameraCurrent.distance
    ));
    camera.lookAt(0, 0, 0);

    const pulse = state.reducedMotion ? 1 : 1 + Math.sin(elapsed * 2.4) * 0.22;
    selectedRing.scale.setScalar(pulse);
    selectedRing.material.opacity = state.reducedMotion ? 0.8 : 0.48 + Math.sin(elapsed * 2.4) * 0.24;
    orbitRing.rotation.y = elapsed * 0.045;
    stars.rotation.y = elapsed * 0.002;
    cityMeshes.forEach((entry, index) => {
      const strength = state.reducedMotion ? 1 : 0.9 + Math.sin(elapsed * 1.6 + index) * 0.14;
      entry.sprite.scale.setScalar((0.08 + entry.intensity * 0.11) * strength);
    });
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  function resize() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize, { passive: true });

  return {
    focus(lon, lat, distance = 5.4) {
      state.cameraTarget.lon = lon;
      state.cameraTarget.lat = lat;
      state.cameraTarget.distance = distance;
    },
    reset() {
      state.cameraTarget.lon = GUANGDONG_CENTER[0];
      state.cameraTarget.lat = GUANGDONG_CENTER[1];
      state.cameraTarget.distance = 6.2;
    },
    rotate(deltaLon, deltaLat) {
      state.cameraTarget.lon += deltaLon;
      state.cameraTarget.lat = Math.max(-72, Math.min(72, state.cameraTarget.lat + deltaLat));
    },
    zoom(delta) {
      state.cameraTarget.distance = Math.max(4.1, Math.min(9, state.cameraTarget.distance + delta));
    }
  };
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function colorForCount(count) {
  const intensity = Math.log10(count + 1) / Math.log10(SHENZHEN_BATCH_2025 + 1);
  return {
    fill: `rgba(${Math.round(12 + intensity * 35)}, ${Math.round(58 + intensity * 120)}, ${Math.round(86 + intensity * 130)}, ${0.44 + intensity * 0.28})`,
    stroke: `rgba(${Math.round(50 + intensity * 90)}, ${Math.round(190 + intensity * 55)}, 245, ${0.52 + intensity * 0.3})`
  };
}

function buildCityRanking() {
  const container = document.getElementById("city-ranking");
  container.innerHTML = orderedCities.map((city, index) => `
    <button class="city-rank-row ${city.id === state.selectedCityId ? "is-selected" : ""}"
      type="button" data-city-id="${city.id}" data-sz="${city.id === "shenzhen"}"
      style="--share:${Math.max(3, city.count2025 / orderedCities[0].count2025 * 100)}%"
      aria-pressed="${city.id === state.selectedCityId}">
      <span class="rank-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="rank-city">${city.name}</span>
      <span class="rank-value">${formatter.format(city.count2025)}</span>
    </button>
  `).join("");
  container.querySelectorAll("[data-city-id]").forEach((button) => {
    button.addEventListener("click", () => selectCity(button.dataset.cityId, true));
  });
}

function createSvgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function buildMap() {
  const projection = geoMercator().fitExtent(
    [[48, 34], [652, 500]],
    { ...guangdongGeo, features: cityFeatures }
  );
  const pathBuilder = geoPath(projection);
  state.mapProjection = projection;
  const grid = document.querySelector(".map-grid");
  for (let x = 75; x < 700; x += 70) {
    grid.append(createSvgElement("line", { x1: x, y1: 0, x2: x, y2: 540 }));
  }
  for (let y = 45; y < 540; y += 70) {
    grid.append(createSvgElement("line", { x1: 0, y1: y, x2: 700, y2: y }));
  }

  const pathsGroup = document.getElementById("map-paths");
  cityFeatures.forEach((cityFeature) => {
    const city = CITY_BY_CODE.get(String(cityFeature.properties.adcode));
    if (!city) return;
    const color = colorForCount(city.count2025);
    const path = createSvgElement("path", {
      d: pathBuilder(cityFeature),
      class: "city-map-path",
      "data-city-id": city.id,
      role: "img",
      "aria-label": `${city.fullName}，2025年认定或备案${city.count2025}家`
    });
    path.style.setProperty("--city-fill", color.fill);
    path.style.setProperty("--city-stroke", color.stroke);
    path.style.setProperty("--city-selected-fill", `rgba(33, 167, 218, 0.72)`);
    path.addEventListener("click", () => selectCity(city.id, true));
    path.addEventListener("pointerenter", (event) => showTooltip(event, city));
    path.addEventListener("pointermove", moveTooltip);
    path.addEventListener("pointerleave", hideTooltip);
    pathsGroup.append(path);
    state.mapPaths.set(city.id, path);
  });

  const leaders = document.getElementById("map-leaders");
  const labels = document.getElementById("map-city-labels");
  orderedCities.slice().reverse().forEach((city) => {
    const cityFeature = featureByCode.get(city.code);
    const point = projection(geoCentroid(cityFeature));
    if (!point) return;
    const offset = LABEL_OFFSETS[city.id] || [0, 0];
    const labelX = point[0] + offset[0];
    const labelY = point[1] + offset[1];
    const leader = createSvgElement("line", {
      x1: point[0],
      y1: point[1],
      x2: labelX,
      y2: labelY
    });
    const dot = createSvgElement("circle", {
      cx: point[0],
      cy: point[1],
      r: city.id === "shenzhen" ? 3.2 : 2.1
    });
    leaders.append(leader, dot);
    const label = document.createElement("button");
    label.type = "button";
    label.className = `map-city-label ${city.id === "shenzhen" ? "is-selected" : ""} ${orderedCities.indexOf(city) > 9 ? "is-secondary" : ""}`;
    label.dataset.cityId = city.id;
    label.dataset.sz = String(city.id === "shenzhen");
    label.style.left = `${(labelX / 700) * 100}%`;
    label.style.top = `${(labelY / 540) * 100}%`;
    label.setAttribute("aria-label", `${city.name}，${formatter.format(city.count2025)}家`);
    label.textContent = city.name;
    label.addEventListener("click", () => selectCity(city.id, true));
    label.addEventListener("pointerenter", (event) => showTooltip(event, city));
    label.addEventListener("pointermove", moveTooltip);
    label.addEventListener("pointerleave", hideTooltip);
    labels.append(label);
    state.mapLabels.set(city.id, label);
  });

  const select = document.getElementById("mobile-city-select");
  if (select) {
    select.innerHTML = orderedCities.map((city) => `<option value="${city.id}">${city.name} · ${formatter.format(city.count2025)}</option>`).join("");
    select.value = state.selectedCityId;
    select.addEventListener("change", () => selectCity(select.value, true));
  }
}

function showTooltip(event, city) {
  const tooltip = document.getElementById("map-tooltip");
  tooltip.innerHTML = `<strong>${city.fullName}</strong><br>2025 名录 ${formatter.format(city.count2025)} 家<br><span>${city.countNote}</span>`;
  tooltip.classList.add("is-visible");
  moveTooltip(event);
}

function moveTooltip(event) {
  const tooltip = document.getElementById("map-tooltip");
  tooltip.style.left = `${Math.min(window.innerWidth - 160, event.clientX + 10)}px`;
  tooltip.style.top = `${Math.min(window.innerHeight - 80, event.clientY + 10)}px`;
}

function hideTooltip() {
  document.getElementById("map-tooltip").classList.remove("is-visible");
}

function updateSelectionDetails(city) {
  document.getElementById("selected-city-name").textContent = city.name;
  document.getElementById("selected-city-code").textContent = city.code;
  document.getElementById("selected-count").textContent = formatter.format(city.count2025);
  document.getElementById("selected-count-note").textContent = city.id === "shenzhen"
    ? "深圳首批备案名录；深圳高企认定工作单独组织。"
    : `${city.countNote}；非当前有效存量。`;
  const detailIndex = orderedCities.findIndex((item) => item.id === city.id) + 1;
  document.getElementById("detail-index").textContent = String(detailIndex).padStart(2, "0");

  const share = city.id === "shenzhen" ? null : city.count2025 / PROVINCE_RECOGNIZED_2025;
  document.getElementById("selected-share").textContent = share === null
    ? "深圳单列"
    : `${(share * 100).toFixed(2)}%`;
  document.getElementById("selected-share-bar").style.width = share === null
    ? "100%"
    : `${Math.max(2, share * 100)}%`;
  document.getElementById("selected-share-bar").style.background = share === null
    ? "linear-gradient(90deg, #ff713d, #ffb16e)"
    : "";

  const phone = document.getElementById("city-phone");
  phone.textContent = city.phone.split("、")[0];
  phone.href = `tel:${city.phone.split("、")[0].replace(/[^\d+]/g, "")}`;
  const portal = document.getElementById("city-portal");
  portal.href = city.portal;

  const localPolicy = document.getElementById("local-policy-link");
  const title = document.getElementById("local-policy-title");
  const meta = document.getElementById("local-policy-meta");
  if (city.localPolicy) {
    localPolicy.href = city.localPolicy.url;
    title.textContent = city.localPolicy.title;
    meta.textContent = `${city.localPolicy.subtitle} · ${city.localPolicy.date}`;
  } else {
    localPolicy.href = city.portal;
    title.textContent = `${city.name}科技主管部门政策入口`;
    meta.textContent = "查看本地通知、申报批次和联系方式";
  }

  document.querySelectorAll("[data-city-id]").forEach((element) => {
    const active = element.dataset.cityId === city.id;
    element.classList.toggle("is-selected", active);
    if (element.matches("button")) element.setAttribute("aria-pressed", String(active));
  });
  const select = document.getElementById("mobile-city-select");
  if (select) select.value = city.id;
  state.updateGlobeSelection?.();
}

function selectCity(cityId, focusGlobe) {
  const city = cityDataById.get(cityId);
  if (!city) return;
  state.selectedCityId = cityId;
  updateSelectionDetails(city);
  if (focusGlobe) {
    const cityFeature = featureByCode.get(city.code);
    const [lon, lat] = geoCentroid(cityFeature);
    window.globeController?.focus(lon, lat, 5.2);
  }
}

function setupGlobeControls(controller) {
  document.getElementById("focus-guangdong").addEventListener("click", () => {
    controller.reset();
  });

  const zone = document.getElementById("globe-zone");
  const canvas = document.getElementById("globe-canvas");
  let drag = null;
  canvas.addEventListener("pointerdown", (event) => {
    drag = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    state.cameraTarget.lon -= dx * 0.22;
    state.cameraTarget.lat = Math.max(-70, Math.min(70, state.cameraTarget.lat + dy * 0.16));
    drag = { x: event.clientX, y: event.clientY };
  });
  const release = () => { drag = null; };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    controller.zoom(event.deltaY * 0.003);
  }, { passive: false });

  let touchDistance = null;
  canvas.addEventListener("touchstart", (event) => {
    if (event.touches.length === 2) {
      touchDistance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
    }
  }, { passive: true });
  canvas.addEventListener("touchmove", (event) => {
    if (event.touches.length !== 2 || !touchDistance) return;
    const next = Math.hypot(
      event.touches[0].clientX - event.touches[1].clientX,
      event.touches[0].clientY - event.touches[1].clientY
    );
    controller.zoom((touchDistance - next) * 0.01);
    touchDistance = next;
  }, { passive: true });
  canvas.addEventListener("touchend", () => { touchDistance = null; }, { passive: true });
}

function init() {
  if (cityFeatures.length !== 21) {
    console.warn("Guangdong GeoJSON city count is not 21:", cityFeatures.length);
  }
  buildCityRanking();
  buildMap();
  const controller = buildGlobe();
  window.globeController = controller;
  setupGlobeControls(controller);
  selectCity(state.selectedCityId, false);
  document.documentElement.dataset.verifiedAt = VERIFIED_AT;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
