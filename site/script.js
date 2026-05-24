const canvas = document.querySelector("#fieldCanvas");
const ctx = canvas.getContext("2d");
const demoCanvas = document.querySelector("#demoCanvas");
const demoCtx = demoCanvas.getContext("2d", { alpha: true });
const demoClear = document.querySelector("#demoClear");
const demoSwatches = Array.from(document.querySelectorAll("[data-demo-color]"));

const strokes = [
  { x: 0.18, y: 0.22, vx: 0.00032, vy: 0.00018, color: "rgba(217, 161, 72, 0.28)" },
  { x: 0.72, y: 0.32, vx: -0.00021, vy: 0.00026, color: "rgba(136, 219, 177, 0.18)" },
  { x: 0.48, y: 0.74, vx: 0.00025, vy: -0.00018, color: "rgba(223, 114, 141, 0.2)" },
];

const demo = {
  color: "#d9a148",
  dpr: 1,
  drawing: false,
  lastPoint: null,
  pointerId: null,
};

function resize() {
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  resizeDemoCanvas();
}

function drawStroke(stroke, time) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const x = ((stroke.x + Math.sin(time * stroke.vx) * 0.055) % 1) * width;
  const y = ((stroke.y + Math.cos(time * stroke.vy) * 0.055) % 1) * height;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = Math.max(18, width * 0.018);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x - 140, y + Math.sin(time * 0.0012) * 24);
  ctx.bezierCurveTo(
    x - 40,
    y - 70,
    x + 76,
    y + 68,
    x + 172,
    y - 12
  );
  ctx.stroke();
  ctx.restore();
}

function frame(time) {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  strokes.forEach((stroke) => drawStroke(stroke, time));
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(frame);

function resizeDemoCanvas() {
  const rect = demoCanvas.getBoundingClientRect();
  const backup = document.createElement("canvas");
  const hasDrawing = demoCanvas.width > 0 && demoCanvas.height > 0;

  if (hasDrawing) {
    backup.width = demoCanvas.width;
    backup.height = demoCanvas.height;
    backup.getContext("2d").drawImage(demoCanvas, 0, 0);
  }

  demo.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  demoCanvas.width = Math.max(1, Math.round(rect.width * demo.dpr));
  demoCanvas.height = Math.max(1, Math.round(rect.height * demo.dpr));
  demoCtx.setTransform(1, 0, 0, 1, 0, 0);
  demoCtx.clearRect(0, 0, demoCanvas.width, demoCanvas.height);

  if (hasDrawing) {
    demoCtx.drawImage(
      backup,
      0,
      0,
      backup.width,
      backup.height,
      0,
      0,
      demoCanvas.width,
      demoCanvas.height
    );
  }

  demoCtx.setTransform(demo.dpr, 0, 0, demo.dpr, 0, 0);
  demoCtx.lineCap = "round";
  demoCtx.lineJoin = "round";
}

function demoPoint(event) {
  const rect = demoCanvas.getBoundingClientRect();
  return {
    pressure: event.pressure > 0 ? event.pressure : event.buttons ? 0.56 : 0,
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function demoWidth(pressure) {
  return 7 + Math.pow(Math.max(pressure, 0.18), 0.62) * 18;
}

function drawDemoSegment(from, to) {
  const pressure = Math.max(from.pressure, to.pressure, 0.18);
  demoCtx.save();
  demoCtx.globalAlpha = Math.min(0.96, 0.64 + pressure * 0.3);
  demoCtx.strokeStyle = demo.color;
  demoCtx.lineWidth = demoWidth(pressure);
  demoCtx.beginPath();
  demoCtx.moveTo(from.x, from.y);
  demoCtx.lineTo(to.x, to.y);
  demoCtx.stroke();
  demoCtx.restore();
}

function startDemoStroke(event) {
  if (event.button !== 0 && event.pointerType !== "touch") return;

  demo.drawing = true;
  demo.pointerId = event.pointerId;
  demo.lastPoint = demoPoint(event);
  demoCanvas.setPointerCapture(event.pointerId);
}

function continueDemoStroke(event) {
  if (!demo.drawing || event.pointerId !== demo.pointerId) return;

  const events =
    typeof event.getCoalescedEvents === "function"
      ? event.getCoalescedEvents()
      : [event];

  for (const currentEvent of events.length ? events : [event]) {
    const point = demoPoint(currentEvent);
    if (demo.lastPoint) {
      drawDemoSegment(demo.lastPoint, point);
    }
    demo.lastPoint = point;
  }
}

function stopDemoStroke(event) {
  if (event.pointerId !== demo.pointerId) return;

  continueDemoStroke(event);
  demo.drawing = false;
  demo.pointerId = null;
  demo.lastPoint = null;

  if (demoCanvas.hasPointerCapture(event.pointerId)) {
    demoCanvas.releasePointerCapture(event.pointerId);
  }
}

demoCanvas.addEventListener("pointerdown", startDemoStroke);
demoCanvas.addEventListener("pointermove", continueDemoStroke);
demoCanvas.addEventListener("pointerup", stopDemoStroke);
demoCanvas.addEventListener("pointercancel", stopDemoStroke);

demoClear.addEventListener("click", () => {
  demoCtx.save();
  demoCtx.setTransform(1, 0, 0, 1, 0, 0);
  demoCtx.clearRect(0, 0, demoCanvas.width, demoCanvas.height);
  demoCtx.restore();
});

demoSwatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    demo.color = swatch.dataset.demoColor;
    demoSwatches.forEach((button) => button.classList.toggle("is-active", button === swatch));
  });
});
