import {
  getMapViewConfig,
  getMapViewLabel,
  getMapViewTextureKey,
} from "../mapViews.js";

export function createMapTextureController({
  els,
  state,
  changesManager,
  readFileToDataUrl,
}) {
  // Map textures are stored by texture key, not by visible mode id. This lets
  // multiple display modes intentionally share the same underlying image.
  function resolveTextureKeyByMode(mode = state.mapViewMode) {
    return getMapViewTextureKey(state.worldData, mode);
  }

  function applyMapTexture(source) {
    els.mapPhotoLayer.style.setProperty("--map-photo-image", source ? `url("${source}")` : "none");
  }

  function applyTextureForCurrentMapMode() {
    const textureKey = resolveTextureKeyByMode();
    applyMapTexture(state.mapTextureByType?.[textureKey] || "");
  }

  function updateMapTextureButtonLabel() {
    const view = getMapViewConfig(state.worldData, state.mapViewMode);
    const modeLabel = getMapViewLabel(view, state, view.label || view.id);
    els.uploadMapTextureButton.textContent = `Заливка для режима: ${modeLabel}`;
  }

  async function handleMapTextureSelection(file) {
    // Texture uploads are saved as mapTexture changes so they can travel through
    // export/import alongside the rest of the project edits.
    if (!file || !file.type.startsWith("image/")) return;

    const textureKey = resolveTextureKeyByMode();
    const dataUrl = await readFileToDataUrl(file);
    state.mapTextureByType[textureKey] = dataUrl;
    changesManager.upsert("mapTexture", textureKey, dataUrl);
    applyTextureForCurrentMapMode();

    const view = getMapViewConfig(state.worldData, state.mapViewMode);
    const modeLabel = getMapViewLabel(view, state, view.label || view.id);
    els.panelSubtitle.textContent = `Фон режима обновлён: ${modeLabel}`;
    els.panelText.textContent = `Изображение "${file.name}" сохранено для режима "${modeLabel}".`;
  }

  return {
    resolveTextureKeyByMode,
    applyTextureForCurrentMapMode,
    updateMapTextureButtonLabel,
    handleMapTextureSelection,
  };
}
