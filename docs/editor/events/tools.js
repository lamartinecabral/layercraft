import { dom, initCanvasDimensions, state } from "../state.js";
import { render } from "../render.js";
import { fitCanvasToScreen } from "../viewport.js";

const toolIds = ["tool-move", "tool-pan", "tool-shape"];

function setActiveTool(tool) {
  if (tool !== "shape") {
    state.shapePreview = null;
    state.dragState = null;
  }
  state.activeTool = tool;
  for (const id of toolIds) {
    const button = document.getElementById(id);
    button.classList.toggle("active", id === `tool-${tool}`);
    button.classList.toggle("text-indigo-400", id === `tool-${tool}`);
    button.classList.toggle("bg-slate-800", id === `tool-${tool}`);
    button.classList.toggle("text-slate-400", id !== `tool-${tool}`);
  }

  document
    .getElementById("shape-options")
    .classList.toggle("hidden", tool !== "shape");
  dom.viewport.style.cursor =
    tool === "pan" ? "grab" : tool === "shape" ? "crosshair" : "default";

  if (
    tool === "shape" &&
    !state.layers.length &&
    (dom.canvas.width !== state.canvasWidth ||
      dom.canvas.height !== state.canvasHeight)
  ) {
    initCanvasDimensions(state.canvasWidth, state.canvasHeight);
    fitCanvasToScreen();
  }
  render();
}

function setShapeType(type) {
  state.shapeType = type;
  document.querySelectorAll("[data-shape-type]").forEach((button) => {
    const selected = button.dataset.shapeType === type;
    button.classList.toggle("text-indigo-300", selected);
    button.classList.toggle("bg-indigo-600/30", selected);
    button.classList.toggle("text-slate-400", !selected);
  });
}

function bindShapeStyleControls() {
  const color = document.getElementById("shape-color-input");
  const filled = document.getElementById("shape-filled-input");
  const lineWidth = document.getElementById("shape-line-width-input");

  color.addEventListener("input", () => {
    state.shapeColor = color.value;
    render();
  });
  filled.addEventListener("change", () => {
    state.shapeFilled = filled.checked;
    render();
  });
  lineWidth.addEventListener("input", () => {
    state.shapeLineWidth = Number(lineWidth.value);
    document.getElementById("shape-line-width-value").textContent =
      `${state.shapeLineWidth}px`;
    render();
  });
}

export function bindToolControls() {
  const moveTool = document.getElementById("tool-move");
  const panTool = document.getElementById("tool-pan");
  const shapeTool = document.getElementById("tool-shape");

  moveTool.addEventListener("click", () => setActiveTool("move"));
  panTool.addEventListener("click", () => setActiveTool("pan"));
  shapeTool.addEventListener("click", () => setActiveTool("shape"));
  document.querySelectorAll("[data-shape-type]").forEach((button) => {
    button.addEventListener("click", () => {
      setShapeType(button.dataset.shapeType);
      setActiveTool("shape");
    });
  });
  setShapeType(state.shapeType);
  bindShapeStyleControls();
}
