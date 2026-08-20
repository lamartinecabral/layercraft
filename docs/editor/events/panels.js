import { dom, state } from "../state.js";
import { render } from "../render.js";
import { updateUI } from "../ui.js";
import { hide, on, swapClasses } from "../utils.js";

export function bindPanelControls() {
  on("btn-clear-all", "click", () => {
    state.layers = [];
    state.activeLayerId = null;
    updateUI();
    render();
  });

  const sidebar = document.getElementById("right-sidebar");
  on("btn-toggle-sidebar", "click", () =>
    sidebar.classList.toggle("hidden"),
  );
  on("btn-close-sidebar", "click", () => hide("right-sidebar"));

  const layersTab = document.getElementById("tab-layers-btn");
  const adjustmentsTab = document.getElementById("tab-adjustments-btn");
  const layersContent = document.getElementById("tab-layers-content");
  const adjustmentsContent = document.getElementById("tab-adjustments-content");

  layersTab.addEventListener("click", () => {
    if (!layersContent.classList.contains("hidden")) return;
    layersContent.classList.remove("hidden");
    adjustmentsContent.classList.add("hidden");
    swapClasses(layersTab, adjustmentsTab);
  });
  adjustmentsTab.addEventListener("click", () => {
    if (!adjustmentsContent.classList.contains("hidden")) return;
    adjustmentsContent.classList.remove("hidden");
    layersContent.classList.add("hidden");
    swapClasses(layersTab, adjustmentsTab);
  });
}
