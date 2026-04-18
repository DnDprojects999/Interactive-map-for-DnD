import {
  addLanguageToWorld,
  getLanguageLabel,
  getLanguages,
  getUserFacingLanguages,
  normalizeLanguageCode,
  resolveLanguage,
  setLanguageVisibility,
  shouldShowLanguageSwitcher,
} from "../localization.js";
import { getUiText } from "../uiLocale.js";

export function createLanguageSwitcherController({
  els,
  state,
  persistCurrentLanguage,
  syncLocalizedUi,
  persistWorldInfo,
  removeLanguageLayer,
}) {
  // The main language switcher is shared by players and editors, so the
  // controller decides visibility, labels, and edit-only tools in one place.
  function setOpen(isOpen) {
    if (isOpen) {
      els.languagePopover.removeAttribute("hidden");
      position();
      window.requestAnimationFrame(position);
    } else {
      els.languagePopover.setAttribute("hidden", "");
    }
    els.languageToggleButton.setAttribute("aria-expanded", String(isOpen));
  }

  function isOpen() {
    return !els.languagePopover.hasAttribute("hidden");
  }

  function close() {
    setOpen(false);
  }

  function position() {
    // The popover is positioned in viewport coordinates so it stays attached to
    // the toggle even when the page layout changes.
    if (els.languagePopover.hasAttribute("hidden")) return;

    const rect = els.languageToggleButton.getBoundingClientRect();
    const viewportPadding = 12;
    const popoverWidth = Math.max(220, els.languagePopover.offsetWidth || 220);
    const centeredLeft = rect.left + (rect.width / 2) - (popoverWidth / 2);
    const clampedLeft = Math.min(
      Math.max(centeredLeft, viewportPadding),
      Math.max(viewportPadding, window.innerWidth - popoverWidth - viewportPadding),
    );

    els.languagePopover.style.position = "fixed";
    els.languagePopover.style.top = `${rect.bottom + 10}px`;
    els.languagePopover.style.left = `${clampedLeft}px`;
    els.languagePopover.style.right = "auto";
    els.languagePopover.style.transform = "none";
  }

  function render() {
    // Editors see every configured language. Players only see languages that
    // are marked as user-facing in world settings.
    const languages = getLanguages(state.worldData);
    const userLanguages = getUserFacingLanguages(state.worldData);
    let nextLanguage = resolveLanguage(state.worldData, state.currentLanguage || state.worldData.defaultLanguage);
    if (!state.editMode && userLanguages.length && !userLanguages.some((language) => language.code === nextLanguage)) {
      nextLanguage = userLanguages[0].code;
    }

    state.currentLanguage = nextLanguage;
    const visibleForUsers = shouldShowLanguageSwitcher(state.worldData, false);
    const visible = visibleForUsers || state.editMode;
    const deleteAllowed = state.currentLanguage !== state.worldData.defaultLanguage;
    const renderedLanguages = state.editMode ? languages : (userLanguages.length ? userLanguages : languages);

    els.languageSwitcher.hidden = !visible;
    els.languageEditorActions.hidden = !state.editMode;
    els.addLanguageButton.hidden = !state.editMode;
    els.deleteLanguageButton.hidden = !state.editMode || !deleteAllowed;
    els.languageToggleLabel.textContent = state.currentLanguage.toUpperCase();
    els.languageOptions.innerHTML = "";

    if (els.toggleLanguageVisibilityButton) {
      els.toggleLanguageVisibilityButton.hidden = true;
      els.toggleLanguageVisibilityButton.style.display = "none";
    }

    if (!visible) {
      close();
      return;
    }

    renderedLanguages.forEach((language) => {
      const row = document.createElement("div");
      row.className = `language-option-row ${language.visible === false ? "is-hidden" : ""}`.trim();

      const button = document.createElement("button");
      button.className = `language-option ${language.code === state.currentLanguage ? "active" : ""}`;
      button.type = "button";
      button.dataset.languageCode = language.code;

      const label = document.createElement("span");
      label.textContent = language.visible === false
        ? `${language.label} (${getUiText(state, "language_hidden")})`
        : language.label;
      const code = document.createElement("span");
      code.className = "language-option-code";
      code.textContent = language.code;
      button.append(label, code);
      row.appendChild(button);

      if (state.editMode) {
        const visibilityButton = document.createElement("button");
        visibilityButton.className = "language-option-visibility";
        visibilityButton.type = "button";
        visibilityButton.dataset.languageVisibilityCode = language.code;
        visibilityButton.textContent = language.visible === false
          ? getUiText(state, "show_language")
          : getUiText(state, "hide_language");
        row.appendChild(visibilityButton);
      }

      els.languageOptions.appendChild(row);
    });

    els.addLanguageButton.textContent = getUiText(state, "add_language");
    els.deleteLanguageButton.textContent = getUiText(state, "delete_language");

    if (isOpen()) {
      window.requestAnimationFrame(position);
    }
  }

  function setup() {
    // Pointer/click handlers are split carefully here so the popover can be
    // toggled without immediately closing from the document click listener.
    els.languageToggleButton.addEventListener("pointerdown", (event) => {
      if (els.languageSwitcher.hidden) return;
      event.stopPropagation();
    });

    els.languageToggleButton.addEventListener("click", (event) => {
      if (els.languageSwitcher.hidden) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(!isOpen());
    });

    els.languagePopover.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });

    els.languagePopover.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    els.languageOptions.addEventListener("click", (event) => {
      const visibilityButton = event.target.closest("[data-language-visibility-code]");
      if (visibilityButton) {
        if (!state.editMode) return;

        const code = normalizeLanguageCode(visibilityButton.dataset.languageVisibilityCode);
        const languages = getLanguages(state.worldData);
        const targetEntry = languages.find((entry) => entry.code === code);
        if (!targetEntry) return;

        const currentlyVisible = targetEntry.visible !== false;
        const visibleLanguages = languages.filter((entry) => entry.visible !== false);
        if (currentlyVisible && visibleLanguages.length <= 1) {
          window.alert(getUiText(state, "alert_keep_one_language_visible"));
          return;
        }

        if (!setLanguageVisibility(state.worldData, code, !currentlyVisible)) return;
        persistWorldInfo();
        return;
      }

      const button = event.target.closest("[data-language-code]");
      if (!button) return;
      state.currentLanguage = resolveLanguage(state.worldData, button.dataset.languageCode);
      persistCurrentLanguage(state.currentLanguage);
      close();
      syncLocalizedUi();
    });

    els.addLanguageButton.addEventListener("click", () => {
      if (!state.editMode) return;
      const codeRaw = window.prompt(getUiText(state, "prompt_language_code"), "");
      if (!codeRaw) return;

      const code = addLanguageToWorld(state.worldData, codeRaw);
      const currentLabel = getLanguageLabel(state.worldData, code);
      const nextLabel = window.prompt(getUiText(state, "prompt_language_name"), currentLabel);
      state.worldData.languages = getLanguages(state.worldData).map((entry) =>
        entry.code === code
          ? { ...entry, label: String(nextLabel || "").trim() || currentLabel }
          : entry,
      );
      state.worldData.languagesEnabled = true;
      state.currentLanguage = code;
      persistWorldInfo();
    });

    els.deleteLanguageButton.addEventListener("click", () => {
      if (!state.editMode) return;
      removeLanguageLayer(state.currentLanguage);
    });

    document.addEventListener("click", (event) => {
      if (!els.languageSwitcher.contains(event.target)) {
        close();
      }
    });

    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
  }

  return {
    render,
    setup,
    close,
    position,
    isOpen,
    setOpen,
  };
}
