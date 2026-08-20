import { dom, state } from "../state.js";
import {
  deleteActiveLayer,
  duplicateActiveLayer,
  mergeActiveLayerDown,
  moveLayerOrder,
} from "../layers/index.js";
import { hide, on } from "../utils.js";
import { bindFileControls } from "./files.js";
import { bindLayerControls } from "./layers.js";
import { bindModalControls } from "./modals.js";
import { bindPanelControls } from "./panels.js";
import { bindToolControls } from "./tools.js";
import { bindViewportControls } from "./viewport.js";

export function setupEvents() {
  bindAddLayerMenu();
  bindFileControls();

  on("btn-layer-up", "click", () => moveLayerOrder("up"));
  on("btn-layer-down", "click", () => moveLayerOrder("down"));
  on("btn-duplicate-layer", "click", duplicateActiveLayer);
  on("btn-merge-layer", "click", mergeActiveLayerDown);
  on("btn-merge-all", "click", () => {
    if (state.layers.length > 1) {
      document.getElementById("merge-all-modal").classList.remove("hidden");
    }
  });
  on("btn-delete-layer", "click", deleteActiveLayer);

  bindLayerControls();
  bindViewportControls();
  bindPanelControls();
  bindToolControls();
  bindModalControls();
}

function bindAddLayerMenu() {
  const menu = document.getElementById("add-layer-menu");
  const dropdown = document.getElementById("btn-add-layer-dropdown");

  dropdown.addEventListener("click", (event) => {
    event.stopPropagation();
    menu.classList.toggle("hidden");
  });

  window.addEventListener("click", (event) => {
    if (!menu.contains(event.target) && !dropdown.contains(event.target)) {
      menu.classList.add("hidden");
    }
  });

  on("btn-add-image", "click", () => hide("add-layer-menu"));
}
