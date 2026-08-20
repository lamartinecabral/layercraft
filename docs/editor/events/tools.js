import { dom, state } from "../state.js";
import { render } from "../render.js";
import { swapClasses } from "../utils.js";

export function bindToolControls() {
  const moveTool = document.getElementById("tool-move");
  const panTool = document.getElementById("tool-pan");

  moveTool.addEventListener("click", () => {
    if (state.activeTool === "move") return;
    state.activeTool = "move";
    swapClasses(moveTool, panTool);
    dom.viewport.style.cursor = "default";
    render();
  });
  panTool.addEventListener("click", () => {
    if (state.activeTool === "pan") return;
    state.activeTool = "pan";
    swapClasses(moveTool, panTool);
    dom.viewport.style.cursor = "grab";
    render();
  });
}
