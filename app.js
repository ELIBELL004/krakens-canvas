const STORAGE_KEY = "krakens-canvas-v2";

const board = document.querySelector("#board");
const canvas = document.querySelector("#inkCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const staticLayer = document.createElement("canvas");
const staticCtx = staticLayer.getContext("2d", { alpha: true });
const inkLayer = document.createElement("canvas");
const inkCtx = inkLayer.getContext("2d", { alpha: true });

const pageTabs = document.querySelector("#pageTabs");
const addPageButton = document.querySelector("#addPageButton");
const brushSelect = document.querySelector("#brushSelect");
const sizeInput = document.querySelector("#sizeInput");
const spillInput = document.querySelector("#spillInput");
const smoothInput = document.querySelector("#smoothInput");
const gridInput = document.querySelector("#gridInput");
const gridToggle = document.querySelector("#gridToggle");
const focusToggle = document.querySelector("#focusToggle");
const themeToggle = document.querySelector("#themeToggle");
const colorInput = document.querySelector("#colorInput");
const pressureMeter = document.querySelector("#pressureMeter");
const pressureValue = document.querySelector("#pressureValue");
const deviceStatus = document.querySelector("#deviceStatus");
const undoButton = document.querySelector("#undoButton");
const redoButton = document.querySelector("#redoButton");
const clearButton = document.querySelector("#clearButton");
const saveButton = document.querySelector("#saveButton");
const pinButton = document.querySelector("#pinButton");
const shareButton = document.querySelector("#shareButton");
const autoShareToggle = document.querySelector("#autoShareToggle");
const eraserCursor = document.querySelector("#eraserCursor");
const toolButtons = Array.from(document.querySelectorAll("[data-tool]"));
const surfaceButtons = Array.from(document.querySelectorAll("[data-surface]"));
const swatchButtons = Array.from(document.querySelectorAll("[data-color]"));
const toolbar = document.querySelector(".toolbar");
const nativeApi = window.krakensNative;

const legacyPalette = ["#f5f5f5", "#9fd3ff", "#ffc46b", "#ff8ca3", "#8ff0bf"];
const defaultPalette = ["#e2e0da", "#86adc4", "#c99d5d", "#c9667c", "#78b690"];
const defaultSurface = "black-grid";
const surfaces = {
  "black-grid": {
    bg: "#050505",
    grid: true,
    line: "rgba(168, 168, 168, 0.28)",
    lineStrong: "rgba(190, 190, 190, 0.5)",
    name: "black grid",
  },
  "black-blank": {
    bg: "#050505",
    grid: false,
    line: "rgba(168, 168, 168, 0.28)",
    lineStrong: "rgba(190, 190, 190, 0.5)",
    name: "blank black",
  },
  "white-blank": {
    bg: "#ecece6",
    grid: false,
    line: "rgba(40, 40, 40, 0.18)",
    lineStrong: "rgba(40, 40, 40, 0.3)",
    name: "blank white",
  },
  "sepia-blank": {
    bg: "#ddd2b9",
    grid: false,
    line: "rgba(74, 58, 36, 0.16)",
    lineStrong: "rgba(74, 58, 36, 0.28)",
    name: "blank sepia",
  },
};

const brushProfiles = {
  ink: { alpha: 0.9, label: "ink", maxWidth: 58, spill: true, width: 1 },
  marker: { alpha: 0.34, label: "marker", maxWidth: 54, spill: false, width: 1.65 },
  pencil: { alpha: 0.34, label: "pencil", maxWidth: 26, spill: false, width: 0.6 },
  calligraphy: { alpha: 0.84, label: "calligraphy", maxWidth: 36, spill: false, width: 1.02 },
  spray: { alpha: 0.24, label: "spray", maxWidth: 34, spill: true, width: 1.08 },
};

const state = {
  activePointerId: null,
  brush: "ink",
  canvasRect: null,
  currentStroke: null,
  currentTool: "pen",
  drawing: false,
  dpr: 1,
  history: [],
  inkColor: defaultPalette[0],
  lastPanPoint: null,
  palette: [...defaultPalette],
  pages: [],
  redoStack: [],
  renderQueued: false,
  selectedPaletteIndex: 0,
  spaceDown: false,
  staticLayerDirty: true,
  theme: "dark",
};

function uid() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createPage(index, options = {}) {
  return {
    id: uid(),
    name: `Page ${index}`,
    surface: options.surface || defaultSurface,
    strokes: [],
    view: { x: 0, y: 0, scale: 1 },
  };
}

function activePage() {
  return state.pages.find((page) => page.id === state.activePageId) || state.pages[0];
}

function normalizePage(page, index) {
  return {
    id: page.id || uid(),
    name: page.name || `Page ${index + 1}`,
    surface: surfaces[page.surface] ? page.surface : defaultSurface,
    strokes: Array.isArray(page.strokes) ? page.strokes : [],
    view: page.view || { x: 0, y: 0, scale: 1 },
  };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    state.pages = [createPage(1)];
    state.activePageId = state.pages[0].id;
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    state.pages = Array.isArray(parsed.pages) && parsed.pages.length
      ? parsed.pages.map(normalizePage)
      : [createPage(1)];
    state.activePageId = parsed.activePageId || state.pages[0].id;
    state.palette = normalizePalette(parsed.palette);
    state.inkColor = remapLegacyColor(parsed.inkColor || state.palette[0]);
    state.selectedPaletteIndex = Number.isInteger(parsed.selectedPaletteIndex)
      ? Math.min(Math.max(parsed.selectedPaletteIndex, 0), state.palette.length - 1)
      : 0;

    const settings = parsed.settings || {};
    sizeInput.value = settings.size || sizeInput.value;
    spillInput.value = settings.spill || spillInput.value;
    smoothInput.value = settings.smooth || smoothInput.value;
    gridInput.value = settings.grid || gridInput.value;
    gridToggle.checked = settings.gridVisible !== false;
    focusToggle.checked = settings.focusMode === true;
    autoShareToggle.checked = settings.autoShare === true;
    state.brush = brushProfiles[settings.brush] ? settings.brush : "ink";
    state.theme = settings.theme === "light" ? "light" : "dark";
    brushSelect.value = state.brush;
    themeToggle.checked = state.theme === "light";
  } catch {
    state.pages = [createPage(1)];
    state.activePageId = state.pages[0].id;
  }
}

let saveTimer = 0;
function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveNow, 250);
}

function saveNow() {
  const payload = {
    activePageId: state.activePageId,
    inkColor: state.inkColor,
    palette: state.palette,
    selectedPaletteIndex: state.selectedPaletteIndex,
    pages: state.pages,
    settings: {
      focusMode: focusToggle.checked,
      autoShare: autoShareToggle.checked,
      grid: gridInput.value,
      gridVisible: gridToggle.checked,
      size: sizeInput.value,
      smooth: smoothInput.value,
      spill: spillInput.value,
      brush: state.brush,
      theme: state.theme,
    },
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

async function refreshNativeState() {
  if (!nativeApi) {
    pinButton.disabled = true;
    shareButton.disabled = true;
    autoShareToggle.disabled = true;
    pinButton.title = "Launch Krakens Canvas with Start Inkboard.cmd to use native pinning.";
    shareButton.title = "Launch Krakens Canvas with Start Inkboard.cmd to share snapshots.";
    return;
  }

  try {
    const isPinned = await nativeApi.getAlwaysOnTop();
    updatePinButton(isPinned);
  } catch {
    deviceStatus.textContent = "native controls unavailable";
  }
}

function updatePinButton(isPinned) {
  pinButton.classList.toggle("is-active", isPinned);
  pinButton.textContent = isPinned ? "Pinned" : "Pin";
  pinButton.setAttribute("aria-pressed", String(isPinned));
}

function getCanvasRect() {
  if (!state.canvasRect) {
    state.canvasRect = canvas.getBoundingClientRect();
  }

  return state.canvasRect;
}

function resizeCanvas() {
  state.canvasRect = canvas.getBoundingClientRect();
  const rect = getCanvasRect();
  state.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
  canvas.width = Math.max(1, Math.round(rect.width * state.dpr));
  canvas.height = Math.max(1, Math.round(rect.height * state.dpr));
  staticLayer.width = canvas.width;
  staticLayer.height = canvas.height;
  inkLayer.width = canvas.width;
  inkLayer.height = canvas.height;

  state.pages.forEach((page) => {
    if (!page.view) page.view = { x: rect.width / 2, y: rect.height / 2, scale: 1 };
    if (page.view.x === 0 && page.view.y === 0 && page.strokes.length === 0) {
      page.view.x = rect.width / 2;
      page.view.y = rect.height / 2;
    }
  });

  invalidateStaticLayer();
  requestRender();
}

function worldToScreen(point, view = activePage().view) {
  return {
    x: point.x * view.scale + view.x,
    y: point.y * view.scale + view.y,
  };
}

function screenToWorld(clientX, clientY) {
  const rect = getCanvasRect();
  const view = activePage().view;
  return {
    x: (clientX - rect.left - view.x) / view.scale,
    y: (clientY - rect.top - view.y) / view.scale,
  };
}

function eventPressure(event) {
  if (event.pressure > 0) return event.pressure;
  if (event.buttons) return 0.5;
  return 0;
}

function updatePressure(pressure) {
  const value = Math.max(0, Math.min(1, pressure || 0));
  pressureMeter.value = value;
  pressureValue.value = value.toFixed(2);
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const number = Number.parseInt(normalized, 16);

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function rgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function remapLegacyColor(color) {
  const index = legacyPalette.findIndex((item) => item.toLowerCase() === String(color).toLowerCase());
  return index >= 0 ? defaultPalette[index] : color;
}

function normalizePalette(palette) {
  const source = Array.isArray(palette) && palette.length ? palette : defaultPalette;
  return defaultPalette.map((fallback, index) => remapLegacyColor(source[index] || fallback));
}

function strokeWidth(stroke, pressure) {
  const shaped = Math.pow(Math.max(pressure, 0.08), 0.72);
  const multiplier = stroke.tool === "eraser" ? 1.8 : 1.45;
  const profile = brushProfiles[stroke.brush] || brushProfiles.ink;
  const brushWidth = stroke.tool === "eraser" ? 1 : profile.width;
  const width = stroke.baseSize * brushWidth * (0.22 + shaped * multiplier);
  return stroke.tool === "eraser" ? width : Math.min(width, profile.maxWidth);
}

function pointSpacing(stroke) {
  if (stroke.tool === "eraser") {
    return Math.max(0.7, Math.min(2.4, stroke.baseSize * 0.04));
  }

  if (stroke.brush === "spray") {
    return Math.max(1.2, Math.min(3.4, stroke.baseSize * 0.06));
  }

  if (stroke.brush === "pencil") {
    return Math.max(0.5, Math.min(1.8, stroke.baseSize * 0.03));
  }

  return Math.max(0.65, Math.min(2.8, stroke.baseSize * 0.045));
}

function responsivePressure(pressure) {
  return Math.pow(Math.max(pressure, 0.16), 0.58);
}

function requestRender() {
  if (state.renderQueued) return;
  state.renderQueued = true;
  requestAnimationFrame(render);
}

function invalidateStaticLayer() {
  state.staticLayerDirty = true;
}

function rebuildStaticLayer(page) {
  staticCtx.setTransform(1, 0, 0, 1, 0, 0);
  staticCtx.clearRect(0, 0, staticLayer.width, staticLayer.height);
  staticCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  staticCtx.lineCap = "round";
  staticCtx.lineJoin = "round";
  staticCtx.translate(page.view.x, page.view.y);
  staticCtx.scale(page.view.scale, page.view.scale);
  page.strokes.forEach((stroke) => drawStroke(staticCtx, stroke));
  state.staticLayerDirty = false;
}

function render() {
  state.renderQueued = false;
  const rect = getCanvasRect();
  const page = activePage();
  const surface = surfaces[page.surface] || surfaces[defaultSurface];

  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.fillStyle = surface.bg;
  ctx.fillRect(0, 0, rect.width, rect.height);

  if (surface.grid && gridToggle.checked) {
    drawGrid(ctx, rect.width, rect.height, page.view, surface);
  }

  if (state.staticLayerDirty) {
    rebuildStaticLayer(page);
  }

  if (!state.currentStroke) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(staticLayer, 0, 0);
    return;
  }

  inkCtx.setTransform(1, 0, 0, 1, 0, 0);
  inkCtx.clearRect(0, 0, inkLayer.width, inkLayer.height);
  if (state.currentStroke.tool === "eraser") {
    inkCtx.drawImage(staticLayer, 0, 0);
  }
  inkCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  inkCtx.lineCap = "round";
  inkCtx.lineJoin = "round";
  inkCtx.translate(page.view.x, page.view.y);
  inkCtx.scale(page.view.scale, page.view.scale);

  drawStroke(inkCtx, state.currentStroke);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (state.currentStroke.tool !== "eraser") {
    ctx.drawImage(staticLayer, 0, 0);
  }
  ctx.drawImage(inkLayer, 0, 0);
}

async function shareSnapshot(options = {}) {
  if (!nativeApi) return null;

  render();
  const page = activePage();
  const result = await nativeApi.saveSnapshot({
    activePageName: page.name,
    dataUrl: canvas.toDataURL("image/png"),
    viewport: {
      scale: page.view.scale,
      x: page.view.x,
      y: page.view.y,
    },
  });

  if (!options.quiet) {
    shareButton.classList.add("is-active");
    window.setTimeout(() => shareButton.classList.remove("is-active"), 650);
    deviceStatus.textContent = "shared for Codex";
  }

  return result;
}

let autoShareTimer = 0;
function scheduleAutoShare() {
  if (!nativeApi || !autoShareToggle.checked) return;

  window.clearTimeout(autoShareTimer);
  autoShareTimer = window.setTimeout(() => {
    shareSnapshot({ quiet: true })
      .then(() => {
        deviceStatus.textContent = "auto-shared";
      })
      .catch(() => {
        deviceStatus.textContent = "share failed";
      });
  }, 400);
}

function drawGrid(targetCtx, width, height, view, surface = surfaces[defaultSurface]) {
  const grid = Number(gridInput.value);
  const major = grid * 4;
  const startX = Math.floor((-view.x / view.scale) / grid) * grid;
  const endX = Math.ceil(((width - view.x) / view.scale) / grid) * grid;
  const startY = Math.floor((-view.y / view.scale) / grid) * grid;
  const endY = Math.ceil(((height - view.y) / view.scale) / grid) * grid;

  targetCtx.save();
  targetCtx.lineWidth = 1;

  for (let x = startX; x <= endX; x += grid) {
    const screen = worldToScreen({ x, y: 0 }, view).x;
    const isMajor = Math.abs(Math.round(x / major) * major - x) < 0.01;
    targetCtx.strokeStyle = isMajor ? surface.lineStrong : surface.line;
    targetCtx.beginPath();
    targetCtx.moveTo(Math.round(screen) + 0.5, 0);
    targetCtx.lineTo(Math.round(screen) + 0.5, height);
    targetCtx.stroke();
  }

  for (let y = startY; y <= endY; y += grid) {
    const screen = worldToScreen({ x: 0, y }, view).y;
    const isMajor = Math.abs(Math.round(y / major) * major - y) < 0.01;
    targetCtx.strokeStyle = isMajor ? surface.lineStrong : surface.line;
    targetCtx.beginPath();
    targetCtx.moveTo(0, Math.round(screen) + 0.5);
    targetCtx.lineTo(width, Math.round(screen) + 0.5);
    targetCtx.stroke();
  }

  targetCtx.restore();
}

function drawStroke(targetCtx, stroke) {
  if (!stroke.points || stroke.points.length < 1) return;

  targetCtx.save();
  targetCtx.globalCompositeOperation =
    stroke.tool === "eraser" ? "destination-out" : "source-over";
  targetCtx.strokeStyle = rgba(stroke.color || "#f5f5f5", 1);
  targetCtx.fillStyle = rgba(stroke.color || "#f5f5f5", 1);

  if (stroke.shape) {
    drawShape(targetCtx, stroke);
  } else {
    drawFreehand(targetCtx, stroke);
  }

  if (stroke.tool === "pen" && Array.isArray(stroke.drops)) {
    stroke.drops.forEach((drop) => {
      targetCtx.globalAlpha = drop.alpha;
      targetCtx.beginPath();
      targetCtx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
      targetCtx.fill();
    });
  }

  targetCtx.restore();
}

function drawFreehand(targetCtx, stroke) {
  const points = stroke.points;
  const profile = brushProfiles[stroke.brush] || brushProfiles.ink;
  if (points.length === 1) {
    const point = points[0];
    const pressure = responsivePressure(point.pressure);
    targetCtx.globalAlpha = stroke.tool === "eraser" ? 1 : Math.min(profile.alpha, profile.alpha * (0.62 + pressure * 0.38));
    targetCtx.beginPath();
    targetCtx.arc(point.x, point.y, strokeWidth(stroke, pressure) / 2, 0, Math.PI * 2);
    targetCtx.fill();
    return;
  }

  const pressure = responsivePressure(averagePressure(points));
  targetCtx.globalAlpha = stroke.tool === "eraser" ? 1 : Math.min(profile.alpha, profile.alpha * (0.62 + pressure * 0.38));
  targetCtx.lineWidth = strokeWidth(stroke, pressure);

  if (stroke.tool !== "eraser" && stroke.brush === "pencil") {
    drawPencil(targetCtx, stroke, pressure);
    return;
  }

  if (stroke.tool !== "eraser" && stroke.brush === "calligraphy") {
    drawCalligraphy(targetCtx, stroke, pressure);
    return;
  }

  if (stroke.tool !== "eraser" && stroke.brush === "spray") {
    drawSprayCore(targetCtx, stroke, pressure);
    return;
  }

  drawSmoothPath(targetCtx, points);
  targetCtx.stroke();
}

function drawSmoothPath(targetCtx, points, offset = { x: 0, y: 0 }) {
  targetCtx.beginPath();
  targetCtx.moveTo(points[0].x + offset.x, points[0].y + offset.y);

  if (points.length === 2) {
    targetCtx.lineTo(points[1].x + offset.x, points[1].y + offset.y);
  } else {
    for (let i = 1; i < points.length - 1; i += 1) {
      const midpoint = {
        x: (points[i].x + points[i + 1].x) / 2,
        y: (points[i].y + points[i + 1].y) / 2,
      };
      targetCtx.quadraticCurveTo(
        points[i].x + offset.x,
        points[i].y + offset.y,
        midpoint.x + offset.x,
        midpoint.y + offset.y
      );
    }
    const last = points[points.length - 1];
    targetCtx.lineTo(last.x + offset.x, last.y + offset.y);
  }
}

function drawPencil(targetCtx, stroke, pressure) {
  const width = Math.max(0.7, strokeWidth(stroke, pressure));
  targetCtx.lineWidth = width;
  targetCtx.globalAlpha = 0.34 + pressure * 0.18;
  drawSmoothPath(targetCtx, stroke.points);
  targetCtx.stroke();

  for (let i = 0; i < 3; i += 1) {
    const wobble = seededUnit(stroke.id, i) * width * 0.38;
    const angle = seededUnit(stroke.id, i + 10) * Math.PI * 2;
    targetCtx.lineWidth = Math.max(0.45, width * (0.32 + i * 0.08));
    targetCtx.globalAlpha = 0.08 + pressure * 0.06;
    drawSmoothPath(targetCtx, stroke.points, {
      x: Math.cos(angle) * wobble,
      y: Math.sin(angle) * wobble,
    });
    targetCtx.stroke();
  }
}

function drawCalligraphy(targetCtx, stroke, pressure) {
  const width = strokeWidth(stroke, pressure);
  targetCtx.save();
  targetCtx.lineCap = "round";
  targetCtx.lineJoin = "round";
  targetCtx.globalAlpha = 0.62 + pressure * 0.2;
  targetCtx.lineWidth = Math.max(1, width * 0.72);
  drawSmoothPath(targetCtx, stroke.points);
  targetCtx.stroke();

  targetCtx.globalAlpha = 0.22 + pressure * 0.12;
  targetCtx.lineWidth = Math.max(0.8, width * 0.24);
  drawSmoothPath(targetCtx, stroke.points, { x: width * 0.16, y: -width * 0.12 });
  targetCtx.stroke();

  targetCtx.restore();
}

function drawSprayCore(targetCtx, stroke, pressure) {
  targetCtx.lineWidth = Math.max(1, strokeWidth(stroke, pressure) * 0.18);
  targetCtx.globalAlpha = 0.1 + pressure * 0.1;
  drawSmoothPath(targetCtx, stroke.points);
  targetCtx.stroke();
}

function seededUnit(seed, index) {
  let hash = 2166136261;
  const value = `${seed}:${index}`;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function drawShape(targetCtx, stroke) {
  const shape = stroke.shape;
  const pressure = responsivePressure(averagePressure(stroke.points));
  targetCtx.globalAlpha = Math.min(0.96, 0.68 + pressure * 0.28);
  targetCtx.lineWidth = strokeWidth(stroke, pressure);
  targetCtx.beginPath();

  if (shape.kind === "line") {
    targetCtx.moveTo(shape.from.x, shape.from.y);
    targetCtx.lineTo(shape.to.x, shape.to.y);
  }

  if (shape.kind === "ellipse") {
    targetCtx.ellipse(
      shape.center.x,
      shape.center.y,
      shape.radiusX,
      shape.radiusY,
      0,
      0,
      Math.PI * 2
    );
  }

  if (shape.kind === "rect") {
    targetCtx.rect(shape.x, shape.y, shape.width, shape.height);
  }

  targetCtx.stroke();
}

function averagePressure(points) {
  if (!points.length) return 0.5;
  return points.reduce((total, point) => total + point.pressure, 0) / points.length;
}

function setTool(tool) {
  state.currentTool = tool;
  canvas.classList.toggle("is-panning", tool === "pan");
  canvas.classList.toggle("is-erasing", tool === "eraser");
  board.classList.toggle("is-erasing", tool === "eraser");
  toolButtons.forEach((button) => {
    const active = button.dataset.tool === tool;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updateEraserCursor();
}

function setBrush(brush) {
  state.brush = brushProfiles[brush] ? brush : "ink";
  brushSelect.value = state.brush;
  deviceStatus.textContent = `${brushProfiles[state.brush].label} brush`;
  scheduleSave();
}

function setTheme(theme) {
  state.theme = theme === "light" ? "light" : "dark";
  themeToggle.checked = state.theme === "light";
  document.body.classList.toggle("light-mode", state.theme === "light");
  scheduleSave();
}

function setActiveSurface(surfaceKey) {
  const page = activePage();
  if (!page || !surfaces[surfaceKey]) return;

  page.surface = surfaceKey;
  maybeAdjustInkForSurface(surfaceKey);
  updateSurfaceButtons();
  deviceStatus.textContent = surfaces[surfaceKey].name;
  scheduleSave();
  scheduleAutoShare();
  requestRender();
}

function maybeAdjustInkForSurface(surfaceKey) {
  const lightSurface = surfaceKey === "white-blank" || surfaceKey === "sepia-blank";
  const darkInk = "#151515";
  const lightInk = defaultPalette[0];

  if (
    lightSurface &&
    (state.inkColor.toLowerCase() === lightInk || state.inkColor.toLowerCase() === legacyPalette[0])
  ) {
    setInkColor(darkInk, { updatePalette: true });
  }

  if (!lightSurface && state.inkColor.toLowerCase() === darkInk) {
    setInkColor(lightInk, { updatePalette: true });
  }
}

function updateSurfaceButtons() {
  const page = activePage();
  surfaceButtons.forEach((button) => {
    const active = page && button.dataset.surface === page.surface;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function updateEraserCursor(event) {
  if (state.currentTool !== "eraser") {
    board.classList.remove("is-erasing");
    return;
  }

  board.classList.add("is-erasing");
  const page = activePage();
  const rect = getCanvasRect();
  const pressure = responsivePressure(0.5);
  const size = strokeWidth(
    { baseSize: Number(sizeInput.value) / page.view.scale, tool: "eraser" },
    pressure
  ) * page.view.scale;

  eraserCursor.style.setProperty("--eraser-size", `${Math.max(10, size)}px`);

  if (event) {
    eraserCursor.style.setProperty("--eraser-x", `${event.clientX - rect.left}px`);
    eraserCursor.style.setProperty("--eraser-y", `${event.clientY - rect.top}px`);
  }
}

function setInkColor(color, options = {}) {
  state.inkColor = color;
  colorInput.value = color;

  if (options.updatePalette) {
    state.palette[state.selectedPaletteIndex] = color;
  }

  renderPalette();
  scheduleSave();
}

function renderPalette() {
  swatchButtons.forEach((button, index) => {
    const color = state.palette[index] || defaultPalette[index] || "#f5f5f5";
    button.dataset.color = color;
    button.style.setProperty("--swatch", color);
    button.classList.toggle("is-active", index === state.selectedPaletteIndex);
  });
}

function addPointToStroke(stroke, event, options = {}) {
  const raw = screenToWorld(event.clientX, event.clientY);
  const pressure = eventPressure(event);
  const smooth = Number(smoothInput.value) / 100;
  const last = stroke.points[stroke.points.length - 1];
  const point = last
    ? {
        x: last.x * smooth + raw.x * (1 - smooth),
        y: last.y * smooth + raw.y * (1 - smooth),
        pressure: last.pressure * smooth + pressure * (1 - smooth),
      }
    : { ...raw, pressure };

  if (last && Math.hypot(point.x - last.x, point.y - last.y) < pointSpacing(stroke)) {
    return;
  }

  stroke.points.push(point);
  if (options.updatePressure !== false) {
    updatePressure(pressure);
  }
  maybeAddDrops(stroke, last, point);
}

function maybeAddDrops(stroke, from, to) {
  if (!from || stroke.tool !== "pen") return;

  const profile = brushProfiles[stroke.brush] || brushProfiles.ink;
  const spill = stroke.spill / 100;
  const pressure = Math.max(from.pressure, to.pressure, 0.08);
  if (!profile.spill || spill <= 0) return;
  if (stroke.brush !== "spray" && pressure < 0.64) return;
  if (stroke.drops.length > 1200) return;

  const width = strokeWidth(stroke, pressure);
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const rawDropletCount = stroke.brush === "spray"
    ? Math.floor(distance * (1.4 + spill * 3.4) * (0.28 + pressure))
    : Math.floor(distance * spill * pressure * 0.08);
  const dropletCount = Math.min(stroke.brush === "spray" ? 22 : 8, rawDropletCount);

  for (let i = 0; i < dropletCount; i += 1) {
    const t = Math.random();
    const centerX = from.x + (to.x - from.x) * t;
    const centerY = from.y + (to.y - from.y) * t;
    const sprayRadius = stroke.brush === "spray"
      ? width * (1.2 + spill * 2.4)
      : width * (0.45 + pressure * 1.7) * spill;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * sprayRadius;

    stroke.drops.push({
      alpha: stroke.brush === "spray"
        ? Math.min(0.22, 0.035 + pressure * 0.11)
        : Math.min(0.34, 0.04 + pressure * spill * 0.22),
      radius: stroke.brush === "spray"
        ? Math.max(0.35, width * (0.015 + Math.random() * 0.036) * pressure)
        : Math.max(0.45, width * (0.018 + Math.random() * 0.046) * pressure),
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }
}

function sampledPointerEvents(event) {
  const events =
    typeof event.getCoalescedEvents === "function"
      ? event.getCoalescedEvents()
      : [event];
  const source = events.length ? events : [event];
  const limit = state.currentStroke && state.currentStroke.brush === "spray" ? 4 : 8;

  if (source.length <= limit) {
    return source;
  }

  const sampled = [];
  const stride = Math.ceil(source.length / limit);
  for (let i = 0; i < source.length; i += stride) {
    sampled.push(source[i]);
  }

  const last = source[source.length - 1];
  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }

  return sampled;
}

function startPointer(event) {
  if (event.button !== 0 && event.pointerType !== "touch") return;

  const shouldPan = state.currentTool === "pan" || state.spaceDown;
  state.activePointerId = event.pointerId;
  canvas.setPointerCapture(event.pointerId);

  if (shouldPan) {
    state.lastPanPoint = { x: event.clientX, y: event.clientY };
    deviceStatus.textContent = "panning";
    return;
  }

  const page = activePage();
  state.drawing = true;
  state.currentStroke = {
    id: uid(),
    baseSize: Number(sizeInput.value) / page.view.scale,
    brush: state.brush,
    color: state.inkColor,
    drops: [],
    points: [],
    shape: null,
    spill: Number(spillInput.value),
    tool: state.currentTool,
  };
  addPointToStroke(state.currentStroke, event);
  deviceStatus.textContent = `${event.pointerType || "pointer"} input`;
  requestRender();
}

function movePointer(event) {
  updateEraserCursor(event);

  if (event.pointerId !== state.activePointerId) return;

  if (state.lastPanPoint) {
    const page = activePage();
    page.view.x += event.clientX - state.lastPanPoint.x;
    page.view.y += event.clientY - state.lastPanPoint.y;
    state.lastPanPoint = { x: event.clientX, y: event.clientY };
    invalidateStaticLayer();
    scheduleSave();
    scheduleAutoShare();
    requestRender();
    return;
  }

  if (!state.drawing || !state.currentStroke) return;
  const events = sampledPointerEvents(event);
  events.forEach((coalesced, index) => {
    addPointToStroke(state.currentStroke, coalesced, {
      updatePressure: index === events.length - 1,
    });
  });
  requestRender();
}

function endPointer(event) {
  if (event.pointerId !== state.activePointerId) return;

  movePointer(event);

  if (state.currentStroke && state.currentStroke.points.length) {
    if (event.shiftKey && state.currentStroke.tool === "pen") {
      state.currentStroke.shape = shapeFromStroke(state.currentStroke);
    }

    const page = activePage();
    page.strokes.push(state.currentStroke);
    state.history.push({ action: "add", pageId: page.id, stroke: state.currentStroke });
    state.redoStack.length = 0;
    state.currentStroke = null;
    invalidateStaticLayer();
    updateHistoryButtons();
    scheduleSave();
    scheduleAutoShare();
  }

  state.drawing = false;
  state.lastPanPoint = null;
  state.activePointerId = null;
  updatePressure(0);
  deviceStatus.textContent = "autosaved";

  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }

  requestRender();
}

function shapeFromStroke(stroke) {
  const points = stroke.points;
  const first = points[0];
  const last = points[points.length - 1];
  const bounds = points.reduce(
    (box, point) => ({
      minX: Math.min(box.minX, point.x),
      minY: Math.min(box.minY, point.y),
      maxX: Math.max(box.maxX, point.x),
      maxY: Math.max(box.maxY, point.y),
    }),
    { minX: first.x, minY: first.y, maxX: first.x, maxY: first.y }
  );
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const direct = Math.hypot(last.x - first.x, last.y - first.y);
  const path = pathLength(points);
  const closed = direct < Math.max(width, height) * 0.32;

  if (!closed || direct / Math.max(path, 1) > 0.68) {
    return { kind: "line", from: first, to: last };
  }

  if (Math.abs(width - height) / Math.max(width, height) < 0.22) {
    return {
      kind: "ellipse",
      center: { x: bounds.minX + width / 2, y: bounds.minY + height / 2 },
      radiusX: width / 2,
      radiusY: height / 2,
    };
  }

  return {
    kind: "rect",
    height,
    width,
    x: bounds.minX,
    y: bounds.minY,
  };
}

function pathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

function zoomAt(event) {
  event.preventDefault();
  const page = activePage();
  const rect = getCanvasRect();
  const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  const before = screenToWorld(event.clientX, event.clientY);
  const factor = event.deltaY < 0 ? 1.08 : 0.925;
  page.view.scale = Math.max(0.18, Math.min(4.5, page.view.scale * factor));
  page.view.x = screen.x - before.x * page.view.scale;
  page.view.y = screen.y - before.y * page.view.scale;
  deviceStatus.textContent = `${Math.round(page.view.scale * 100)}%`;
  invalidateStaticLayer();
  scheduleSave();
  scheduleAutoShare();
  requestRender();
}

function addPage() {
  const current = activePage();
  const page = createPage(state.pages.length + 1, {
    surface: current ? current.surface : defaultSurface,
  });
  const rect = getCanvasRect();
  page.view.x = rect.width / 2;
  page.view.y = rect.height / 2;
  state.pages.push(page);
  state.activePageId = page.id;
  renderPageTabs();
  updateSurfaceButtons();
  invalidateStaticLayer();
  scheduleSave();
  scheduleAutoShare();
  requestRender();
}

function renderPageTabs() {
  pageTabs.replaceChildren();
  state.pages.forEach((page, index) => {
    const button = document.createElement("button");
    button.className = "page-tab";
    button.type = "button";
    button.role = "tab";
    button.textContent = String(index + 1);
    button.setAttribute("aria-label", page.name);
    button.classList.toggle("is-active", page.id === state.activePageId);
    button.setAttribute("aria-selected", String(page.id === state.activePageId));
    button.addEventListener("click", () => {
      state.activePageId = page.id;
      renderPageTabs();
      updateSurfaceButtons();
      invalidateStaticLayer();
      scheduleSave();
      scheduleAutoShare();
      requestRender();
    });
    pageTabs.append(button);
  });
}

function clearPage() {
  const page = activePage();
  if (!page.strokes.length) return;
  const strokes = page.strokes;
  page.strokes = [];
  state.history.push({ action: "clear", pageId: page.id, strokes });
  state.redoStack.length = 0;
  invalidateStaticLayer();
  updateHistoryButtons();
  scheduleSave();
  scheduleAutoShare();
  requestRender();
}

function undo() {
  const op = state.history.pop();
  if (!op) return;
  const page = state.pages.find((item) => item.id === op.pageId);
  if (!page) return;

  if (op.action === "add") {
    page.strokes = page.strokes.filter((stroke) => stroke.id !== op.stroke.id);
  }

  if (op.action === "clear") {
    page.strokes = [...op.strokes];
  }

  state.redoStack.push(op);
  invalidateStaticLayer();
  updateHistoryButtons();
  scheduleSave();
  scheduleAutoShare();
  requestRender();
}

function redo() {
  const op = state.redoStack.pop();
  if (!op) return;
  const page = state.pages.find((item) => item.id === op.pageId);
  if (!page) return;

  if (op.action === "add") {
    page.strokes.push(op.stroke);
  }

  if (op.action === "clear") {
    page.strokes = [];
  }

  state.history.push(op);
  invalidateStaticLayer();
  updateHistoryButtons();
  scheduleSave();
  scheduleAutoShare();
  requestRender();
}

function updateHistoryButtons() {
  undoButton.disabled = state.history.length === 0;
  redoButton.disabled = state.redoStack.length === 0;
}

function savePng() {
  render();
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.download = `krakens-canvas-${stamp}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function updateFocusMode() {
  document.body.classList.toggle("focus-mode", focusToggle.checked);
  scheduleSave();
}

toolButtons.forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

surfaceButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveSurface(button.dataset.surface));
});

brushSelect.addEventListener("change", () => setBrush(brushSelect.value));
themeToggle.addEventListener("change", () => setTheme(themeToggle.checked ? "light" : "dark"));

swatchButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    state.selectedPaletteIndex = index;
    setInkColor(state.palette[index] || button.dataset.color);
  });
});

colorInput.addEventListener("input", () => setInkColor(colorInput.value, { updatePalette: true }));
addPageButton.addEventListener("click", addPage);
sizeInput.addEventListener("input", () => {
  updateEraserCursor();
  scheduleSave();
});
spillInput.addEventListener("input", scheduleSave);
smoothInput.addEventListener("input", scheduleSave);
canvas.addEventListener("pointerdown", startPointer);
canvas.addEventListener("pointermove", movePointer);
canvas.addEventListener("pointerenter", updateEraserCursor);
canvas.addEventListener("pointerleave", () => board.classList.remove("is-erasing"));
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("wheel", zoomAt, { passive: false });
undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
clearButton.addEventListener("click", clearPage);
saveButton.addEventListener("click", savePng);
pinButton.addEventListener("click", async () => {
  if (!nativeApi) return;

  try {
    updatePinButton(await nativeApi.toggleAlwaysOnTop());
  } catch {
    deviceStatus.textContent = "pin failed";
  }
});
shareButton.addEventListener("click", () => {
  shareSnapshot().catch(() => {
    deviceStatus.textContent = "share failed";
  });
});
autoShareToggle.addEventListener("change", () => {
  scheduleSave();
  if (autoShareToggle.checked) {
    shareSnapshot({ quiet: true })
      .then(() => {
        deviceStatus.textContent = "auto-share on";
      })
      .catch(() => {
        deviceStatus.textContent = "share failed";
      });
  } else {
    deviceStatus.textContent = "auto-share off";
  }
});
gridInput.addEventListener("input", () => {
  updateEraserCursor();
  scheduleSave();
  scheduleAutoShare();
  requestRender();
});
gridToggle.addEventListener("change", () => {
  scheduleSave();
  scheduleAutoShare();
  requestRender();
});
focusToggle.addEventListener("change", updateFocusMode);

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    state.spaceDown = true;
    event.preventDefault();
  }

  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return;

  if (event.key.toLowerCase() === "z" && !event.shiftKey) {
    event.preventDefault();
    undo();
  }

  if (
    event.key.toLowerCase() === "y" ||
    (event.key.toLowerCase() === "z" && event.shiftKey)
  ) {
    event.preventDefault();
    redo();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space") state.spaceDown = false;
});

window.addEventListener("pointermove", (event) => {
  toolbar.classList.toggle("is-peeking", focusToggle.checked && event.clientY < 24);
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("beforeunload", saveNow);

loadState();
renderPalette();
setTheme(state.theme);
setBrush(state.brush);
setInkColor(state.inkColor);
renderPageTabs();
updateSurfaceButtons();
setTool(state.currentTool);
updateFocusMode();
resizeCanvas();
updateHistoryButtons();
refreshNativeState();
