import { DRAW_BRUSH_PALETTE } from "./uiConfig.js";
import {
  canUserSeeMapViewSwitcher,
  getMapViewLabel,
  getMapViews,
  resolveMapViewMode,
} from "./mapViews.js";

export function createMapControlsController(options) {
  const {
    els,
    state,
    getMapEditorCallbacks,
    renderArchive,
  } = options;

  const getCallbacks = () => getMapEditorCallbacks?.() || {};

  // Body classes mirror the active map display mode so CSS can switch art,
  // textures, and mode-specific styling without manual DOM rewrites.
  function getBodyClassForMode(modeId) {
    return `map-view-${String(modeId || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
  }

  function renderViewSwitcher() {
    // Editors can always see all configured view modes. Players only see the
    // subset allowed by world settings.
    if (!els.mapViewSwitcher) return;

    const visibleModes = state.editMode
      ? getMapViews(state.worldData)
      : getMapViews(state.worldData, { includeHidden: false });

    els.mapViewSwitcher.innerHTML = "";
    visibleModes.forEach((view) => {
      const button = document.createElement("button");
      button.className = "map-view-btn";
      button.type = "button";
      button.dataset.mapView = view.id;
      button.textContent = getMapViewLabel(view, state, view.label || view.id);
      button.classList.toggle("active", view.id === state.mapViewMode);
      els.mapViewSwitcher.appendChild(button);
    });

    const shouldShowSwitcher = state.editMode || canUserSeeMapViewSwitcher(state.worldData);
    els.mapViewSwitcher.hidden = !shouldShowSwitcher || visibleModes.length <= 1;
  }

  function setDisplayMode(mode, options = {}) {
    // Switching display mode may also force archive cards to re-render because
    // they can pick different images for different map styles.
    const nextMode = resolveMapViewMode(state.worldData, mode);
    const shouldRenderArchive = options.rerenderArchive !== false;
    state.mapViewMode = nextMode;

    const knownModes = getMapViews(state.worldData);
    knownModes.forEach((entry) => {
      document.body.classList.toggle(getBodyClassForMode(entry.id), entry.id === nextMode);
    });

    renderViewSwitcher();
    getCallbacks().onMapViewModeChange?.(nextMode);

    if (shouldRenderArchive) {
      renderArchive();
    }
  }

  function setupViewSwitcher() {
    if (!els.mapViewSwitcher) return;
    els.mapViewSwitcher.addEventListener("click", (event) => {
      const button = event.target.closest("[data-map-view]");
      if (!button) return;
      setDisplayMode(button.dataset.mapView);
    });
  }

  function setupDrawBrushPalette() {
    // Draw tools reuse a fixed palette so hand-drawn annotations stay visually
    // consistent across projects.
    els.drawBrushColorSelect.innerHTML = "";
    DRAW_BRUSH_PALETTE.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.value;
      option.textContent = entry.label;
      els.drawBrushColorSelect.appendChild(option);
    });
    els.drawBrushColorSelect.value = state.drawBrushColor || DRAW_BRUSH_PALETTE[0].value;
    els.drawBrushSizeInput.value = String(state.drawBrushSize || 2);
  }

  return {
    renderViewSwitcher,
    setDisplayMode,
    setupDrawBrushPalette,
    setupViewSwitcher,
    getVisibleModes: () => (state.editMode ? getMapViews(state.worldData) : getMapViews(state.worldData, { includeHidden: false })),
  };
}
