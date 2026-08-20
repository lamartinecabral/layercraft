import { getActiveLayer, state } from "../state.js";
import { render } from "../render.js";
import { updateUI } from "../ui.js";

const pixelTransforms = {
  invert: (value) => 1 - value,
  sin: (value) => Math.abs(Math.sin(value * 2 * Math.PI)),
  cos: (value) => Math.abs(Math.cos(value * 2 * Math.PI)),
  solarize: (value) => 1 - Math.abs(2 * value - 1),
  sqrt: (value) => Math.sqrt(value),
  dualsqrt: (value) => 1 - Math.sqrt(1 - value),
  ogamma: (value) =>
    value < 0.5 ? Math.sqrt(value * 2) / 2 : 1 - Math.sqrt(2 - value * 2) / 2,
};

const compositeFilters = new Set([
  "multiply",
  "screen",
  "overlay",
  "color-dodge",
  "color-burn",
  "soft-light",
  "exclusion",
]);

function createLayerCanvas(layer) {
  const canvas = document.createElement("canvas");
  canvas.width = layer.width;
  canvas.height = layer.height;
  const context = canvas.getContext("2d");
  context.drawImage(layer.img, 0, 0, layer.width, layer.height);
  return { canvas, context };
}

function applyCompositeFilter(context, layer, filterKey) {
  context.globalCompositeOperation = filterKey;
  context.drawImage(layer.img, 0, 0, layer.width, layer.height);
}

function applyPixelFilter(context, canvas, filterKey) {
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  const transform = pixelTransforms[filterKey];
  for (let i = 0; i < data.data.length; i += 4) {
    if (!data.data[i + 3] || !transform) continue;
    for (let channel = 0; channel < 3; channel++) {
      data.data[i + channel] = Math.round(
        255 * transform(data.data[i + channel] / 255),
      );
    }
  }
  context.putImageData(data, 0, 0);
}

function commitFilteredImage(layer, filterKey, source) {
  const filtered = new Image();
  filtered.onload = () => {
    if (!state.layers.includes(layer)) return;
    layer.img = filtered;
    layer.name += ` (${filterKey})`;
    updateUI();
    render();
  };
  filtered.src = source.toDataURL("image/png");
}

export function applyMathFunctionFilter(filterKey) {
  const layer = getActiveLayer();
  if (!layer) return;

  const { canvas, context } = createLayerCanvas(layer);
  if (compositeFilters.has(filterKey)) {
    applyCompositeFilter(context, layer, filterKey);
  } else {
    applyPixelFilter(context, canvas, filterKey);
  }
  commitFilteredImage(layer, filterKey, canvas);
}
