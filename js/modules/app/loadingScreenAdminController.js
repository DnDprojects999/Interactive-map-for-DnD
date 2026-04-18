import { getUiText } from "../uiLocale.js";
import { resolveWorldInfoForLanguage } from "../worldInfo.js";
import { setLocalizedValue } from "../localization.js";

// Flavor lines are stored as a list but edited through free-form text inputs,
// so these helpers normalize both textarea-style and row-style input.
function normalizeFlavorLines(rawValue) {
  return String(rawValue || "")
    .split(/\r?\n/)
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function collectFlavorLinesFromList(container) {
  return Array.from(container.querySelectorAll(".loading-editor-line-input"))
    .map((input) => String(input.value || "").trim())
    .filter(Boolean);
}

export function createLoadingScreenAdminController(options) {
  const {
    els,
    state,
    persistWorldInfo,
    previewLoadingScreen,
  } = options;

  function isOpen() {
    return Boolean(els.loadingEditorPanel && !els.loadingEditorPanel.hidden);
  }

  function getLocalizedWorldInfo() {
    return resolveWorldInfoForLanguage(state.worldData, state.currentLanguage);
  }

  // Static labels must be re-applied whenever the UI language changes, because
  // the editor itself is also localized.
  function syncStaticLabels() {
    if (!els.loadingEditorTitle) return;
    els.loadingEditorKickerLabel.textContent = getUiText(state, "edit_loading_screen");
    els.loadingEditorTitle.textContent = getUiText(state, "loading_editor_title");
    els.loadingEditorFieldKickerLabel.textContent = getUiText(state, "prompt_loading_kicker");
    els.loadingEditorFieldTitleLabel.textContent = getUiText(state, "prompt_loading_title");
    els.loadingEditorFieldPrepareLabel.textContent = getUiText(state, "prompt_loading_prepare_note");
    els.loadingEditorFieldReadyLabel.textContent = getUiText(state, "prompt_loading_ready_note");
    els.loadingEditorFieldFailTitleLabel.textContent = getUiText(state, "prompt_loading_fail_title");
    els.loadingEditorFieldFailSubtitleLabel.textContent = getUiText(state, "prompt_loading_fail_subtitle");
    els.loadingEditorFieldFailNoteLabel.textContent = getUiText(state, "prompt_loading_fail_note");
    els.loadingEditorFieldFlavorLabel.textContent = getUiText(state, "prompt_loading_flavor_lines");
    els.loadingEditorAddFlavorLineButton.textContent = getUiText(state, "loading_editor_add_line");
    els.loadingEditorPreviewButton.textContent = getUiText(state, "preview_loading_screen");
    els.loadingEditorSaveButton.textContent = getUiText(state, "loading_editor_save");
  }

  function appendFlavorLine(value = "", options = {}) {
    const row = document.createElement("div");
    row.className = "loading-editor-line-row";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "loading-editor-input loading-editor-line-input";
    input.value = value;
    row.appendChild(input);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "ghost-btn loading-editor-line-remove";
    removeButton.textContent = "×";
    removeButton.title = getUiText(state, "loading_editor_remove_line");
    removeButton.addEventListener("click", () => {
      row.remove();
      if (!els.loadingEditorFlavorLinesList.children.length) {
        appendFlavorLine("");
      }
    });
    row.appendChild(removeButton);

    els.loadingEditorFlavorLinesList.appendChild(row);

    if (options.focus) {
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    }
  }

  // The modal always keeps at least one line input visible so the list never
  // looks broken when a creator removes everything.
  function renderFlavorLines(lines = []) {
    els.loadingEditorFlavorLinesList.innerHTML = "";
    const normalized = Array.isArray(lines) ? lines.filter((entry) => String(entry || "").trim()) : [];
    if (!normalized.length) {
      appendFlavorLine("");
      return;
    }
    normalized.forEach((line) => appendFlavorLine(line));
  }

  function fillForm() {
    const localizedWorldInfo = getLocalizedWorldInfo();
    els.loadingEditorKickerInput.value = localizedWorldInfo.loadingKicker || "";
    els.loadingEditorTitleInput.value = localizedWorldInfo.loadingTitle || "";
    els.loadingEditorPrepareInput.value = localizedWorldInfo.loadingPrepareNote || "";
    els.loadingEditorReadyInput.value = localizedWorldInfo.loadingReadyNote || "";
    els.loadingEditorFailTitleInput.value = localizedWorldInfo.loadingFailureTitle || "";
    els.loadingEditorFailSubtitleInput.value = localizedWorldInfo.loadingFailSubtitle || "";
    els.loadingEditorFailNoteInput.value = localizedWorldInfo.loadingFailNote || "";
    renderFlavorLines(localizedWorldInfo.loadingFlavorLines);
  }

  function applyFormValues() {
    // Loading-screen text is stored in world info, so edits automatically
    // participate in the same language and export/import system as branding.
    const localizedWorldInfo = getLocalizedWorldInfo();

    setLocalizedValue(
      state.worldData,
      "loadingKicker",
      String(els.loadingEditorKickerInput.value || "").trim() || localizedWorldInfo.loadingKicker,
      state,
    );
    setLocalizedValue(
      state.worldData,
      "loadingTitle",
      String(els.loadingEditorTitleInput.value || "").trim() || localizedWorldInfo.loadingTitle,
      state,
    );
    setLocalizedValue(
      state.worldData,
      "loadingPrepareNote",
      String(els.loadingEditorPrepareInput.value || "").trim() || localizedWorldInfo.loadingPrepareNote,
      state,
    );
    setLocalizedValue(
      state.worldData,
      "loadingReadyNote",
      String(els.loadingEditorReadyInput.value || "").trim() || localizedWorldInfo.loadingReadyNote,
      state,
    );
    setLocalizedValue(
      state.worldData,
      "loadingFailureTitle",
      String(els.loadingEditorFailTitleInput.value || "").trim() || localizedWorldInfo.loadingFailureTitle,
      state,
    );
    setLocalizedValue(
      state.worldData,
      "loadingFailSubtitle",
      String(els.loadingEditorFailSubtitleInput.value || "").trim() || localizedWorldInfo.loadingFailSubtitle,
      state,
    );
    setLocalizedValue(
      state.worldData,
      "loadingFailNote",
      String(els.loadingEditorFailNoteInput.value || "").trim() || localizedWorldInfo.loadingFailNote,
      state,
    );
    setLocalizedValue(
      state.worldData,
      "loadingFlavorLines",
      collectFlavorLinesFromList(els.loadingEditorFlavorLinesList),
      state,
    );
  }

  function persistChanges() {
    applyFormValues();
    persistWorldInfo?.();

    if (els.panelSubtitle) els.panelSubtitle.textContent = getUiText(state, "loading_editor_updated_subtitle");
    if (els.panelText) els.panelText.textContent = getUiText(state, "loading_editor_updated_text");
  }

  // Opening the modal copies the current localized world info into the form.
  // Saving writes back into state.worldData and then into changes.json.
  function open() {
    if (!state.editMode) return;
    syncStaticLabels();
    fillForm();
    els.loadingEditorPanel.hidden = false;
  }

  function close() {
    els.loadingEditorPanel.hidden = true;
  }

  async function preview() {
    if (!state.editMode) return;
    persistChanges();
    await previewLoadingScreen?.();
  }

  function setup() {
    // The modal supports both pointer-first and keyboard-first flows to keep it
    // usable during heavy editing sessions.
    els.loadingEditorCloseButton.addEventListener("click", close);
    els.loadingEditorSaveButton.addEventListener("click", () => {
      persistChanges();
      close();
    });
    els.loadingEditorPreviewButton.addEventListener("click", async () => {
      await preview();
    });
    els.loadingEditorAddFlavorLineButton.addEventListener("click", () => {
      appendFlavorLine("", { focus: true });
    });
    els.loadingEditorPanel.addEventListener("click", (event) => {
      if (event.target === els.loadingEditorPanel) {
        close();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) {
        close();
      }
    });
  }

  return {
    setup,
    edit: open,
    open,
    close,
    preview,
  };
}
