/* All Locations gallery: filters the statically rendered cards in place. */
(() => {
  "use strict";
  const grid = document.getElementById("gallery");
  const controls = document.querySelector("[data-gallery-controls]");
  if (!grid || !controls) return;
  const cards = [...grid.querySelectorAll(".gallery-card")];
  const search = document.getElementById("gallery-search");
  const count = document.getElementById("gallery-count");
  const empty = document.getElementById("gallery-empty");
  const buttons = [...controls.querySelectorAll("[data-gallery-type]")];
  const params = new URLSearchParams(location.search);
  let type = buttons.some((b) => b.dataset.galleryType === params.get("type")) ? params.get("type") : "";
  search.value = params.get("q") || "";
  controls.hidden = false;
  function apply() {
    const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const card of cards) {
      const match = (!type || card.dataset.types.split("|").includes(type)) && words.every((w) => card.dataset.search.includes(w));
      card.hidden = !match;
      if (match) shown++;
    }
    for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.galleryType === type));
    count.textContent = `${shown} ${shown === 1 ? "place" : "places"}`;
    empty.hidden = shown > 0;
    const next = new URLSearchParams();
    if (search.value.trim()) next.set("q", search.value.trim());
    if (type) next.set("type", type);
    history.replaceState({}, "", location.pathname + (next.size ? "?" + next : ""));
  }
  search.addEventListener("input", apply);
  controls.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-gallery-type]");
    if (!b) return;
    type = b.dataset.galleryType;
    apply();
  });
  apply();
})();
