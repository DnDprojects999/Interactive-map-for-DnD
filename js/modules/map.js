import { clamp } from "./state.js";
import { getMapViewTextureKey } from "./mapViews.js";

export function createMapModule(els, state, ui) {
  const FALLBACK_MIN_MAP_SCALE = 0.6;
  const BASE_IMAGE_MIN_MAP_SCALE = 1;
  const MAX_MAP_SCALE = 4;
  const MAP_INTERACTIVE_TARGETS = ".marker, .active-map-marker, .region-label, .active-route-hit, .active-route-line";

  // If the current map mode has a real texture, we keep the user from zooming
  // out far enough to expose empty space around the image.
  function hasBaseMapImage() {
    const textureKey = getMapViewTextureKey(state.worldData, state.mapViewMode);
    return Boolean(state.mapTextureByType?.[textureKey]?.trim?.());
  }

  function getMinMapScale() {
    return hasBaseMapImage() ? BASE_IMAGE_MIN_MAP_SCALE : FALLBACK_MIN_MAP_SCALE;
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
    // All overlays sit inside the same transformed layer, so one transform keeps
    // map art, labels, markers, and active-map elements visually aligned.
    state.mapScale = clamp(state.mapScale, getMinMapScale(), MAX_MAP_SCALE);
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
      // Convert the pointer into "world" coordinates first so zooming feels
      // anchored under the cursor instead of around the container center.
      const worldX = (mouseX - state.mapOffsetX) / state.mapScale;
      const worldY = (mouseY - state.mapOffsetY) / state.mapScale;

      const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
      state.mapScale = clamp(state.mapScale * zoomFactor, getMinMapScale(), MAX_MAP_SCALE);

      state.mapOffsetX = mouseX - worldX * state.mapScale;
      state.mapOffsetY = mouseY - worldY * state.mapScale;
      applyMapTransform();
    }, { passive: false });

    els.mapStage.addEventListener("pointerdown", (event) => {
      if (event.button === 2) event.preventDefault();
      const isMarker = event.target.classList.contains("marker");
      if (isMarker) return;
      const interactiveTarget = event.target.closest(MAP_INTERACTIVE_TARGETS);
      const routeDrawingPointer =
        state.activeMapMode
        && state.editMode
        && state.activeMapTool === "route"
        && event.button === 0
        && !interactiveTarget;
      if (routeDrawingPointer) return;

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
    // Positions are stored in percentages so markers stay stable across screen
    // sizes, zoom levels, and responsive layout changes.
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
