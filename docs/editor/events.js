import {
  defaultFilters,
  dom,
  getActiveLayer,
  initCanvasDimensions,
  state,
} from "./state.js";
import {
  addImageLayer,
  addSolidLayer,
  applyMathFunctionFilter,
  deleteActiveLayer,
  duplicateActiveLayer,
  mergeActiveLayerDown,
  moveLayerOrder,
  resetActiveTransform,
} from "./layers.js";
import { drawLayerToContext, render } from "./render.js";
import { applyViewportTransform, fitCanvasToScreen } from "./viewport.js";
import { updateUI } from "./ui.js";
import { hide, on } from "./utils.js";

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

export function setupEvents() {
  const menu = document.getElementById("add-layer-menu"),
    dropdown = document.getElementById("btn-add-layer-dropdown");

  dropdown.addEventListener("click", (event) => {
    event.stopPropagation();
    menu.classList.toggle("hidden");
  });

  window.addEventListener("click", (event) => {
    if (!menu.contains(event.target) && !dropdown.contains(event.target))
      menu.classList.add("hidden");
  });

  on("btn-add-image", "click", () => {
    hide("add-layer-menu");
    dom.fileInput.click();
  });

  on("empty-add-btn", "click", () => dom.fileInput.click());

  dom.fileInput.addEventListener("change", (event) => {
    const files = Array.from(event.target.files);
    const loadImage = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (result) => {
          const image = new Image();
          image.onload = () => {
            addImageLayer(image, file.name.replace(/\.[^.]*$/, ""));
            resolve();
          };
          image.onerror = reject;
          image.src = result.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    files.reduce(
      (chain, file) =>
        chain.then(() =>
          loadImage(file).catch((error) =>
            console.error(`Failed to load image "${file.name}"`, error),
          ),
        ),
      Promise.resolve(),
    );
    dom.fileInput.value = "";
  });

  on("btn-layer-up", "click", () => moveLayerOrder("up"));
  on("btn-layer-down", "click", () => moveLayerOrder("down"));
  on("btn-duplicate-layer", "click", duplicateActiveLayer);
  on("btn-merge-layer", "click", mergeActiveLayerDown);
  on("btn-delete-layer", "click", deleteActiveLayer);

  dom.opacity.addEventListener("input", (event) => {
    const layer = getActiveLayer();
    if (layer) {
      layer.opacity = parseInt(event.target.value, 10);
      dom.opacityValue.textContent = `${layer.opacity}%`;
      updateUI();
      render();
    }
  });

  dom.blendMode.addEventListener("change", (event) => {
    const layer = getActiveLayer();
    if (layer) {
      layer.blendMode = event.target.value;
      render();
    }
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
    input.addEventListener("input", (event) => {
      const layer = getActiveLayer(),
        amount = Number(event.target.value);
      if (!layer || !Number.isFinite(amount) || amount < 20) return;
      const axis = key === "width" ? "x" : "y",
        center = layer[axis] + layer[key] / 2;
      layer[key] = Math.round(amount);
      layer[axis] = center - layer[key] / 2;
      render();
    });
  }

  on("btn-reset-filters", "click", () => {
    const layer = getActiveLayer();
    if (layer) {
      layer.filters = defaultFilters();
      updateUI();
      render();
    }
  });

  on("btn-reset-transform", "click", resetActiveTransform);
  on("btn-zoom-in", "click", () => {
    state.zoom = Math.min(3, Math.round(state.zoom * 8 + 1) / 8);
    applyViewportTransform();
  });
  on("btn-zoom-out", "click", () => {
    state.zoom = Math.max(0.125, Math.round(state.zoom * 8 - 1) / 8);
    applyViewportTransform();
  });
  on("btn-zoom-fit", "click", fitCanvasToScreen);
  on("btn-canvas-size", "click", () => {
    dom.canvasWidth.value = state.canvasWidth;
    dom.canvasHeight.value = state.canvasHeight;
    dom.canvasSizeError.classList.add("hidden");
    dom.canvasSizeModal.classList.remove("hidden");
  });
  on("btn-close-canvas-size", "click", () => hide("canvas-size-modal"));

  dom.canvasSizeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const width = Number(dom.canvasWidth.value),
      height = Number(dom.canvasHeight.value);
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      width > 10000 ||
      height < 1 ||
      height > 10000
    ) {
      dom.canvasSizeError.classList.remove("hidden");
      return;
    }
    initCanvasDimensions(width, height);
    hide("canvas-size-modal");
    fitCanvasToScreen();
    render();
  });

  on("btn-clear-all", "click", () => {
    state.layers = [];
    state.activeLayerId = null;
    updateUI();
    render();
  });

  on("btn-toggle-sidebar", "click", () =>
    document.getElementById("right-sidebar").classList.toggle("hidden"),
  );
  on("btn-close-sidebar", "click", () => hide("right-sidebar"));

  const layersTab = document.getElementById("tab-layers-btn");
  const adjustmentsTab = document.getElementById("tab-adjustments-btn");
  const layersContent = document.getElementById("tab-layers-content");
  const adjustmentsContent = document.getElementById("tab-adjustments-content");

  layersTab.addEventListener("click", () => {
    if (layersContent.classList.contains("hidden")) {
      [layersTab.className, adjustmentsTab.className] = [
        adjustmentsTab.className,
        layersTab.className,
      ];
    }
    layersContent.classList.remove("hidden");
    adjustmentsContent.classList.add("hidden");
  });
  adjustmentsTab.addEventListener("click", () => {
    if (adjustmentsContent.classList.contains("hidden")) {
      [layersTab.className, adjustmentsTab.className] = [
        adjustmentsTab.className,
        layersTab.className,
      ];
    }
    adjustmentsContent.classList.remove("hidden");
    layersContent.classList.add("hidden");
  });

  const moveTool = document.getElementById("tool-move");
  const panTool = document.getElementById("tool-pan");

  moveTool.addEventListener("click", () => {
    if (state.activeTool === "pan") {
      [moveTool.className, panTool.className] = [
        panTool.className,
        moveTool.className,
      ];
    }
    state.activeTool = "move";
    dom.viewport.style.cursor = "default";
    render();
  });
  panTool.addEventListener("click", () => {
    if (state.activeTool === "move") {
      [moveTool.className, panTool.className] = [
        panTool.className,
        moveTool.className,
      ];
    }
    state.activeTool = "pan";
    dom.viewport.style.cursor = "grab";
    render();
  });
  bindModals();
}

function bindModals() {
  const exportModal = document.getElementById("export-modal");
  on("btn-export", "click", () => exportModal.classList.remove("hidden"));
  on("btn-close-export", "click", () => hide("export-modal"));
  on("btn-confirm-export", "click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = state.canvasWidth;
    canvas.height = state.canvasHeight;
    const context = canvas.getContext("2d");
    state.layers.forEach((layer) => drawLayerToContext(context, layer));
    const format = document.getElementById("export-format").value,
      link = document.createElement("a");
    link.download = `${document.getElementById("export-filename").value || "artwork"}.${format.split("/")[1]}`;
    link.href = canvas.toDataURL(format, 0.95);
    link.click();
    hide("export-modal");
  });

  const modal = document.getElementById("solid-layer-modal"),
    hue = document.getElementById("solid-hue-input"),
    sat = document.getElementById("solid-sat-input"),
    light = document.getElementById("solid-light-input");

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
  [hue, sat, light].forEach((input) =>
    input.addEventListener("input", preview),
  );
  on("btn-confirm-solid", "click", () => {
    addSolidLayer(+hue.value, +sat.value, +light.value);
    hide("solid-layer-modal");
  });
  const filterModal = document.getElementById("layer-filter-modal");
  on("btn-layer-filter-modal", "click", () => {
    if (getActiveLayer()) filterModal.classList.remove("hidden");
  });
  on("btn-close-layer-filter", "click", () => hide("layer-filter-modal"));
  on("btn-confirm-layer-filter", "click", () => {
    applyMathFunctionFilter(
      document.getElementById("layer-math-filter-select").value,
    );
    hide("layer-filter-modal");
  });
}
