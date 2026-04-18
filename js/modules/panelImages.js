import { getUiText } from "./uiLocale.js";

export function updatePanelImageView(els, marker, context = null) {
  // The side panel treats marker and timeline-event images the same way, so the
  // preview renderer only cares about a generic record with image fields.
  const imageUrl = typeof marker?.imageUrl === "string" ? marker.imageUrl.trim() : "";
  const caption = marker?.imageText || getUiText(context, "image_caption_placeholder");

  els.panelImageCaption.textContent = caption;
  els.panelImageUrlInput.value = imageUrl;
  els.panelImageHint.textContent = marker?.imageAssetSuggestedPath
    ? `Рекомендуемый путь ассета: ${marker.imageAssetSuggestedPath}`
    : getUiText(context, "image_hint");

  if (!imageUrl) {
    els.panelImagePreview.hidden = true;
    els.panelImagePreview.removeAttribute("src");
    return;
  }

  els.panelImagePreview.src = imageUrl;
  els.panelImagePreview.hidden = false;
}

export function setupPanelImageInteractions(options) {
  const {
    els,
    state,
    readFileToDataUrl,
    getSuggestedAssetPath,
    getChangeRecorder,
  } = options;

  const getRecorder = () => getChangeRecorder?.() || { upsert: () => {} };
  const getPanelEntity = () => state.currentPanelEntity?.entity || "marker";
  const getCurrentRecord = () => state.currentPanelEntity?.entity === "timelineEvent"
    ? state.currentTimelineEvent
    : state.currentMarker;

  // Image edits are committed through the same recorder as text edits, which
  // keeps panel media changes exportable through changes.json.
  const commitCurrentMarkerImage = () => {
    const currentRecord = getCurrentRecord();
    if (!state.editMode || !currentRecord) return;
    currentRecord.imageUrl = els.panelImageUrlInput.value.trim();
    currentRecord.imageText = els.panelImageCaption.textContent.trim();
    getRecorder().upsert(getPanelEntity(), currentRecord.id, currentRecord);
    updatePanelImageView(els, currentRecord, state);
  };

  els.applyImageUrlButton.addEventListener("click", commitCurrentMarkerImage);

  els.panelImage.addEventListener("click", (event) => {
    if (!state.editMode || !getCurrentRecord()) return;
    if (event.target.closest("#panelImageControls")) return;
    if (event.target === els.panelImageCaption) return;
    els.panelImageFileInput.click();
  });

  els.panelImageUrlInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitCurrentMarkerImage();
  });

  // Uploaded, pasted, and dropped images all funnel through one file handler.
  const applyFile = async (file) => {
    const currentRecord = getCurrentRecord();
    if (!file || !state.editMode || !currentRecord) return;
    if (!file.type.startsWith("image/")) return;

    try {
      const dataUrl = await readFileToDataUrl(file);
      currentRecord.imageAssetSuggestedPath = getSuggestedAssetPath(file.name);
      els.panelImageUrlInput.value = dataUrl;
      els.panelImageHint.textContent = `Файл вставлен как data URL. Рекомендуемый путь ассета: ${currentRecord.imageAssetSuggestedPath}`;
      commitCurrentMarkerImage();
    } catch (error) {
      console.error(error);
    }
  };

  els.panelImageFileInput.addEventListener("change", async (event) => {
    const [file] = Array.from(event.target.files || []);
    await applyFile(file);
    els.panelImageFileInput.value = "";
  });

  els.panelImage.addEventListener("dragover", (event) => {
    if (!state.editMode) return;
    event.preventDefault();
    els.panelImage.classList.add("is-drop-target");
  });

  els.panelImage.addEventListener("dragleave", () => {
    els.panelImage.classList.remove("is-drop-target");
  });

  els.panelImage.addEventListener("drop", async (event) => {
    if (!state.editMode) return;
    event.preventDefault();
    els.panelImage.classList.remove("is-drop-target");
    const [file] = Array.from(event.dataTransfer?.files || []);
    await applyFile(file);
  });

  els.panelImage.addEventListener("paste", async (event) => {
    if (!state.editMode || !getCurrentRecord()) return;
    const imageItem = Array.from(event.clipboardData?.items || []).find((item) => item.type.startsWith("image/"));
    const file = imageItem?.getAsFile();
    if (!file) return;
    event.preventDefault();
    await applyFile(file);
  });
}
