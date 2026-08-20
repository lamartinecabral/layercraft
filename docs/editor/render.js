import { ctx, dom, getActiveLayer, state } from "./state.js";

const COLOR_VALUE_COUNT = 256;
const FILTER_STEP_COUNT = 100;
const FILTER_STEP_SCALE = 10;
const FILTER_RANGE = 5;

function transformTable(fn) {
  const table = Array.from({ length: COLOR_VALUE_COUNT }, () => []);

  for (let source = 0; source < COLOR_VALUE_COUNT; source++) {
    for (let step = 0; step <= FILTER_STEP_COUNT; step++) {
      table[source][step] = Math.round(
        (COLOR_VALUE_COUNT - 1) *
          fn(
            source / (COLOR_VALUE_COUNT - 1),
            +(step / FILTER_STEP_SCALE - FILTER_RANGE).toFixed(1),
          ),
      );
    }
  }

  return (source, value) =>
    table[source][
      Math.round(value * FILTER_STEP_SCALE + FILTER_RANGE * FILTER_STEP_SCALE)
    ];
}

const transforms = {
  gamma: transformTable((x, y) =>
    y > 0 ? x ** (1 / 2 ** y) : 1 - (1 - x) ** (1 / 2 ** -y),
  ),

  sCurve: transformTable((x, y) =>
    x < 0.5
      ? (x * 2) ** (2 ** (y / 2)) / 2
      : 1 - ((1 - x) * 2) ** (2 ** (y / 2)) / 2,
  ),
};

function createPixelFilteredImage(layer) {
  const f = layer.filters;
  const canvas = document.createElement("canvas");
  canvas.width = layer.width;
  canvas.height = layer.height;
  const context = canvas.getContext("2d");
  context.filter = cssFilter(f);
  context.drawImage(layer.img, 0, 0, layer.width, layer.height);

  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.data.length; i += 4) {
    if (!data.data[i + 3]) continue;

    for (let channel = 0; channel < 3; channel++) {
      let value = data.data[i + channel];
      if (f.gamma) value = transforms.gamma(value, f.gamma);
      if (f.sCurve) value = transforms.sCurve(value, f.sCurve);
      data.data[i + channel] = value;
    }
  }

  context.putImageData(data, 0, 0);
  return canvas;
}

export function drawLayerToContext(target, layer) {
  if (!layer.visible) return;

  target.save();
  target.globalAlpha = layer.opacity / 100;
  target.globalCompositeOperation = layer.blendMode || "source-over";

  const f = layer.filters;
  const needsPixels = f.gamma !== 0 || f.sCurve !== 0;
  const image = needsPixels ? createPixelFilteredImage(layer) : layer.img;
  target.filter = needsPixels ? "none" : cssFilter(f);

  target.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);

  if (layer.rotation) target.rotate((layer.rotation * Math.PI) / 180);

  target.drawImage(
    image,
    -layer.width / 2,
    -layer.height / 2,
    layer.width,
    layer.height,
  );

  target.restore();
}

export const cssFilter = (f) =>
  [
    `brightness(${f.brightness}%)`,
    `contrast(${f.contrast}%)`,
    `saturate(${f.saturate}%)`,
    `hue-rotate(${f.hue}deg)`,
    `blur(${f.blur}px)`,
  ].join(" ");

function drawHandles() {
  const layer = getActiveLayer();
  if (!layer || !layer.visible || layer.locked || state.activeTool !== "move")
    return;
  ctx.save();
  ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
  if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
  const w = layer.width / 2,
    h = layer.height / 2,
    size = 10 / state.zoom;
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 2 / state.zoom;
  ctx.setLineDash([6 / state.zoom, 4 / state.zoom]);
  ctx.strokeRect(-w, -h, layer.width, layer.height);
  ctx.setLineDash([]);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#4f46e5";
  for (const point of [
    { x: -w, y: -h },
    { x: w, y: -h },
    { x: w, y: h },
    { x: -w, y: h },
  ]) {
    ctx.beginPath();
    ctx.rect(point.x - size / 2, point.y - size / 2, size, size);
    ctx.fill();
    ctx.stroke();
  }
  const rotationY = -h - 25 / state.zoom;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(0, rotationY);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, rotationY, size / 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function render() {
  dom.emptyState.classList.toggle("hidden", state.layers.length > 0);

  ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);

  state.layers.forEach((layer) => drawLayerToContext(ctx, layer));

  drawHandles();
}
