import { addSolidLayer, applyMathFunctionFilter, mergeAllLayers } from "../layers/index.js";
import { drawLayerToContext } from "../render.js";
import { getActiveLayer, state } from "../state.js";
import { hide, on } from "../utils.js";

export function bindModalControls() {
  bindExportModal();
  bindSolidLayerModal();
  bindMergeModal();
  bindFilterModal();
}

function bindExportModal() {
  const modal = document.getElementById("export-modal");
  on("btn-export", "click", () => modal.classList.remove("hidden"));
  on("btn-close-export", "click", () => hide("export-modal"));
  on("btn-confirm-export", "click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = state.canvasWidth;
    canvas.height = state.canvasHeight;
    const context = canvas.getContext("2d");
    state.layers.forEach((layer) => drawLayerToContext(context, layer));
    const format = document.getElementById("export-format").value;
    const filename = document.getElementById("export-filename").value || "artwork";
    const link = document.createElement("a");
    link.download = `${filename}.${format.split("/")[1]}`;
    link.href = canvas.toDataURL(format, 0.95);
    link.click();
    hide("export-modal");
  });
}

function bindSolidLayerModal() {
  const modal = document.getElementById("solid-layer-modal");
  const hue = document.getElementById("solid-hue-input");
  const sat = document.getElementById("solid-sat-input");
  const light = document.getElementById("solid-light-input");

  const preview = () => {
    for (const [id, input, suffix] of [
      ["solid-hue-val", hue, "°"],
      ["solid-sat-val", sat, "%"],
      ["solid-light-val", light, "%"],
    ]) {
      document.getElementById(id).textContent = `${input.value}${suffix}`;
    }
    document.getElementById("solid-preview-swatch").style.backgroundColor =
      `hsl(${hue.value}, ${sat.value}%, ${light.value}%)`;
  };

  on("btn-add-solid", "click", () => {
    document.getElementById("add-layer-menu").classList.add("hidden");
    hue.value = 210;
    sat.value = 50;
    light.value = 50;
    preview();
    modal.classList.remove("hidden");
  });
  on("btn-close-solid", "click", () => hide("solid-layer-modal"));
  [hue, sat, light].forEach((input) => input.addEventListener("input", preview));
  on("btn-confirm-solid", "click", () => {
    addSolidLayer(+hue.value, +sat.value, +light.value);
    hide("solid-layer-modal");
  });
}

function bindMergeModal() {
  on("btn-close-merge-all", "click", () => hide("merge-all-modal"));
  on("btn-confirm-merge-all", "click", () => {
    mergeAllLayers(document.getElementById("merge-all-method").value);
    hide("merge-all-modal");
  });
}

function bindFilterModal() {
  const modal = document.getElementById("layer-filter-modal");
  on("btn-layer-filter-modal", "click", () => {
    if (getActiveLayer()) modal.classList.remove("hidden");
  });
  on("btn-close-layer-filter", "click", () => hide("layer-filter-modal"));
  on("btn-confirm-layer-filter", "click", () => {
    applyMathFunctionFilter(
      document.getElementById("layer-math-filter-select").value,
    );
    hide("layer-filter-modal");
  });
}
