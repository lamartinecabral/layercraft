/** @type {<T extends null | keyof HTMLElementTagNameMap>(tag: T, id: string) => null extends T ? HTMLElement : HTMLElementTagNameMap[T]} */
export const getElem = (tag, id) => {
  const elem = document.getElementById(id);
  if (!elem) throw new Error(`Element with id "${id}" not found`);
  if (tag && elem.tagName.toLowerCase() !== tag.toLowerCase()) {
    throw new Error(`Element with id "${id}" is not a <${tag}>`);
  }
  return elem;
};

export const value = (id, text) => {
  getElem(null, id).textContent = text;
};

export const on = (id, event, handler) =>
  getElem(null, id).addEventListener(event, handler);

export const hide = (id) => getElem(null, id).classList.add("hidden");

export const show = (id) => getElem(null, id).classList.remove("hidden");
