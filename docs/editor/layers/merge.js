import { createLayer, state } from "../state.js";
import { drawLayerToContext, render } from "../render.js";
import { updateUI } from "../ui.js";

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
    const product = values.reduce(
      (result, value) => result * (value / 255),
      1,
    );
    return 255 * product ** (1 / values.length);
  }
  if (method === "dual-geometric-mean") {
    const product = values.reduce(
      (result, value) => 1 - (1 - result) * (1 - value / 255),
      0,
    );
    return 255 * (1 - (1 - product) ** (1 / values.length));
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function renderLayerPixels(layer) {
  const canvas = document.createElement("canvas");
  canvas.width = state.canvasWidth;
  canvas.height = state.canvasHeight;
  const context = canvas.getContext("2d");
  drawLayerToContext(context, layer, { ignoreBlendMode: true });
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

function replaceVisibleLayers(merged) {
  const topVisibleIndex = state.layers.reduce(
    (index, layer, currentIndex) => (layer.visible ? currentIndex : index),
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
}

/** Merge every visible layer by aggregating its rendered pixel values. */
export function mergeAllLayers(method = "average") {
  const visibleLayers = state.layers.filter((layer) => layer.visible);
  if (visibleLayers.length < 2 || !mergeMethods.has(method)) return;

  const canvases = visibleLayers.map(renderLayerPixels);
  const output = new ImageData(state.canvasWidth, state.canvasHeight);
  for (let pixel = 0; pixel < output.data.length; pixel += 4) {
    const samples = [[], [], [], []];
    for (const data of canvases) {
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
    replaceVisibleLayers(merged);
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
