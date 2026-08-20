import { dom, state } from "./state.js";

export function applyViewportTransform() {
  dom.wrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  document.getElementById("zoom-level-display").textContent =
    `${Math.round(state.zoom * 100)}%`;
}

export function fitCanvasToScreen() {
  state.zoom = Math.max(
    0.1,
    Math.min(
      (dom.viewport.clientWidth - 80) / state.canvasWidth,
      (dom.viewport.clientHeight - 80) / state.canvasHeight,
      1,
    ),
  );
  state.panX = 0;
  state.panY = 0;
  applyViewportTransform();
}

export function setupViewport() {
  window.addEventListener("resize", fitCanvasToScreen);
  dom.viewport.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      state.zoom = Math.max(
        0.1,
        Math.min(3, state.zoom + (event.deltaY > 0 ? -0.05 : 0.05)),
      );
      applyViewportTransform();
    },
    { passive: false },
  );
}
