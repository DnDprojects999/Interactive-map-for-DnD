import {
  getMapViews,
  normalizeMapViews,
  resolveMapViewMode,
} from "../mapViews.js";
import { getUiText } from "../uiLocale.js";

export function createMapViewAdminController({
  els,
  state,
  persistWorldInfo,
  rerenderMapDisplay,
}) {
  // Map-view settings are world-level config, but they also affect active UI
  // controls immediately, so this controller bridges config and live rendering.
  function getViews() {
    return getMapViews(state.worldData).map((entry) => ({ ...entry }));
  }

  function syncButtons() {
    if (!els?.toggleMapViewSwitcherButton || !els?.editMapViewsButton || !els?.deleteMapViewModeButton) return;

    if (els.mapViewEditorTools && els.deleteMapViewModeButton.parentElement !== els.mapViewEditorTools) {
      els.mapViewEditorTools.appendChild(els.deleteMapViewModeButton);
    }

    const visibleForUsers = state.worldData?.mapViewSwitcherVisible !== false;
    els.toggleMapViewSwitcherButton.textContent = visibleForUsers
      ? getUiText(state, "map_views_hide_for_users")
      : getUiText(state, "map_views_show_for_users");
    els.editMapViewsButton.textContent = getUiText(state, "map_views_manage");
    els.deleteMapViewModeButton.textContent = getUiText(state, "map_views_delete");
    els.deleteMapViewModeButton.hidden = !state.editMode;

    if (els.mapViewEditorTools) {
      els.mapViewEditorTools.hidden = !state.editMode;
    }
  }

  // Hiding the switcher only affects player-facing visibility; the editor can
  // still manage the configured modes through the admin menu.
  function toggleVisibility() {
    state.worldData.mapViewSwitcherVisible = state.worldData?.mapViewSwitcherVisible === false;
    persistWorldInfo();
  }

  function persistViews(nextViews, preferredMode = state.mapViewMode) {
    state.worldData.mapViews = normalizeMapViews(nextViews);
    state.mapViewMode = resolveMapViewMode(state.worldData, preferredMode);
    persistWorldInfo();
    rerenderMapDisplay(state.mapViewMode);
  }

  // Editing is still prompt-based here because map-view records are tiny:
  // label, id, texture key, and visibility.
  function editViews() {
    if (!state.editMode) return;

    const views = getViews();
    const menu = [
      getUiText(state, "map_views_pick_edit"),
      ...views.map((view, index) => `${index + 1}. ${view.label} [id: ${view.id}, texture: ${view.textureKey}]`),
      `${views.length + 1}. ${getUiText(state, "map_views_add_option")}`,
    ].join("\n");

    const selectedRaw = window.prompt(menu, "1");
    if (selectedRaw == null) return;

    const selectedIndex = Number(selectedRaw) - 1;
    const nextViews = views.map((entry) => ({ ...entry }));
    const selectedView = nextViews[selectedIndex] || null;
    const isNew = selectedIndex === views.length;
    if (!selectedView && !isNew) return;

    const currentId = selectedView?.id || "";
    const nextId = window.prompt(getUiText(state, "map_views_prompt_id"), currentId || "satellite");
    if (nextId == null) return;

    const currentLabel = selectedView?.label || "";
    const nextLabel = window.prompt(getUiText(state, "map_views_prompt_label"), currentLabel || "Satellite");
    if (nextLabel == null) return;

    const currentTextureKey = selectedView?.textureKey || "";
    const nextTextureKey = window.prompt(
      getUiText(state, "map_views_prompt_texture"),
      currentTextureKey || nextId || "satellite",
    );
    if (nextTextureKey == null) return;

    const currentVisibleAnswer = selectedView?.userVisible === false ? "n" : "y";
    const nextVisibleAnswer = window.prompt(getUiText(state, "map_views_prompt_visible"), currentVisibleAnswer);
    if (nextVisibleAnswer == null) return;

    const draft = {
      id: nextId,
      label: String(nextLabel).trim(),
      textureKey: String(nextTextureKey).trim(),
      userVisible: !/^n/i.test(String(nextVisibleAnswer).trim()),
      translations: selectedView?.translations || {},
    };

    if (isNew) nextViews.push(draft);
    else nextViews[selectedIndex] = draft;

    const preferredMode = isNew
      ? draft.id
      : (state.mapViewMode === currentId ? draft.id : state.mapViewMode);

    persistViews(nextViews, preferredMode || draft.id);
  }

  function deleteView() {
    // The project always needs at least one map mode to render against.
    if (!state.editMode) return;

    const views = getViews();
    if (views.length <= 1) {
      window.alert(getUiText(state, "map_views_keep_one"));
      return;
    }

    const currentIndex = Math.max(0, views.findIndex((entry) => entry.id === state.mapViewMode));
    const menu = [
      getUiText(state, "map_views_pick_delete"),
      ...views.map((view, index) => `${index + 1}. ${view.label} [id: ${view.id}]`),
    ].join("\n");
    const selectedRaw = window.prompt(menu, String(currentIndex + 1));
    if (selectedRaw == null) return;

    const selected = views[Number(selectedRaw) - 1];
    if (!selected) return;

    if (!window.confirm(getUiText(state, "map_views_confirm_delete", { label: selected.label || selected.id }))) {
      return;
    }

    const nextViews = views.filter((entry) => entry.id !== selected.id);
    const nextPreferredMode = state.mapViewMode === selected.id
      ? nextViews[0]?.id
      : state.mapViewMode;

    persistViews(nextViews, nextPreferredMode);
  }

  return {
    syncButtons,
    toggleVisibility,
    editViews,
    deleteView,
  };
}
