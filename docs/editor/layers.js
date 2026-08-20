import {
  createLayer,
  createLayerId,
  defaultFilters,
  getActiveLayer,
  initCanvasDimensions,
  state,
} from "./state.js";
import { render, drawLayerToContext } from "./render.js";
import { updateUI } from "./ui.js";
import { fitCanvasToScreen } from "./viewport.js";

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

export function addImageLayer(img, name = null) {
  if (!state.layers.length) {
    initCanvasDimensions(img.naturalWidth || 1080, img.naturalHeight || 1080);
    fitCanvasToScreen();
  }

  const width = img.naturalWidth || 500;
  const height = img.naturalHeight || 500;
  const layer = createLayer({
    name: name || `Layer ${state.nextLayerNum++}`,
    img,
    x: (state.canvasWidth - width) / 2,
    y: (state.canvasHeight - height) / 2,
    width,
    height,
  });

  state.layers.push(layer);
  state.activeLayerId = layer.id;

  updateUI();
  render();
}

export function addSolidLayer(h, s, l) {
  if (!state.layers.length) {
    initCanvasDimensions(1080, 1080);
    fitCanvasToScreen();
  }

  const source = document.createElement("canvas");
  source.width = state.canvasWidth;
  source.height = state.canvasHeight;
  const sourceCtx = source.getContext("2d");
  sourceCtx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
  sourceCtx.fillRect(0, 0, source.width, source.height);

  const img = new Image();
  img.onload = () => {
    const layer = createLayer({
      name: `Solid (${h}°, ${s}%, ${l}%)`,
      img,
      x: 0,
      y: 0,
      width: state.canvasWidth,
      height: state.canvasHeight,
    });

    state.layers.push(layer);
    state.activeLayerId = layer.id;

    updateUI();
    render();
  };

  img.src = source.toDataURL("image/png");
}

export function deleteActiveLayer() {
  const index = state.layers.findIndex(
    (layer) => layer.id === state.activeLayerId,
  );

  if (index < 0) return;

  state.layers.splice(index, 1);
  state.activeLayerId = state.layers.length
    ? state.layers[Math.max(0, index - 1)].id
    : null;

  updateUI();
  render();
}

export function duplicateActiveLayer() {
  const index = state.layers.findIndex(
    (layer) => layer.id === state.activeLayerId,
  );

  if (index < 0) return;

  const source = state.layers[index];
  const match = source.name.match(/^(.*?)(\d+)(\D*)$/);
  const name = match
    ? `${match[1]}${parseInt(match[2], 10) + 1}${match[3]}`
    : `${source.name} 2`;

  const layer = {
    ...source,
    id: createLayerId(),
    name,
    img: source.img,
    filters: { ...source.filters },
  };

  state.layers.splice(index + 1, 0, layer);
  state.activeLayerId = layer.id;

  updateUI();
  render();
}

export function moveLayerOrder(direction) {
  const index = state.layers.findIndex(
    (layer) => layer.id === state.activeLayerId,
  );

  const target = direction === "up" ? index + 1 : index - 1;

  if (index < 0 || target < 0 || target >= state.layers.length) return;

  [state.layers[index], state.layers[target]] = [
    state.layers[target],
    state.layers[index],
  ];

  updateUI();
  render();
}

const mergeMethods = new Set([
  "average",
  "max",
  "min",
  "median",
  "geometric-mean",
  "dual-geometric-mean",
]);

function aggregate(values, method) {
  if (method === "max") return Math.max(...values);
  if (method === "min") return Math.min(...values);
  if (method === "median") {
    const sorted = values.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  }
  if (method === "geometric-mean") {
    // Work in normalized color space to avoid overflowing the product.
    const product = values.reduce(
      (result, value) => result * (value / 255),
      1,
    );
    return 255 * product ** (1 / values.length);
  }
  if (method === "dual-geometric-mean") {
    // The complement of the geometric mean of the complements.
    const product = values.reduce(
      (result, value) => 1 - (1 - result) * (1 - value / 255),
      0,
    );
    return 255 * (1 - (1 - product) ** (1 / values.length));
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Merge every visible layer by aggregating its rendered pixel values. */
export function mergeAllLayers(method = "average") {
  const visibleLayers = state.layers.filter((layer) => layer.visible);
  if (visibleLayers.length < 2 || !mergeMethods.has(method)) return;

  const canvases = visibleLayers.map((layer) => {
    const canvas = document.createElement("canvas");
    canvas.width = state.canvasWidth;
    canvas.height = state.canvasHeight;
    const context = canvas.getContext("2d");
    drawLayerToContext(context, layer, { ignoreBlendMode: true });
    return context.getImageData(0, 0, canvas.width, canvas.height).data;
  });
  const output = new ImageData(state.canvasWidth, state.canvasHeight);

  for (let pixel = 0; pixel < output.data.length; pixel += 4) {
    const samples = [[], [], [], []];
    for (const data of canvases) {
      // Transparent pixels are not color samples. This also keeps a layer
      // outside the canvas from pulling the result toward black.
      if (!data[pixel + 3]) continue;
      for (let channel = 0; channel < 4; channel++)
        samples[channel].push(data[pixel + channel]);
    }
    if (!samples[3].length) continue;
    for (let channel = 0; channel < 4; channel++)
      output.data[pixel + channel] = Math.round(
        aggregate(samples[channel], method),
      );
  }

  const canvas = document.createElement("canvas");
  canvas.width = state.canvasWidth;
  canvas.height = state.canvasHeight;
  canvas.getContext("2d").putImageData(output, 0, 0);
  const image = new Image();
  image.onload = () => {
    const merged = createLayer({
      name: `Merged (${method})`,
      img: image,
      x: 0,
      y: 0,
      width: state.canvasWidth,
      height: state.canvasHeight,
    });
    // Keep hidden layers in their existing order. Place the merged layer where
    // the uppermost visible layer was, so hidden layers are never rendered as
    // part of the aggregate and remain independently editable.
    const topVisibleIndex = state.layers.reduce(
      (index, layer, currentIndex) =>
        layer.visible ? currentIndex : index,
      -1,
    );
    state.layers = state.layers.reduce((layers, layer, index) => {
      if (layer.visible) {
        if (index === topVisibleIndex) layers.push(merged);
      } else {
        layers.push(layer);
      }
      return layers;
    }, []);
    state.activeLayerId = merged.id;
    updateUI();
    render();
  };
  image.src = canvas.toDataURL("image/png");
}

export function mergeActiveLayerDown() {
  const index = state.layers.findIndex(
    (layer) => layer.id === state.activeLayerId,
  );

  if (index <= 0) return;

  const below = state.layers[index - 1];
  const active = state.layers[index];

  const canvas = document.createElement("canvas");
  canvas.width = state.canvasWidth;
  canvas.height = state.canvasHeight;
  const context = canvas.getContext("2d");

  drawLayerToContext(context, below);
  drawLayerToContext(context, active);

  const image = new Image();
  image.onload = () => {
    const currentIndex = state.layers.indexOf(active);
    if (currentIndex <= 0 || state.layers[currentIndex - 1] !== below) return;

    const merged = createLayer({
      name: `${below.name} + ${active.name}`,
      img: image,
      x: 0,
      y: 0,
      width: state.canvasWidth,
      height: state.canvasHeight,
    });

    state.layers.splice(currentIndex - 1, 2, merged);
    state.activeLayerId = merged.id;

    updateUI();
    render();
  };
  image.src = canvas.toDataURL("image/png");
}

export function resetActiveTransform() {
  const layer = getActiveLayer();
  if (!layer) return;

  const width = layer.img.naturalWidth || 500;
  const height = layer.img.naturalHeight || 500;

  Object.assign(layer, {
    width,
    height,
    x: (state.canvasWidth - width) / 2,
    y: (state.canvasHeight - height) / 2,
    rotation: 0,
  });

  updateUI();
  render();
}

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
