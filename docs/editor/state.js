import { getElem } from "./utils.js";

export const state = {
  canvasWidth: 1080,
  canvasHeight: 1080,
  zoom: 1,
  panX: 0,
  panY: 0,
  layers: [],
  activeLayerId: null,
  activeTool: "move",
  isPanning: false,
  panStart: { x: 0, y: 0 },
  dragState: null,
  nextLayerNum: 1,
};

export const dom = {
  canvas: getElem("canvas", "editor-canvas"),
  viewport: getElem("main", "viewport-container"),
  wrapper: getElem("div", "canvas-wrapper"),
  emptyState: getElem("div", "empty-state"),
  layersList: getElem("div", "layers-list"),
  opacity: getElem("input", "opacity-slider"),
  opacityValue: getElem("span", "opacity-val-display"),
  blendMode: getElem("select", "blend-mode-select"),
  fileInput: getElem("input", "input-file"),
  canvasSizeModal: getElem("div", "canvas-size-modal"),
  canvasSizeForm: getElem("form", "canvas-size-form"),
  canvasWidth: getElem("input", "canvas-width-input"),
  canvasHeight: getElem("input", "canvas-height-input"),
  canvasSizeError: getElem("p", "canvas-size-error"),
  layerWidth: getElem("input", "layer-width-input"),
  layerHeight: getElem("input", "layer-height-input"),
  filters: {
    brightness: getElem("input", "filter-brightness"),
    contrast: getElem("input", "filter-contrast"),
    saturate: getElem("input", "filter-saturate"),
    hue: getElem("input", "filter-hue"),
    blur: getElem("input", "filter-blur"),
    gamma: getElem("input", "filter-gamma"),
    sCurve: getElem("input", "filter-scurve"),
  },
};

export const ctx = dom.canvas.getContext("2d");

export const defaultFilters = () => ({
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
  blur: 0,
  gamma: 0,
  sCurve: 0,
});

export const getActiveLayer = () =>
  state.layers.find((layer) => layer.id === state.activeLayerId);

export const createLayerId = () =>
  `layer_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

export function initCanvasDimensions(width, height) {
  state.canvasWidth = width;
  state.canvasHeight = height;
  dom.canvas.width = width;
  dom.canvas.height = height;
  document.getElementById("canvas-dim-display").textContent =
    `${width} × ${height} px`;
}
