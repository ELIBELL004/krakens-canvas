const STORAGE_KEY = "krakens-canvas-v2";

const board = document.querySelector("#board");
const canvas = document.querySelector("#inkCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const inkLayer = document.createElement("canvas");
const inkCtx = inkLayer.getContext("2d", { alpha: true });

const pageTabs = document.querySelector("#pageTabs");
const addPageButton = document.querySelector("#addPageButton");
const sizeInput = document.querySelector("#sizeInput");
const spillInput = document.querySelector("#spillInput");
const smoothInput = document.querySelector("#smoothInput");
const gridInput = document.querySelector("#gridInput");
const gridToggle = document.querySelector("#gridToggle");
const focusToggle = document.querySelector("#focusToggle");
const colorInput = document.querySelector("#colorInput");
const pressureMeter = document.querySelector("#pressureMeter");
const pressureValue = document.querySelector("#pressureValue");
const deviceStatus = document.querySelector("#deviceStatus");
const undoButton = document.querySelector("#undoButton");
const redoButton = document.querySelector("#redoButton");
const clearButton = document.querySelector("#clearButton");
const saveButton = document.querySelector("#saveButton");
const toolButtons = Array.from(document.querySelectorAll("[data-tool]"));
const swatchButtons = Array.from(document.querySelectorAll("[data-color]"));
const toolbar = document.querySelector(".toolbar");

const defaultPalette = ["#f5f5f5", "#9fd3ff", "#ffc46b", "#ff8ca3", "#8ff0bf"];

const state = {
  activePointerId: null,
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
};

function uid() {
  if (crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createPage(index) {
  return {
    id: uid(),
    name: `Page ${index}`,
    strokes: [],
    view: { x: 0, y: 0, scale: 1 },
  };
}

function activePage() {
  return state.pages.find((page) => page.id === state.activePageId) || state.pages[0];
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
    state.pages = Array.isArray(parsed.pages) && parsed.pages.length ? parsed.pages : [createPage(1)];
    state.activePageId = parsed.activePageId || state.pages[0].id;
    state.palette = Array.isArray(parsed.palette) && parsed.palette.length
      ? parsed.palette.slice(0, 5)
      : [...defaultPalette];
    state.inkColor = parsed.inkColor || state.palette[0];
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
      grid: gridInput.value,
      gridVisible: gridToggle.checked,
      size: sizeInput.value,
      smooth: smoothInput.value,
      spill: spillInput.value,
    },
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function getCanvasRect() {
  return canvas.getBoundingClientRect();
}

function resizeCanvas() {
  const rect = getCanvasRect();
  state.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
  canvas.width = Math.max(1, Math.round(rect.width * state.dpr));
  canvas.height = Math.max(1, Math.round(rect.height * state.dpr));
  inkLayer.width = canvas.width;
  inkLayer.height = canvas.height;

  state.pages.forEach((page) => {
    if (!page.view) page.view = { x: rect.width / 2, y: rect.height / 2, scale: 1 };
    if (page.view.x === 0 && page.view.y === 0 && page.strokes.length === 0) {
      page.view.x = rect.width / 2;
      page.view.y = rect.height / 2;
    }
  });

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

function strokeWidth(stroke, pressure) {
  const shaped = Math.pow(Math.max(pressure, 0.08), 0.72);
  const multiplier = stroke.tool === "eraser" ? 1.8 : 1.45;
  return stroke.baseSize * (0.22 + shaped * multiplier);
}

function responsivePressure(pressure) {
  return Math.pow(Math.max(pressure, 0.16), 0.58);
}

function requestRender() {
  if (state.renderQueued) return;
  state.renderQueued = true;
  requestAnimationFrame(render);
}

function render() {
  state.renderQueued = false;
  const rect = getCanvasRect();
  const page = activePage();

  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, rect.width, rect.height);

  if (gridToggle.checked) {
    drawGrid(ctx, rect.width, rect.height, page.view);
  }

  inkCtx.setTransform(1, 0, 0, 1, 0, 0);
  inkCtx.clearRect(0, 0, inkLayer.width, inkLayer.height);
  inkCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  inkCtx.lineCap = "round";
  inkCtx.lineJoin = "round";
  inkCtx.translate(page.view.x, page.view.y);
  inkCtx.scale(page.view.scale, page.view.scale);

  page.strokes.forEach((stroke) => drawStroke(inkCtx, stroke));
  if (state.currentStroke) drawStroke(inkCtx, state.currentStroke);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(inkLayer, 0, 0);
}

function drawGrid(targetCtx, width, height, view) {
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
    targetCtx.strokeStyle = isMajor
      ? "rgba(190, 190, 190, 0.5)"
      : "rgba(168, 168, 168, 0.28)";
    targetCtx.beginPath();
    targetCtx.moveTo(Math.round(screen) + 0.5, 0);
    targetCtx.lineTo(Math.round(screen) + 0.5, height);
    targetCtx.stroke();
  }

  for (let y = startY; y <= endY; y += grid) {
    const screen = worldToScreen({ x: 0, y }, view).y;
    const isMajor = Math.abs(Math.round(y / major) * major - y) < 0.01;
    targetCtx.strokeStyle = isMajor
      ? "rgba(190, 190, 190, 0.5)"
      : "rgba(168, 168, 168, 0.28)";
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
  if (points.length === 1) {
    const point = points[0];
    const pressure = responsivePressure(point.pressure);
    targetCtx.globalAlpha = stroke.tool === "eraser" ? 1 : Math.min(0.96, 0.68 + pressure * 0.28);
    targetCtx.beginPath();
    targetCtx.arc(point.x, point.y, strokeWidth(stroke, pressure) / 2, 0, Math.PI * 2);
    targetCtx.fill();
    return;
  }

  const pressure = responsivePressure(averagePressure(points));
  targetCtx.globalAlpha = stroke.tool === "eraser" ? 1 : Math.min(0.96, 0.68 + pressure * 0.28);
  targetCtx.lineWidth = strokeWidth(stroke, pressure);
  targetCtx.beginPath();
  targetCtx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    targetCtx.lineTo(points[1].x, points[1].y);
  } else {
    for (let i = 1; i < points.length - 1; i += 1) {
      const midpoint = {
        x: (points[i].x + points[i + 1].x) / 2,
        y: (points[i].y + points[i + 1].y) / 2,
      };
      targetCtx.quadraticCurveTo(points[i].x, points[i].y, midpoint.x, midpoint.y);
    }
    const last = points[points.length - 1];
    targetCtx.lineTo(last.x, last.y);
  }

  targetCtx.stroke();
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
  toolButtons.forEach((button) => {
    const active = button.dataset.tool === tool;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
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

function addPointToStroke(stroke, event) {
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

  if (last && Math.hypot(point.x - last.x, point.y - last.y) < 0.2) {
    return;
  }

  stroke.points.push(point);
  updatePressure(pressure);
  maybeAddDrops(stroke, last, point);
}

function maybeAddDrops(stroke, from, to) {
  if (!from || stroke.tool !== "pen") return;

  const spill = stroke.spill / 100;
  const pressure = Math.max(from.pressure, to.pressure, 0.08);
  if (spill <= 0 || pressure < 0.64) return;

  const width = strokeWidth(stroke, pressure);
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const dropletCount = Math.floor(distance * spill * pressure * 0.1);

  for (let i = 0; i < dropletCount; i += 1) {
    const t = Math.random();
    const centerX = from.x + (to.x - from.x) * t;
    const centerY = from.y + (to.y - from.y) * t;
    const sprayRadius = width * (0.45 + pressure * 1.7) * spill;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * sprayRadius;

    stroke.drops.push({
      alpha: Math.min(0.34, 0.04 + pressure * spill * 0.22),
      radius: Math.max(0.45, width * (0.018 + Math.random() * 0.046) * pressure),
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }
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
  if (event.pointerId !== state.activePointerId) return;

  if (state.lastPanPoint) {
    const page = activePage();
    page.view.x += event.clientX - state.lastPanPoint.x;
    page.view.y += event.clientY - state.lastPanPoint.y;
    state.lastPanPoint = { x: event.clientX, y: event.clientY };
    scheduleSave();
    requestRender();
    return;
  }

  if (!state.drawing || !state.currentStroke) return;
  const events =
    typeof event.getCoalescedEvents === "function"
      ? event.getCoalescedEvents()
      : [event];

  (events.length ? events : [event]).forEach((coalesced) => {
    addPointToStroke(state.currentStroke, coalesced);
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
    updateHistoryButtons();
    scheduleSave();
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
  scheduleSave();
  requestRender();
}

function addPage() {
  const page = createPage(state.pages.length + 1);
  const rect = getCanvasRect();
  page.view.x = rect.width / 2;
  page.view.y = rect.height / 2;
  state.pages.push(page);
  state.activePageId = page.id;
  renderPageTabs();
  scheduleSave();
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
      scheduleSave();
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
  updateHistoryButtons();
  scheduleSave();
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
  updateHistoryButtons();
  scheduleSave();
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
  updateHistoryButtons();
  scheduleSave();
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

swatchButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    state.selectedPaletteIndex = index;
    setInkColor(state.palette[index] || button.dataset.color);
  });
});

colorInput.addEventListener("input", () => setInkColor(colorInput.value, { updatePalette: true }));
addPageButton.addEventListener("click", addPage);
canvas.addEventListener("pointerdown", startPointer);
canvas.addEventListener("pointermove", movePointer);
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("wheel", zoomAt, { passive: false });
undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
clearButton.addEventListener("click", clearPage);
saveButton.addEventListener("click", savePng);
gridInput.addEventListener("input", () => {
  scheduleSave();
  requestRender();
});
gridToggle.addEventListener("change", () => {
  scheduleSave();
  requestRender();
});
focusToggle.addEventListener("change", updateFocusMode);

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") state.spaceDown = true;

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
setInkColor(state.inkColor);
renderPageTabs();
updateFocusMode();
resizeCanvas();
updateHistoryButtons();
