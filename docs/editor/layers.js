import {
  createLayerId,
  defaultFilters,
  getActiveLayer,
  initCanvasDimensions,
  state,
} from "./state.js";
import { render, drawLayerToContext } from "./render.js";
import { updateUI } from "./ui.js";
import { fitCanvasToScreen } from "./viewport.js";

export function addImageLayer(img, name = null) {
  if (!state.layers.length) {
    initCanvasDimensions(img.naturalWidth || 1080, img.naturalHeight || 1080);
    fitCanvasToScreen();
  }

  const width = img.naturalWidth || 500;
  const height = img.naturalHeight || 500;
  const layer = {
    id: createLayerId(),
    name: name || `Layer ${state.nextLayerNum++}`,
    img,
    x: (state.canvasWidth - width) / 2,
    y: (state.canvasHeight - height) / 2,
    width,
    height,
    rotation: 0,
    opacity: 100,
    blendMode: "source-over",
    visible: true,
    locked: false,
    filters: defaultFilters(),
  };

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
    const layer = {
      id: createLayerId(),
      name: `Solid (${h}°, ${s}%, ${l}%)`,
      img,
      x: 0,
      y: 0,
      width: state.canvasWidth,
      height: state.canvasHeight,
      rotation: 0,
      opacity: 100,
      blendMode: "source-over",
      visible: true,
      locked: false,
      filters: defaultFilters(),
    };

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

    const merged = {
      id: createLayerId(),
      name: `${below.name} + ${active.name}`,
      img: image,
      x: 0,
      y: 0,
      width: state.canvasWidth,
      height: state.canvasHeight,
      rotation: 0,
      opacity: 100,
      blendMode: "source-over",
      visible: true,
      locked: false,
      filters: defaultFilters(),
    };

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

export function applyMathFunctionFilter(filterKey) {
  const layer = getActiveLayer();
  if (!layer) return;

  const source = document.createElement("canvas");
  source.width = layer.width;
  source.height = layer.height;
  const sourceCtx = source.getContext("2d");
  sourceCtx.drawImage(layer.img, 0, 0, layer.width, layer.height);

  if (
    [
      "multiply",
      "screen",
      "overlay",
      "color-dodge",
      "color-burn",
      "soft-light",
      "exclusion",
    ].includes(filterKey)
  ) {
    sourceCtx.globalCompositeOperation = filterKey;
    sourceCtx.drawImage(layer.img, 0, 0, layer.width, layer.height);
  } else {
    const data = sourceCtx.getImageData(0, 0, source.width, source.height);
    for (let i = 0; i < data.data.length; i += 4) {
      if (!data.data[i + 3]) continue;
      for (let c = 0; c < 3; c++) {
        const value = data.data[i + c];
        if (filterKey === "invert") data.data[i + c] = 255 - value;
        if (filterKey === "sin")
          data.data[i + c] = Math.round(
            255 * Math.abs(Math.sin((value * 2 * Math.PI) / 255)),
          );
        if (filterKey === "cos")
          data.data[i + c] = Math.round(
            255 * Math.abs(Math.cos((value * 2 * Math.PI) / 255)),
          );
        if (filterKey === "solarize")
          data.data[i + c] = Math.round(
            255 * (1 - Math.abs((2 * value) / 255 - 1)),
          );
      }
    }

    sourceCtx.putImageData(data, 0, 0);
  }

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
