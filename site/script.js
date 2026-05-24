const canvas = document.querySelector("#fieldCanvas");
const ctx = canvas.getContext("2d");

const strokes = [
  { x: 0.18, y: 0.22, vx: 0.00032, vy: 0.00018, color: "rgba(217, 161, 72, 0.28)" },
  { x: 0.72, y: 0.32, vx: -0.00021, vy: 0.00026, color: "rgba(136, 219, 177, 0.18)" },
  { x: 0.48, y: 0.74, vx: 0.00025, vy: -0.00018, color: "rgba(223, 114, 141, 0.2)" },
];

function resize() {
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
