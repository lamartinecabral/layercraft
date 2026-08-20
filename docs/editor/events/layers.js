import { defaultFilters, dom, getActiveLayer } from "../state.js";
import { render } from "../render.js";
import { resetActiveTransform } from "../layers/index.js";
import { updateUI } from "../ui.js";
import { on } from "../utils.js";

function bindFilter(key, display, suffix, float = false) {
  dom.filters[key].addEventListener("input", (event) => {
    const layer = getActiveLayer();
    if (!layer) return;
    const amount = float
      ? parseFloat(event.target.value)
      : parseInt(event.target.value, 10);
    layer.filters[key] = amount;
    document.getElementById(display).textContent =
      `${float ? amount.toFixed(1) : amount}${suffix}`;
    render();
  });
}

export function bindLayerControls() {
  dom.opacity.addEventListener("input", (event) => {
    const layer = getActiveLayer();
    if (!layer) return;
    layer.opacity = parseInt(event.target.value, 10);
    dom.opacityValue.textContent = `${layer.opacity}%`;
    updateUI();
    render();
  });

  dom.blendMode.addEventListener("change", (event) => {
    const layer = getActiveLayer();
    if (!layer) return;
    layer.blendMode = event.target.value;
    render();
  });

  for (const [key, display, suffix] of [
    ["brightness", "brightness-val", "%"],
    ["contrast", "contrast-val", "%"],
    ["saturate", "saturate-val", "%"],
    ["hue", "hue-val", "°"],
    ["blur", "blur-val", "px"],
  ]) {
    bindFilter(key, display, suffix);
  }
  bindFilter("gamma", "gamma-val", "", true);
  bindFilter("sCurve", "scurve-val", "", true);

  for (const [key, input] of [
    ["width", dom.layerWidth],
    ["height", dom.layerHeight],
  ]) {
    input.addEventListener("input", (event) => resizeLayer(key, event));
  }

  on("btn-reset-filters", "click", resetFilters);
  on("btn-reset-transform", "click", resetActiveTransform);
}

function resizeLayer(key, event) {
  const layer = getActiveLayer();
  const amount = Number(event.target.value);
  if (!layer || !Number.isFinite(amount) || amount < 20) return;

  const axis = key === "width" ? "x" : "y";
  const center = layer[axis] + layer[key] / 2;
  layer[key] = Math.round(amount);
  layer[axis] = center - layer[key] / 2;
  render();
}

function resetFilters() {
  const layer = getActiveLayer();
  if (!layer) return;
  layer.filters = defaultFilters();
  updateUI();
  render();
}
