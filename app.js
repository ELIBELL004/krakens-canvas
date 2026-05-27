const STORAGE_KEY = "krakens-canvas-v2";

const board = document.querySelector("#board");
const canvas = document.querySelector("#inkCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const staticLayer = document.createElement("canvas");
const staticCtx = staticLayer.getContext("2d", { alpha: true });
const inkLayer = document.createElement("canvas");
const inkCtx = inkLayer.getContext("2d", { alpha: true });
const layerRender = document.createElement("canvas");
const layerRenderCtx = layerRender.getContext("2d", { alpha: true });

const pageTabs = document.querySelector("#pageTabs");
const addPageButton = document.querySelector("#addPageButton");
const brushSelect = document.querySelector("#brushSelect");
const layerList = document.querySelector("#layerList");
const addLayerButton = document.querySelector("#addLayerButton");
const layerOpacityInput = document.querySelector("#layerOpacityInput");
const transformRotateInput = document.querySelector("#transformRotateInput");
const transformScaleInput = document.querySelector("#transformScaleInput");
const copySelectionButton = document.querySelector("#copySelectionButton");
const pasteSelectionButton = document.querySelector("#pasteSelectionButton");
const clearTransformButton = document.querySelector("#clearTransformButton");
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
const neatenButton = document.querySelector("#neatenButton");
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
const writingNeatenWindowMs = 13500;
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
  round: { alpha: 0.88, label: "round brush", maxWidth: 62, spill: false, width: 1.18 },
  flat: { alpha: 0.82, label: "flat brush", maxWidth: 58, spill: false, width: 1.12 },
  dry: { alpha: 0.5, label: "dry brush", maxWidth: 46, spill: true, width: 1.08 },
  halftone: { alpha: 0.72, label: "halftone", maxWidth: 52, spill: false, width: 1.18 },
  "halftone-soft": { alpha: 0.44, label: "soft halftone", maxWidth: 58, spill: false, width: 1.36 },
};

const state = {
  activePointerId: null,
  brush: "ink",
  canvasRect: null,
  clipboard: {
    pasteCount: 0,
    strokes: [],
  },
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
  transform: {
    baseStrokes: null,
    bounds: null,
    beforeLayerStrokes: null,
    dragging: false,
    mode: "idle",
    moveStart: null,
    rotate: 0,
    scale: 1,
    selectedIds: [],
    startPoint: null,
  },
};

function uid() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createPage(index, options = {}) {
  const layer = createLayer(1);
  return {
    activeLayerId: layer.id,
    id: uid(),
    layers: [layer],
    name: `Page ${index}`,
    surface: options.surface || defaultSurface,
    view: { x: 0, y: 0, scale: 1 },
  };
}

function createLayer(index) {
  return {
    id: uid(),
    name: `Layer ${index}`,
    opacity: 1,
    strokes: [],
    visible: true,
  };
}

function isDrawableStroke(stroke) {
  return Array.isArray(stroke?.points) && stroke.points.length > 0;
}

function normalizeStrokes(strokes) {
  return Array.isArray(strokes) ? strokes.filter(isDrawableStroke) : [];
}

function activePage() {
  return state.pages.find((page) => page.id === state.activePageId) || state.pages[0];
}

function normalizePage(page, index) {
  const layers = Array.isArray(page.layers) && page.layers.length
    ? page.layers.map((layer, layerIndex) => ({
        id: layer.id || uid(),
        name: layer.name || `Layer ${layerIndex + 1}`,
        opacity: Number.isFinite(layer.opacity) ? Math.max(0, Math.min(1, layer.opacity)) : 1,
        strokes: normalizeStrokes(layer.strokes),
        visible: layer.visible !== false,
      }))
    : [{
        id: uid(),
        name: "Layer 1",
        opacity: 1,
        strokes: normalizeStrokes(page.strokes),
        visible: true,
      }];

  return {
    activeLayerId: page.activeLayerId && layers.some((layer) => layer.id === page.activeLayerId)
      ? page.activeLayerId
      : layers[layers.length - 1].id,
    id: page.id || uid(),
    layers,
    name: page.name || `Page ${index + 1}`,
    surface: surfaces[page.surface] ? page.surface : defaultSurface,
    view: page.view || { x: 0, y: 0, scale: 1 },
  };
}

function activeLayer() {
  const page = activePage();
  return page.layers.find((layer) => layer.id === page.activeLayerId) || page.layers[0];
}

function pageStrokes(page = activePage()) {
  return page.layers.flatMap((layer) => normalizeStrokes(layer.strokes));
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
  layerRender.width = canvas.width;
  layerRender.height = canvas.height;

  state.pages.forEach((page) => {
    if (!page.view) page.view = { x: rect.width / 2, y: rect.height / 2, scale: 1 };
    if (page.view.x === 0 && page.view.y === 0 && pageStrokes(page).length === 0) {
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
  page.layers.forEach((layer) => drawLayer(staticCtx, page, layer));
  state.staticLayerDirty = false;
}

function prepareWorldContext(targetCtx, page) {
  targetCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  targetCtx.lineCap = "round";
  targetCtx.lineJoin = "round";
  targetCtx.translate(page.view.x, page.view.y);
  targetCtx.scale(page.view.scale, page.view.scale);
}

function drawLayer(targetCtx, page, layer, extraStroke = null) {
  if (!layer || layer.visible === false || layer.opacity <= 0) return;

  layerRenderCtx.setTransform(1, 0, 0, 1, 0, 0);
  layerRenderCtx.globalAlpha = 1;
  layerRenderCtx.globalCompositeOperation = "source-over";
  layerRenderCtx.clearRect(0, 0, layerRender.width, layerRender.height);
  prepareWorldContext(layerRenderCtx, page);
  layer.strokes.forEach((stroke) => drawStroke(layerRenderCtx, stroke));
  if (extraStroke) drawStroke(layerRenderCtx, extraStroke);

  targetCtx.save();
  targetCtx.setTransform(1, 0, 0, 1, 0, 0);
  targetCtx.globalAlpha = layer.opacity;
  targetCtx.drawImage(layerRender, 0, 0);
  targetCtx.restore();
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
    drawTransformOverlay(ctx, page);
    return;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  page.layers.forEach((layer) => {
    const extra = layer.id === state.currentStroke.layerId ? state.currentStroke : null;
    drawLayer(ctx, page, layer, extra);
  });
  drawTransformOverlay(ctx, page);
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

function drawTransformOverlay(targetCtx, page) {
  if (state.currentTool !== "transform") return;
  const bounds = transformSelectionBounds();
  if (!bounds) return;
  const a = worldToScreen({ x: bounds.minX, y: bounds.minY }, page.view);
  const b = worldToScreen({ x: bounds.maxX, y: bounds.maxY }, page.view);

  targetCtx.save();
  targetCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  targetCtx.strokeStyle = "rgba(136, 219, 177, 0.92)";
  targetCtx.fillStyle = "rgba(136, 219, 177, 0.08)";
  targetCtx.lineWidth = 1.4;
  targetCtx.setLineDash([8, 6]);
  targetCtx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  targetCtx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
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

  if (stroke.tool !== "eraser" && stroke.brush === "flat") {
    drawFlatBrush(targetCtx, stroke, pressure);
    return;
  }

  if (stroke.tool !== "eraser" && stroke.brush === "dry") {
    drawDryBrush(targetCtx, stroke, pressure);
    return;
  }

  if (stroke.tool !== "eraser" && (stroke.brush === "halftone" || stroke.brush === "halftone-soft")) {
    drawHalftoneBrush(targetCtx, stroke, pressure);
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

function drawFlatBrush(targetCtx, stroke, pressure) {
  const width = strokeWidth(stroke, pressure);
  targetCtx.save();
  targetCtx.globalAlpha = 0.48 + pressure * 0.26;
  targetCtx.lineCap = "butt";
  targetCtx.lineWidth = Math.max(1, width * 0.62);
  drawSmoothPath(targetCtx, stroke.points, { x: 0, y: -width * 0.12 });
  targetCtx.stroke();
  drawSmoothPath(targetCtx, stroke.points, { x: 0, y: width * 0.12 });
  targetCtx.stroke();
  targetCtx.restore();
}

function drawDryBrush(targetCtx, stroke, pressure) {
  const width = strokeWidth(stroke, pressure);
  targetCtx.save();
  targetCtx.globalAlpha = 0.18 + pressure * 0.2;
  targetCtx.lineWidth = Math.max(1, width * 0.32);

  for (let i = 0; i < 5; i += 1) {
    const angle = seededUnit(stroke.id, i + 30) * Math.PI * 2;
    const amount = (seededUnit(stroke.id, i + 40) - 0.5) * width * 0.72;
    targetCtx.globalAlpha = 0.08 + pressure * (0.08 + i * 0.018);
    drawSmoothPath(targetCtx, stroke.points, {
      x: Math.cos(angle) * amount,
      y: Math.sin(angle) * amount,
    });
    targetCtx.stroke();
  }

  targetCtx.restore();
}

function drawHalftoneBrush(targetCtx, stroke, pressure) {
  const width = strokeWidth(stroke, pressure);
  const spacing = stroke.brush === "halftone-soft" ? Math.max(5, width * 0.42) : Math.max(4, width * 0.32);
  const radius = stroke.brush === "halftone-soft" ? Math.max(1.2, width * 0.12) : Math.max(1, width * 0.09);
  const alpha = stroke.brush === "halftone-soft" ? 0.18 + pressure * 0.14 : 0.36 + pressure * 0.18;

  targetCtx.save();
  targetCtx.globalAlpha = alpha;

  stroke.points.forEach((point, index) => {
    if (index % 2 !== 0) return;
    const pointPressure = responsivePressure(point.pressure);
    const dots = Math.max(3, Math.min(18, Math.round(width / spacing) + 2));
    for (let i = 0; i < dots; i += 1) {
      const angle = (Math.PI * 2 * i) / dots + seededUnit(stroke.id, index + i) * 0.4;
      const ring = (i % 3) * spacing * 0.45 + width * 0.18;
      targetCtx.beginPath();
      targetCtx.arc(
        point.x + Math.cos(angle) * ring,
        point.y + Math.sin(angle) * ring,
        radius * (0.65 + pointPressure * 0.75),
        0,
        Math.PI * 2
      );
      targetCtx.fill();
    }
  });

  targetCtx.restore();
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
  canvas.classList.toggle("is-transforming", tool === "transform");
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

  if (state.currentTool === "transform") {
    const point = screenToWorld(event.clientX, event.clientY);
    const bounds = transformSelectionBounds();
    state.transform.startPoint = point;
    state.transform.moveStart = point;
    state.transform.baseStrokes = cloneStrokes(selectedTransformStrokes());
    state.transform.dragging = true;
    state.transform.mode = bounds && pointInBounds(point, bounds) ? "move" : "select";
    state.transform.beforeLayerStrokes = state.transform.mode === "move" ? cloneLayerStrokes(activePage()) : null;
    if (state.transform.mode === "select") {
      state.transform.bounds = { minX: point.x, minY: point.y, maxX: point.x, maxY: point.y };
      state.transform.selectedIds = [];
    }
    deviceStatus.textContent = state.transform.mode === "move" ? "moving selection" : "select area";
    requestRender();
    return;
  }

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
    createdAt: Date.now(),
    drops: [],
    layerId: activeLayer().id,
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

  if (state.currentTool === "transform" && state.transform.dragging) {
    const point = screenToWorld(event.clientX, event.clientY);
    if (state.transform.mode === "select") {
      state.transform.bounds = {
        minX: Math.min(state.transform.startPoint.x, point.x),
        minY: Math.min(state.transform.startPoint.y, point.y),
        maxX: Math.max(state.transform.startPoint.x, point.x),
        maxY: Math.max(state.transform.startPoint.y, point.y),
      };
    }

    if (state.transform.mode === "move") {
      applyTransformToSelection({
        dx: point.x - state.transform.moveStart.x,
        dy: point.y - state.transform.moveStart.y,
        rotate: state.transform.rotate,
        scale: state.transform.scale,
      });
    }
    requestRender();
    return;
  }

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

  if (state.currentTool === "transform" && state.transform.dragging) {
    movePointer(event);
    const page = activePage();
    if (state.transform.mode === "select") {
      const bounds = state.transform.bounds;
      state.transform.selectedIds = activeLayer().strokes
        .filter((stroke) => boundsIntersect(strokeBounds(stroke), bounds))
        .map((stroke) => stroke.id);
      state.transform.baseStrokes = cloneStrokes(selectedTransformStrokes());
      state.transform.beforeLayerStrokes = null;
      resetTransformControls();
      deviceStatus.textContent = `${state.transform.selectedIds.length} selected`;
      updateClipboardButtons();
    } else if (state.transform.mode === "move") {
      state.history.push({
        action: "pageReplace",
        afterLayerStrokes: cloneLayerStrokes(page),
        beforeLayerStrokes: state.transform.beforeLayerStrokes || cloneLayerStrokes(page),
        pageId: page.id,
      });
      state.redoStack.length = 0;
      updateHistoryButtons();
      scheduleSave();
      scheduleAutoShare();
      deviceStatus.textContent = "selection moved";
    }
    state.transform.dragging = false;
    state.transform.mode = "idle";
    state.transform.baseStrokes = cloneStrokes(selectedTransformStrokes());
    state.transform.beforeLayerStrokes = null;
    updateClipboardButtons();
    state.activePointerId = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    invalidateStaticLayer();
    requestRender();
    return;
  }

  movePointer(event);

  if (state.currentStroke && state.currentStroke.points.length) {
    if (event.shiftKey && state.currentStroke.tool === "pen") {
      state.currentStroke.shape = shapeFromStroke(state.currentStroke);
    }

    const page = activePage();
    const layer = activeLayer();
    layer.strokes.push(state.currentStroke);
    state.history.push({ action: "add", layerId: layer.id, pageId: page.id, stroke: state.currentStroke });
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

function cloneStrokes(strokes) {
  return strokes.map((stroke) => ({
    ...stroke,
    drops: Array.isArray(stroke.drops) ? stroke.drops.map((drop) => ({ ...drop })) : [],
    points: Array.isArray(stroke.points) ? stroke.points.map((point) => ({ ...point })) : [],
    shape: stroke.shape ? JSON.parse(JSON.stringify(stroke.shape)) : null,
  }));
}

function cloneLayerStrokes(page) {
  return page.layers.map((layer) => ({
    id: layer.id,
    strokes: cloneStrokes(layer.strokes),
  }));
}

function restoreLayerStrokes(page, savedLayers) {
  savedLayers.forEach((savedLayer) => {
    const layer = page.layers.find((item) => item.id === savedLayer.id);
    if (layer) layer.strokes = cloneStrokes(savedLayer.strokes);
  });
}

function strokeBounds(stroke) {
  const first = stroke.points[0];
  return stroke.points.reduce(
    (box, point) => ({
      minX: Math.min(box.minX, point.x),
      minY: Math.min(box.minY, point.y),
      maxX: Math.max(box.maxX, point.x),
      maxY: Math.max(box.maxY, point.y),
    }),
    { minX: first.x, minY: first.y, maxX: first.x, maxY: first.y }
  );
}

function groupBounds(strokes) {
  return strokes.reduce(
    (box, stroke) => {
      const bounds = strokeBounds(stroke);
      return {
        minX: Math.min(box.minX, bounds.minX),
        minY: Math.min(box.minY, bounds.minY),
        maxX: Math.max(box.maxX, bounds.maxX),
        maxY: Math.max(box.maxY, bounds.maxY),
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );
}

function pointInBounds(point, bounds) {
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
}

function boundsIntersect(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

function transformSelectionBounds() {
  const selected = selectedTransformStrokes();
  return selected.length ? groupBounds(selected) : state.transform.bounds;
}

function selectedTransformStrokes() {
  const ids = new Set(state.transform.selectedIds);
  return activeLayer().strokes.filter((stroke) => ids.has(stroke.id));
}

function transformPoint(point, transform, origin) {
  const cos = Math.cos(transform.rotate);
  const sin = Math.sin(transform.rotate);
  const x = (point.x - origin.x) * transform.scale;
  const y = (point.y - origin.y) * transform.scale;
  return {
    ...point,
    x: origin.x + x * cos - y * sin + transform.dx,
    y: origin.y + x * sin + y * cos + transform.dy,
  };
}

function translateShape(shape, offset) {
  if (!shape) return null;
  const clone = JSON.parse(JSON.stringify(shape));

  if (clone.kind === "line") {
    clone.from.x += offset.x;
    clone.from.y += offset.y;
    clone.to.x += offset.x;
    clone.to.y += offset.y;
  }

  if (clone.kind === "ellipse") {
    clone.center.x += offset.x;
    clone.center.y += offset.y;
  }

  if (clone.kind === "rect") {
    clone.x += offset.x;
    clone.y += offset.y;
  }

  return clone;
}

function translateStroke(stroke, offset) {
  return {
    ...stroke,
    drops: Array.isArray(stroke.drops)
      ? stroke.drops.map((drop) => ({ ...drop, x: drop.x + offset.x, y: drop.y + offset.y }))
      : [],
    points: stroke.points.map((point) => ({ ...point, x: point.x + offset.x, y: point.y + offset.y })),
    shape: translateShape(stroke.shape, offset),
  };
}

function applyTransformToSelection(transform) {
  const layer = activeLayer();
  const selectedIds = new Set(state.transform.selectedIds);
  const base = state.transform.baseStrokes || cloneStrokes(selectedTransformStrokes());
  if (!base.length) return;
  const originBounds = groupBounds(base);
  const origin = {
    x: (originBounds.minX + originBounds.maxX) / 2,
    y: (originBounds.minY + originBounds.maxY) / 2,
  };

  layer.strokes = layer.strokes.map((stroke) => {
    if (!selectedIds.has(stroke.id)) return stroke;
    const baseStroke = base.find((item) => item.id === stroke.id);
    if (!baseStroke) return stroke;
    return {
      ...baseStroke,
      points: baseStroke.points.map((point) => transformPoint(point, transform, origin)),
    };
  });
  invalidateStaticLayer();
  requestRender();
}

function resetTransformControls() {
  state.transform.rotate = 0;
  state.transform.scale = 1;
  transformRotateInput.value = "0";
  transformScaleInput.value = "100";
}

function updateClipboardButtons() {
  copySelectionButton.disabled = selectedTransformStrokes().length === 0;
  pasteSelectionButton.disabled = state.clipboard.strokes.length === 0;
}

function copySelection() {
  const selected = selectedTransformStrokes();
  if (!selected.length) {
    deviceStatus.textContent = "select ink to copy";
    updateClipboardButtons();
    return;
  }

  state.clipboard = {
    pasteCount: 0,
    strokes: cloneStrokes(selected),
  };
  deviceStatus.textContent = `${selected.length} copied`;
  updateClipboardButtons();
}

function pasteSelection() {
  if (!state.clipboard.strokes.length) {
    deviceStatus.textContent = "nothing copied";
    updateClipboardButtons();
    return;
  }

  const page = activePage();
  const layer = activeLayer();
  const beforeLayerStrokes = cloneLayerStrokes(page);
  state.clipboard.pasteCount += 1;
  const offsetAmount = (24 * state.clipboard.pasteCount) / page.view.scale;
  const offset = { x: offsetAmount, y: offsetAmount };
  const pasted = cloneStrokes(state.clipboard.strokes).map((stroke) => ({
    ...translateStroke(stroke, offset),
    createdAt: Date.now(),
    id: uid(),
    layerId: layer.id,
    neatenedAt: null,
  }));

  layer.strokes.push(...pasted);
  state.transform.selectedIds = pasted.map((stroke) => stroke.id);
  state.transform.baseStrokes = cloneStrokes(pasted);
  state.transform.beforeLayerStrokes = null;
  state.transform.bounds = groupBounds(pasted);
  resetTransformControls();
  setTool("transform");
  state.history.push({
    action: "pageReplace",
    afterLayerStrokes: cloneLayerStrokes(page),
    beforeLayerStrokes,
    pageId: page.id,
  });
  state.redoStack.length = 0;
  invalidateStaticLayer();
  updateHistoryButtons();
  updateClipboardButtons();
  scheduleSave();
  scheduleAutoShare();
  requestRender();
  deviceStatus.textContent = `${pasted.length} pasted`;
}

function clearTransformSelection() {
  state.transform = {
    baseStrokes: null,
    bounds: null,
    beforeLayerStrokes: null,
    dragging: false,
    mode: "idle",
    moveStart: null,
    rotate: 0,
    scale: 1,
    selectedIds: [],
    startPoint: null,
  };
  resetTransformControls();
  updateClipboardButtons();
  requestRender();
}

function strokeCenter(stroke) {
  const bounds = strokeBounds(stroke);
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

function strokeHeight(stroke) {
  const bounds = strokeBounds(stroke);
  return Math.max(1, bounds.maxY - bounds.minY);
}

function recentWritingStrokes(page) {
  const strokes = [];
  const layer = activeLayer();
  const latest = [...layer.strokes].reverse().find((stroke) => stroke.tool === "pen" && !stroke.shape);
  const latestTime = latest && latest.createdAt ? latest.createdAt : 0;

  for (let i = layer.strokes.length - 1; i >= 0; i -= 1) {
    const stroke = layer.strokes[i];
    if (stroke.tool !== "pen" || stroke.shape || !stroke.points || stroke.points.length < 1) break;
    if (stroke.brush === "spray") break;
    if (stroke.neatenedAt) break;
    if (latestTime && stroke.createdAt && latestTime - stroke.createdAt > writingNeatenWindowMs) break;

    strokes.unshift(stroke);
    if (strokes.length >= 28) break;
  }

  return strokes;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function simplifyPoints(points, tolerance) {
  if (points.length <= 3) return points.map((point) => ({ ...point }));

  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  function perpendicularDistance(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
    return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / Math.hypot(dx, dy);
  }

  function simplifyRange(startIndex, endIndex) {
    let maxDistance = 0;
    let keepIndex = startIndex;

    for (let i = startIndex + 1; i < endIndex; i += 1) {
      const distance = perpendicularDistance(points[i], points[startIndex], points[endIndex]);
      if (distance > maxDistance) {
        maxDistance = distance;
        keepIndex = i;
      }
    }

    if (maxDistance > tolerance) {
      keep[keepIndex] = true;
      simplifyRange(startIndex, keepIndex);
      simplifyRange(keepIndex, endIndex);
    }
  }

  simplifyRange(0, points.length - 1);
  return points.filter((_, index) => keep[index]).map((point) => ({ ...point }));
}

function smoothWritingPoints(points, passes = 2) {
  let result = points.map((point) => ({ ...point }));

  for (let pass = 0; pass < passes; pass += 1) {
    result = result.map((point, index) => {
      if (index === 0 || index === result.length - 1) return { ...point };
      const previous = result[index - 1];
      const next = result[index + 1];
      return {
        x: point.x * 0.5 + (previous.x + next.x) * 0.25,
        y: point.y * 0.5 + (previous.y + next.y) * 0.25,
        pressure: point.pressure,
      };
    });
  }

  const average = averagePressure(result);
  return result.map((point) => ({
    ...point,
    pressure: point.pressure * 0.58 + average * 0.42,
  }));
}

function baselineAngle(strokes) {
  const centers = strokes.map(strokeCenter);
  if (centers.length < 2) return 0;

  const mean = centers.reduce(
    (total, point) => ({ x: total.x + point.x / centers.length, y: total.y + point.y / centers.length }),
    { x: 0, y: 0 }
  );
  const stats = centers.reduce(
    (total, point) => ({
      xx: total.xx + (point.x - mean.x) ** 2,
      xy: total.xy + (point.x - mean.x) * (point.y - mean.y),
    }),
    { xx: 0, xy: 0 }
  );

  if (stats.xx < 1) return 0;
  return Math.atan(stats.xy / stats.xx);
}

function lineGroups(strokes) {
  if (!strokes.length) return [];
  const medianHeight = Math.max(8, median(strokes.map(strokeHeight)));
  const lineTolerance = Math.max(12, medianHeight * 0.72);
  const groups = [];

  [...strokes]
    .sort((a, b) => strokeCenter(a).y - strokeCenter(b).y)
    .forEach((stroke) => {
      const center = strokeCenter(stroke);
      let bestGroup = null;
      let bestDistance = Infinity;

      groups.forEach((group) => {
        const distance = Math.abs(center.y - group.centerY);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestGroup = group;
        }
      });

      if (!bestGroup || bestDistance > lineTolerance) {
        groups.push({ centerY: center.y, strokes: [stroke] });
        return;
      }

      bestGroup.strokes.push(stroke);
      bestGroup.centerY = bestGroup.strokes.reduce(
        (total, item) => total + strokeCenter(item).y / bestGroup.strokes.length,
        0
      );
    });

  return groups
    .map((group) => group.strokes.sort((a, b) => strokeBounds(a).minX - strokeBounds(b).minX))
    .sort((a, b) => groupBounds(a).minY - groupBounds(b).minY);
}

function rotatePoints(points, angle, origin) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map((point) => {
    const x = point.x - origin.x;
    const y = point.y - origin.y;
    return {
      ...point,
      x: origin.x + x * cos - y * sin,
      y: origin.y + x * sin + y * cos,
    };
  });
}

function transformPoints(points, transform) {
  return points.map((point) => ({
    ...point,
    x: transform.origin.x + (point.x - transform.origin.x) * transform.scaleX,
    y: transform.baseline + (point.y - transform.baseline) * transform.scaleY,
  }));
}

function lineStyleTransform(stroke, lineMetrics) {
  const bounds = strokeBounds(stroke);
  const center = strokeCenter(stroke);
  const strokeHeightValue = Math.max(1, bounds.maxY - bounds.minY);
  const targetHeight = Math.max(strokeHeightValue * 0.72, Math.min(lineMetrics.targetHeight, strokeHeightValue * 1.08));
  const scaleY = Math.max(0.78, Math.min(1.08, targetHeight / strokeHeightValue));

  return {
    baseline: lineMetrics.baseline,
    origin: center,
    scaleX: 0.98,
    scaleY,
  };
}

function neatenStroke(stroke, angle, origin, lineMetrics = null) {
  const tolerance = Math.max(0.55, Math.min(1.65, stroke.baseSize * 0.075));
  const simplified = simplifyPoints(stroke.points, tolerance);
  let points = rotatePoints(smoothWritingPoints(simplified, 3), angle, origin);
  if (lineMetrics) {
    points = transformPoints(points, lineStyleTransform({ ...stroke, points }, lineMetrics));
  }
  const average = averagePressure(points);

  return {
    ...stroke,
    baseSize: stroke.baseSize * 0.84,
    drops: [],
    points: points.map((point) => ({
      ...point,
      pressure: point.pressure * 0.24 + average * 0.76,
    })),
    shape: null,
  };
}

function neatenRecentWriting() {
  const page = activePage();
  const strokes = recentWritingStrokes(page);
  if (!strokes.length) {
    deviceStatus.textContent = "nothing to neaten";
    return;
  }

  const lines = lineGroups(strokes);
  const lineReplacements = lines.map((line) => {
    const bounds = groupBounds(line);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const lineMetrics = {
      baseline: bounds.maxY - height * 0.08,
      targetHeight: Math.max(10, median(line.map(strokeHeight)) * 0.92),
    };
    const angle = width > height * 1.15 ? baselineAngle(line) : 0;
    const cappedAngle = Math.abs(angle) < 0.36 ? -angle : 0;
    const origin = {
      x: bounds.minX + width / 2,
      y: bounds.minY + height / 2,
    };
    const neatened = line.map((stroke) => neatenStroke(stroke, cappedAngle, origin, lineMetrics));

    return {
      strokes: neatened,
    };
  });
  const replacementsById = new Map();

  lineReplacements.forEach((replacement, index) => {
    const stamped = replacement.strokes.map((stroke) => ({
      ...stroke,
      neatenedAt: Date.now(),
    }));
    replacementsById.set(lines[index][0].id, stamped);
  });
  const targetIds = new Set(strokes.map((stroke) => stroke.id));
  const beforeLayerStrokes = cloneLayerStrokes(page);
  const layer = activeLayer();

  layer.strokes = layer.strokes.reduce((nextStrokes, stroke) => {
    if (!targetIds.has(stroke.id)) {
      nextStrokes.push(stroke);
      return nextStrokes;
    }

    if (replacementsById.has(stroke.id)) {
      nextStrokes.push(...replacementsById.get(stroke.id));
    }

    return nextStrokes;
  }, []);

  state.history.push({
    action: "pageReplace",
    afterLayerStrokes: cloneLayerStrokes(page),
    beforeLayerStrokes,
    pageId: page.id,
  });
  state.redoStack.length = 0;
  invalidateStaticLayer();
  updateHistoryButtons();
  scheduleSave();
  scheduleAutoShare();
  requestRender();
  deviceStatus.textContent = "neatened writing";
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
  renderLayerList();
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
      clearTransformSelection();
      renderPageTabs();
      renderLayerList();
      updateSurfaceButtons();
      invalidateStaticLayer();
      scheduleSave();
      scheduleAutoShare();
      requestRender();
    });
    pageTabs.append(button);
  });
}

function renderLayerList() {
  const page = activePage();
  layerList.replaceChildren();
  page.layers.slice().reverse().forEach((layer) => {
    const row = document.createElement("div");
    row.className = "layer-row";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = layer.name;
    button.classList.toggle("is-active", layer.id === page.activeLayerId);
    button.addEventListener("click", () => {
      page.activeLayerId = layer.id;
      clearTransformSelection();
      renderLayerList();
      scheduleSave();
    });
    const meta = document.createElement("small");
    meta.textContent = `${Math.round(layer.opacity * 100)}%`;
    row.append(button, meta);
    layerList.append(row);
  });

  const layer = activeLayer();
  layerOpacityInput.value = String(Math.round((layer.opacity ?? 1) * 100));
}

function addLayer() {
  const page = activePage();
  const layer = createLayer(page.layers.length + 1);
  page.layers.push(layer);
  page.activeLayerId = layer.id;
  renderLayerList();
  invalidateStaticLayer();
  scheduleSave();
  requestRender();
}

function updateActiveLayerOpacity() {
  const layer = activeLayer();
  layer.opacity = Number(layerOpacityInput.value) / 100;
  renderLayerList();
  invalidateStaticLayer();
  scheduleSave();
  scheduleAutoShare();
  requestRender();
}

function updateTransformFromControls(commit = false) {
  if (!state.transform.selectedIds.length) {
    deviceStatus.textContent = "select an area first";
    return;
  }

  const page = activePage();
  if (!state.transform.baseStrokes) {
    state.transform.baseStrokes = cloneStrokes(selectedTransformStrokes());
  }
  if (!state.transform.beforeLayerStrokes) {
    state.transform.beforeLayerStrokes = cloneLayerStrokes(page);
  }

  state.transform.rotate = (Number(transformRotateInput.value) * Math.PI) / 180;
  state.transform.scale = Number(transformScaleInput.value) / 100;
  applyTransformToSelection({
    dx: 0,
    dy: 0,
    rotate: state.transform.rotate,
    scale: state.transform.scale,
  });

  if (commit) {
    const beforeLayerStrokes = state.transform.beforeLayerStrokes;
    state.history.push({
      action: "pageReplace",
      afterLayerStrokes: cloneLayerStrokes(page),
      beforeLayerStrokes,
      pageId: page.id,
    });
    state.redoStack.length = 0;
    updateHistoryButtons();
    state.transform.baseStrokes = cloneStrokes(selectedTransformStrokes());
    state.transform.beforeLayerStrokes = null;
    resetTransformControls();
    scheduleSave();
    scheduleAutoShare();
  }
}

function clearPage() {
  const page = activePage();
  if (!pageStrokes(page).length) return;
  const layers = page.layers.map((layer) => ({ id: layer.id, strokes: cloneStrokes(layer.strokes) }));
  page.layers.forEach((layer) => {
    layer.strokes = [];
  });
  state.history.push({ action: "clear", layers, pageId: page.id });
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
    const layer = page.layers.find((item) => item.id === op.layerId) || page.layers[0];
    layer.strokes = layer.strokes.filter((stroke) => stroke.id !== op.stroke.id);
  }

  if (op.action === "clear") {
    op.layers.forEach((savedLayer) => {
      const layer = page.layers.find((item) => item.id === savedLayer.id);
      if (layer) layer.strokes = cloneStrokes(savedLayer.strokes);
    });
  }

  if (op.action === "replace") {
    op.before.forEach((stroke) => {
      const layer = page.layers.find((item) => item.id === stroke.layerId) || page.layers[0];
      const index = layer.strokes.findIndex((item) => item.id === stroke.id);
      if (index >= 0) layer.strokes[index] = stroke;
    });
  }

  if (op.action === "pageReplace") {
    restoreLayerStrokes(page, op.beforeLayerStrokes || []);
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
    const layer = page.layers.find((item) => item.id === op.layerId) || page.layers[0];
    layer.strokes.push(op.stroke);
  }

  if (op.action === "clear") {
    page.layers.forEach((layer) => {
      layer.strokes = [];
    });
  }

  if (op.action === "replace") {
    op.after.forEach((stroke) => {
      const layer = page.layers.find((item) => item.id === stroke.layerId) || page.layers[0];
      const index = layer.strokes.findIndex((item) => item.id === stroke.id);
      if (index >= 0) layer.strokes[index] = stroke;
    });
  }

  if (op.action === "pageReplace") {
    restoreLayerStrokes(page, op.afterLayerStrokes || []);
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
addLayerButton.addEventListener("click", addLayer);
layerOpacityInput.addEventListener("input", updateActiveLayerOpacity);
transformRotateInput.addEventListener("input", () => updateTransformFromControls(false));
transformRotateInput.addEventListener("change", () => updateTransformFromControls(true));
transformScaleInput.addEventListener("input", () => updateTransformFromControls(false));
transformScaleInput.addEventListener("change", () => updateTransformFromControls(true));
copySelectionButton.addEventListener("click", copySelection);
pasteSelectionButton.addEventListener("click", pasteSelection);
clearTransformButton.addEventListener("click", clearTransformSelection);
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
neatenButton.addEventListener("click", neatenRecentWriting);
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

  if (event.altKey && event.key.toLowerCase() === "n") {
    event.preventDefault();
    neatenRecentWriting();
    return;
  }

  if (event.key.toLowerCase() === "c") {
    event.preventDefault();
    copySelection();
    return;
  }

  if (event.key.toLowerCase() === "v") {
    event.preventDefault();
    pasteSelection();
    return;
  }

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
renderLayerList();
updateSurfaceButtons();
setTool(state.currentTool);
updateClipboardButtons();
updateFocusMode();
resizeCanvas();
updateHistoryButtons();
refreshNativeState();
