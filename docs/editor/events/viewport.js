import { dom, initCanvasDimensions, state } from "../state.js";
import { render } from "../render.js";
import { applyViewportTransform, fitCanvasToScreen } from "../viewport.js";
import { hide, on } from "../utils.js";

export function bindViewportControls() {
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
    const width = Number(dom.canvasWidth.value);
    const height = Number(dom.canvasHeight.value);
    if (!validCanvasSize(width, height)) {
      dom.canvasSizeError.classList.remove("hidden");
      return;
    }

    initCanvasDimensions(width, height);
    hide("canvas-size-modal");
    fitCanvasToScreen();
    render();
  });
}

function validCanvasSize(width, height) {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width >= 1 &&
    width <= 10000 &&
    height >= 1 &&
    height <= 10000
  );
}
