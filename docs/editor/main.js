import { setupEvents } from "./events.js";
import { setupGestures } from "./gestures.js";
import { fitCanvasToScreen, setupViewport } from "./viewport.js";
import { render } from "./render.js";
import { updateUI } from "./ui.js";

window.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();
  setupEvents();
  setupGestures();
  setupViewport();
  fitCanvasToScreen();
  updateUI();
  render();
});
