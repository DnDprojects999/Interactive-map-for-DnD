import { clamp } from "./state.js";

export function createMapModule(els, state, ui) {
  function hasBaseMapImage() {
    return Boolean(els.mapTransform.querySelector("#mapBaseImage, .map-base-image"));
  }

  function constrainMapOffsetToImageBounds() {
    if (!hasBaseMapImage()) return;

    const rect = els.mapStage.getBoundingClientRect();
    const scaledWidth = rect.width * state.mapScale;
    const scaledHeight = rect.height * state.mapScale;

    const maxOffsetX = scaledWidth <= rect.width ? (rect.width - scaledWidth) / 2 : 0;
    const minOffsetX = scaledWidth <= rect.width ? maxOffsetX : rect.width - scaledWidth;
    const maxOffsetY = scaledHeight <= rect.height ? (rect.height - scaledHeight) / 2 : 0;
    const minOffsetY = scaledHeight <= rect.height ? maxOffsetY : rect.height - scaledHeight;

    state.mapOffsetX = clamp(state.mapOffsetX, minOffsetX, maxOffsetX);
    state.mapOffsetY = clamp(state.mapOffsetY, minOffsetY, maxOffsetY);
  }

  function applyMapTransform() {
    constrainMapOffsetToImageBounds();
    els.mapTransform.style.transform = `translate(${state.mapOffsetX}px, ${state.mapOffsetY}px) scale(${state.mapScale})`;
    els.mapStage.style.setProperty("--overlay-scale-inverse", (1 / state.mapScale).toFixed(4));
    els.mapStage.style.setProperty("--overlay-scale", state.mapScale.toFixed(4));
    document.body.classList.toggle("zoom-near", state.mapScale >= 1.8);
    els.mapScaleIndicator.textContent = `x${state.mapScale.toFixed(2)}`;
  }

  function setupMapNavigation() {
    els.mapStage.addEventListener("wheel", (event) => {
      event.preventDefault();

      const rect = els.mapStage.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // "World" координаты нужны, чтобы масштабирование происходило относительно курсора,
      // а не геометрического центра контейнера.
      const worldX = (mouseX - state.mapOffsetX) / state.mapScale;
      const worldY = (mouseY - state.mapOffsetY) / state.mapScale;

      const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
      state.mapScale = clamp(state.mapScale * zoomFactor, 0.6, 4);

      state.mapOffsetX = mouseX - worldX * state.mapScale;
      state.mapOffsetY = mouseY - worldY * state.mapScale;
      applyMapTransform();
    }, { passive: false });

    els.mapStage.addEventListener("pointerdown", (event) => {
      if (event.button === 2) event.preventDefault();
      const isMarker = event.target.classList.contains("marker");
      if (isMarker) return;

      if (state.editMode && event.button === 0 && event.target !== els.mapStage && event.target !== els.mapTransform) {
        return;
      }

      state.isPanning = true;
      state.panPointerId = event.pointerId;
      state.panStartX = event.clientX - state.mapOffsetX;
      state.panStartY = event.clientY - state.mapOffsetY;
      els.mapStage.classList.add("panning");
      els.mapStage.setPointerCapture(event.pointerId);
    });

    els.mapStage.addEventListener("pointermove", (event) => {
      if (!state.isPanning || event.pointerId !== state.panPointerId) return;
      state.mapOffsetX = event.clientX - state.panStartX;
      state.mapOffsetY = event.clientY - state.panStartY;
      applyMapTransform();
    });

    const stopPanning = (event) => {
      if (!state.isPanning) return;
      if (event && event.pointerId !== state.panPointerId) return;
      if (typeof state.panPointerId === "number" && els.mapStage.hasPointerCapture(state.panPointerId)) {
        els.mapStage.releasePointerCapture(state.panPointerId);
      }
      state.isPanning = false;
      state.panPointerId = null;
      els.mapStage.classList.remove("panning");
    };

    els.mapStage.addEventListener("pointerup", stopPanning);
    els.mapStage.addEventListener("pointercancel", stopPanning);
    els.mapStage.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  function getMapPercentFromClient(clientX, clientY) {
    // Метки сохраняются в процентах: это делает их устойчивыми к адаптивной вёрстке и разным разрешениям.
    const rect = els.mapStage.getBoundingClientRect();
    const x = clamp(((clientX - rect.left - state.mapOffsetX) / (rect.width * state.mapScale)) * 100, 0, 100);
    const y = clamp(((clientY - rect.top - state.mapOffsetY) / (rect.height * state.mapScale)) * 100, 0, 100);
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  }

  return {
    applyMapTransform,
    setupMapNavigation,
    getMapPercentFromClient,
  };
}
