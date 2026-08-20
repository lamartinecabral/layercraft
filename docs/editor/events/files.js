import { addImageLayer } from "../layers/index.js";
import { dom } from "../state.js";
import { on } from "../utils.js";

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (result) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = result.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function addImageFiles(files) {
  for (const file of files) {
    try {
      const image = await readImageFile(file);
      addImageLayer(image, file.name.replace(/\.[^.]*$/, ""));
    } catch (error) {
      console.error(`Failed to load image "${file.name}"`, error);
    }
  }
}

export function bindFileControls() {
  on("btn-add-image", "click", () => dom.fileInput.click());
  on("empty-add-btn", "click", () => dom.fileInput.click());

  dom.fileInput.addEventListener("change", (event) => {
    addImageFiles(Array.from(event.target.files));
    dom.fileInput.value = "";
  });
}
