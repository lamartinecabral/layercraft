import { dom, getActiveLayer, state } from "./state.js";
import { render } from "./render.js";
import { value } from "./utils.js";

const escapeHtml = (text) =>
  String(text).replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character],
  );

export function updateLayerSizeInputs() {
  const layer = getActiveLayer();
  if (layer) {
    dom.layerWidth.value = Math.round(layer.width);
    dom.layerHeight.value = Math.round(layer.height);
  }
}

export function updateUI() {
  const active = getActiveLayer();

  dom.layersList.innerHTML = "";

  state.layers
    .slice()
    .reverse()
    .forEach((layer) => {
      const item = document.createElement("div");
      item.className = `group/layer flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition relative ${layer.id === state.activeLayerId ? "bg-indigo-600/20 border-indigo-500/50 text-white" : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"}`;
      item.innerHTML = `
        <button class="btn-vis text-slate-400 hover:text-white p-1">
          <i data-lucide="${layer.visible ? "eye" : "eye-off"}" class="w-3.5 h-3.5"></i>
        </button>
        <div class="w-8 h-8 rounded bg-slate-900 border border-slate-700/80 flex items-center justify-center overflow-hidden shrink-0">
          <img src="${layer.img.src}" class="w-full h-full object-cover">
        </div>
        <span class="layer-name-span font-medium truncate flex-1">${escapeHtml(layer.name)}</span>
        <button class="btn-rename opacity-0 group-hover/layer:opacity-100 transition p-1 text-slate-400 hover:text-white rounded">
          <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
        </button>
        <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-400 font-mono">${layer.opacity}%</span>
      `;

      item.addEventListener("click", (event) => {
        if (event.target.closest("button") || event.target.closest("input"))
          return;
        state.activeLayerId = layer.id;
        updateUI();
        render();
      });

      item.querySelector(".btn-vis").addEventListener("click", (event) => {
        event.stopPropagation();
        layer.visible = !layer.visible;
        updateUI();
        render();
      });

      item.querySelector(".btn-rename").addEventListener("click", (event) => {
        event.stopPropagation();
        const input = document.createElement("input");
        input.type = "text";
        input.value = layer.name;
        input.className =
          "bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded border border-indigo-500 outline-none flex-1 font-medium";
        item.querySelector(".layer-name-span").replaceWith(input);
        input.focus();
        input.select();
        let editingFinished = false;
        const finish = () => {
          if (editingFinished) return;
          editingFinished = true;
          if (input.value.trim()) layer.name = input.value.trim();
          updateUI();
        };
        const cancel = () => {
          if (editingFinished) return;
          editingFinished = true;
          updateUI();
        };
        input.addEventListener("blur", finish);
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") finish();
          if (event.key === "Escape") cancel();
        });
      });

      dom.layersList.appendChild(item);
    });

  const merge = document.getElementById("btn-merge-layer");

  const index = state.layers.findIndex(
    (layer) => layer.id === state.activeLayerId,
  );

  merge.disabled = index <= 0;
  merge.classList.toggle("opacity-40", merge.disabled);
  merge.classList.toggle("cursor-not-allowed", merge.disabled);

  if (window.lucide) lucide.createIcons();

  if (!active) {
    document
      .getElementById("adjustments-no-selection")
      .classList.remove("hidden");
    document.getElementById("adjustments-controls").classList.add("hidden");
    return;
  }

  dom.opacity.value = active.opacity;
  dom.opacityValue.textContent = `${active.opacity}%`;
  dom.blendMode.value = active.blendMode || "source-over";

  updateLayerSizeInputs();

  for (const [key, input] of Object.entries(dom.filters))
    input.value = active.filters[key] ?? 0;

  value("brightness-val", `${active.filters.brightness}%`);
  value("contrast-val", `${active.filters.contrast}%`);
  value("saturate-val", `${active.filters.saturate}%`);
  value("hue-val", `${active.filters.hue}°`);
  value("blur-val", `${active.filters.blur}px`);
  value("gamma-val", `${Number(active.filters.gamma ?? 0).toFixed(1)}`);
  value("scurve-val", `${Number(active.filters.sCurve ?? 0).toFixed(1)}`);

  document.getElementById("adjustments-no-selection").classList.add("hidden");
  document.getElementById("adjustments-controls").classList.remove("hidden");
}
