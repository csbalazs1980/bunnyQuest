// A small message at the top of the screen that fades away (friendly fire note, trade results, ...).

/** Shows `text` for `ms`, then fades it out. */
export function toast(text: string, ms: number) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.classList.add("gone"), ms);
  setTimeout(() => el.remove(), ms + 600);
}
