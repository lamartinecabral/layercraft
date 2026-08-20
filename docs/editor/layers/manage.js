import { createLayerId, getActiveLayer, state } from "../state.js";
import { render } from "../render.js";
import { updateUI } from "../ui.js";

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
