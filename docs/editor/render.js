import { ctx, dom, getActiveLayer, state } from "./state.js";

function transformTable(fn) {
  const table = Array.from({ length: 256 }, () => []);

  for (let source = 0; source < 256; source++)
    for (let step = 0; step <= 100; step++)
      table[source][step] = Math.round(
        255 * fn(source / 255, +(step / 10 - 5).toFixed(1)),
      );

  return (source, value) => table[source][Math.round(value * 10 + 50)];
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

export function drawLayerToContext(target, layer) {
  if (!layer.visible) return;

  target.save();
  target.globalAlpha = layer.opacity / 100;
  target.globalCompositeOperation = layer.blendMode || "source-over";

  const f = layer.filters;
  const needsPixels = f.gamma !== 0 || f.sCurve !== 0;

  let image = layer.img;

  if (needsPixels) {
    const off = document.createElement("canvas");
    off.width = layer.width;
    off.height = layer.height;
    const offCtx = off.getContext("2d");
    offCtx.filter = cssFilter(f);
    offCtx.drawImage(image, 0, 0, layer.width, layer.height);
    const data = offCtx.getImageData(0, 0, off.width, off.height);

    for (let i = 0; i < data.data.length; i += 4) {
      if (!data.data[i + 3]) continue;

      for (let c = 0; c < 3; c++) {
        let value = data.data[i + c];
        if (f.gamma) value = transforms.gamma(value, f.gamma);
        if (f.sCurve) value = transforms.sCurve(value, f.sCurve);
        data.data[i + c] = value;
      }
    }

    offCtx.putImageData(data, 0, 0);
    image = off;
    target.filter = "none";
  } else target.filter = cssFilter(f);

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
  `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) hue-rotate(${f.hue}deg) blur(${f.blur}px)`;

function drawHandles() {
  const layer = getActiveLayer();
  if (
    !layer ||
    !layer.visible ||
    layer.locked ||
    state.activeTool !== "move"
  )
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
