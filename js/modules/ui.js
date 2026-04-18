import { normalizeTimelineOrderByDate } from "./timelineModel.js";
import {
  createTimelineAxisSvg,
  createTimelineEventItem,
  createTimelineFutureItem,
} from "./timelineView.js";
import { createArchiveController } from "./archive/archiveController.js";
import {
  createArchiveSidebarController,
  getArchiveShortLabel,
} from "./archive/archiveSidebar.js";
import { setupInlineEditingInteractions } from "./inlineEditing.js";
import { createHeroesController } from "./heroes/heroesController.js";
import { setupHeroInteractions } from "./heroes/heroesInteractions.js";
import { createEditorActionsController } from "./editorActions.js";
import { createDataQualityController } from "./dataQuality.js";
import { createGlobalSearchController } from "./globalSearch.js";
import { setupPanelImageInteractions } from "./panelImages.js";
import { createPanelDetailsController } from "./panelDetails.js";
import { createMapControlsController } from "./mapControls.js";
import { createMapTextToolbarController } from "./mapTextToolbar.js";
import { createPaletteController } from "./paletteControls.js";
import { createSidebarLegendController } from "./sidebarLegend.js";
import { createTimelineSidebarController } from "./timelineSidebar.js";
import { createTimelineActsController } from "./ui/timelineActsController.js";
import { syncTimelineTrackAlignment as syncTimelineAxisTrackAlignment } from "./timelineAxis.js";
import { createPlayerSidebarController } from "./players/playerSidebar.js";
import { getLocalizedText, setLocalizedValue } from "./localization.js";
import {
  normalizeActiveMapData,
  replaceActiveMapMarkers,
} from "./activeMapState.js";
import { getUiText } from "./uiLocale.js";

const MODE_STATE_KEYS = ["timelineMode", "archiveMode", "homebrewMode", "heroesMode", "activeMapMode"];
const BODY_MODE_CLASSES = ["timeline-mode", "archive-mode", "homebrew-mode", "heroes-mode", "active-map-mode"];

export function createUI(els, state) {
  // These setters are injected later by app.js so UI can coordinate feature
  // modules without hard-coding imports in every direction.
  let renderMapSidebarButtons = () => {};
  let renderBaseMapMarkers = () => {};
  let syncTopbar = () => {};
  let activeMapApi = {
    cancelDrawingRoute: () => {},
    focusMarker: () => null,
    render: () => {},
    renderButtons: () => {},
  };
  let changeRecorder = {
    upsert: () => {},
    remove: () => {},
  };
  let homebrewController = {
    render: () => {},
    focusArticle: () => {},
  };
  let mapEditorCallbacks = {
    onCreateRegionLabel: () => {},
    onToggleTextMoveMode: () => {},
    onToggleDrawMode: () => {},
    onTextStyleChange: () => {},
    onBrushChange: () => {},
    onMapViewModeChange: () => {},
  };
  const mapTextToolbar = createMapTextToolbarController({
    els,
    state,
    getCallbacks: () => mapEditorCallbacks,
  });
  const paletteController = createPaletteController(els, state);
  const sidebarLegend = createSidebarLegendController({
    els,
    state,
    getUiText: (key) => getUiText(state, key),
    onEditGroup: editLegendGroup,
  });
  const playerSidebar = createPlayerSidebarController({
    els,
    state,
    getChangeRecorder: () => changeRecorder,
    onNavigate: navigateToEntity,
    onPlayersChanged: () => renderHeroes(),
  });
  const timelineSidebar = createTimelineSidebarController({
    els,
    state,
    getChangeRecorder: () => changeRecorder,
    renderTimeline,
  });
  const timelineActs = createTimelineActsController({
    els,
    state,
    readFileToDataUrl,
    getChangeRecorder: () => changeRecorder,
    navigateToEntity,
    renderTimeline: () => renderTimeline(),
    renderTimelineSidebarButtons: () => timelineSidebar.renderButtons(),
    updatePanelFromTimelineEvent: (timelineEvent) => panelDetails.updateFromTimelineEvent(timelineEvent),
  });
  const archiveSidebar = createArchiveSidebarController(els, state, {
    onSelectGroup: playerSidebar.setPlayerTarget,
  });
  const archiveController = createArchiveController({
    els,
    state,
    setActiveSidebarGroup: archiveSidebar.setActiveGroup,
    onSelectItem: playerSidebar.setPlayerTarget,
  });
  const heroesController = createHeroesController({
    els,
    state,
    onNavigate: navigateToEntity,
    onSelectItem: playerSidebar.setPlayerTarget,
  });
  const searchController = createGlobalSearchController({
    els,
    state,
    onNavigate: navigateToEntity,
  });
  const dataQualityController = createDataQualityController({
    els,
    state,
    onNavigate: navigateToEntity,
  });
  const editorActions = createEditorActionsController({
    els,
    state,
    generateEntityId,
    getChangeRecorder: () => changeRecorder,
    getMapEditorCallbacks: () => mapEditorCallbacks,
    renderArchive,
    renderArchiveSidebarButtons: archiveSidebar.renderButtons,
    renderHeroes,
    renderTimeline,
    renderTimelineSidebarButtons: timelineSidebar.renderButtons,
    openDataQualityReport: dataQualityController.open,
  });
  const mapControls = createMapControlsController({
    els,
    state,
    getMapEditorCallbacks: () => mapEditorCallbacks,
    renderArchive,
  });
  const panelDetails = createPanelDetailsController({
    els,
    state,
    getChangeRecorder: () => changeRecorder,
    onSelectTarget: playerSidebar.setPlayerTarget,
    togglePanel,
    setMapEditorControlsVisible,
    refreshEditorActionButtons,
    rerenderMapMarkers: () => renderBaseMapMarkers(),
  });

  function remapHeroReferences(heroId, fromGroupId, toGroupId, recorder = changeRecorder) {
    // Group ids are part of a hero link identity, so moving a hero between
    // groups requires rewriting every place that points at that hero.
    const normalizedHeroId = String(heroId || "").trim();
    const normalizedFromGroupId = String(fromGroupId || "").trim();
    const normalizedToGroupId = String(toGroupId || "").trim();
    if (!normalizedHeroId || !normalizedFromGroupId || !normalizedToGroupId) return;

    playerSidebar.remapHeroReference(normalizedHeroId, normalizedFromGroupId, normalizedToGroupId);

    let playersChanged = false;
    state.playersData = (state.playersData || []).map((player) => {
      let changed = false;
      const nextCharacters = (player.characters || []).map((character) => {
        if (
          character?.id === normalizedHeroId
          && String(character.groupId || "") === normalizedFromGroupId
        ) {
          changed = true;
          return {
            ...character,
            groupId: normalizedToGroupId,
          };
        }
        return character;
      });

      if (!changed) return player;
      playersChanged = true;
      const nextPlayer = {
        ...player,
        characters: nextCharacters,
      };
      recorder.upsert?.("player", nextPlayer.id, nextPlayer);
      return nextPlayer;
    });

    (state.heroesData || []).forEach((group) => {
      (group.items || []).forEach((hero) => {
        if (!Array.isArray(hero.links) || !hero.links.length) return;

        let changed = false;
        hero.links = hero.links.map((link) => {
          if (
            link?.type === "heroItem"
            && link.id === normalizedHeroId
            && String(link.groupId || "") === normalizedFromGroupId
          ) {
            changed = true;
            return {
              ...link,
              groupId: normalizedToGroupId,
            };
          }
          return link;
        });

        if (changed) recorder.upsert?.("heroItem", hero.id, hero, { groupId: group.id });
      });
    });

    if (
      state.currentHeroId === normalizedHeroId
      && String(state.activeHeroGroupId || "") === normalizedFromGroupId
    ) {
      state.activeHeroGroupId = normalizedToGroupId;
    }

    if (playersChanged) playerSidebar.renderPlayers();
  }

  function remapArchiveItemReferences(itemId, fromGroupId, toGroupId, recorder = changeRecorder) {
    // Archive items can be referenced from heroes, players, and markers. When an
    // item changes group, we keep those cross-links coherent here.
    const normalizedItemId = String(itemId || "").trim();
    const normalizedFromGroupId = String(fromGroupId || "").trim();
    const normalizedToGroupId = String(toGroupId || "").trim();
    if (!normalizedItemId || !normalizedFromGroupId || !normalizedToGroupId) return;

    playerSidebar.remapArchiveItemReference(normalizedItemId, normalizedFromGroupId, normalizedToGroupId);

    (state.heroesData || []).forEach((group) => {
      (group.items || []).forEach((hero) => {
        if (!Array.isArray(hero.links) || !hero.links.length) return;

        let changed = false;
        hero.links = hero.links.map((link) => {
          if (
            link?.type === "archiveItem"
            && link.id === normalizedItemId
            && String(link.groupId || "") === normalizedFromGroupId
          ) {
            changed = true;
            return {
              ...link,
              groupId: normalizedToGroupId,
            };
          }
          return link;
        });

        if (changed) recorder.upsert?.("heroItem", hero.id, hero, { groupId: group.id });
      });
    });

    (state.markersData || []).forEach((marker) => {
      const linkedItemId = String(marker.archiveItemId || "").trim();
      const linkedGroupId = String(marker.archiveGroupId || "").trim();
      if (linkedItemId !== normalizedItemId || linkedGroupId !== normalizedFromGroupId) return;

      marker.archiveGroupId = normalizedToGroupId;
      recorder.upsert?.("marker", marker.id, marker);
    });

    if (
      state.currentArchiveItemId === normalizedItemId
      && String(state.activeArchiveGroupId || "") === normalizedFromGroupId
    ) {
      state.activeArchiveGroupId = normalizedToGroupId;
    }
  }
  function generateEntityId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function getSuggestedAssetPath(filename = "image") {
    const ext = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "png";
    const markerId = state.currentMarker?.id || "marker";
    return `assets/markers/${markerId}-${Date.now()}.${ext}`;
  }

  function setSidebarRenderers({ mapButtonsRenderer, mapMarkersRenderer }) {
    renderMapSidebarButtons = typeof mapButtonsRenderer === "function" ? mapButtonsRenderer : () => {};
    renderBaseMapMarkers = typeof mapMarkersRenderer === "function" ? mapMarkersRenderer : () => {};
  }

  function setActiveMapController(controller) {
    activeMapApi = {
      cancelDrawingRoute: typeof controller?.cancelDrawingRoute === "function" ? controller.cancelDrawingRoute : () => {},
      focusMarker: typeof controller?.focusMarker === "function" ? controller.focusMarker : () => null,
      render: typeof controller?.render === "function" ? controller.render : () => {},
      renderButtons: typeof controller?.renderButtons === "function" ? controller.renderButtons : () => {},
    };
  }

  function setupMapEditorCallbacks(callbacks) {
    mapEditorCallbacks = { ...mapEditorCallbacks, ...(callbacks || {}) };
  }

  function normalizeRecorder(recorder) {
    if (typeof recorder === "function") {
      return {
        upsert: recorder,
        remove: () => {},
      };
    }

    return {
      upsert: typeof recorder?.upsert === "function" ? recorder.upsert : () => {},
      remove: typeof recorder?.remove === "function" ? recorder.remove : () => {},
    };
  }

  function replaceActiveMarkers(nextMarkers) {
    state.activeMapData = replaceActiveMapMarkers(state.activeMapData, nextMarkers);
    activeMapApi.render();
  }

  function upsertActiveMarker(id, value) {
    const markers = [...normalizeActiveMapData(state.activeMapData).markers];
    const index = markers.findIndex((entry) => entry.id === id);
    if (index >= 0) markers[index] = value;
    else markers.push(value);
    replaceActiveMarkers(markers);
  }

  function removeActiveMarker(id) {
    const markers = normalizeActiveMapData(state.activeMapData).markers
      .filter((entry) => entry.id !== id);
    replaceActiveMarkers(markers);
  }

  function setChangeRecorder(recorder) {
    const normalizedRecorder = normalizeRecorder(recorder);

    changeRecorder = {
      upsert: (entity, id, value, extra) => {
        if (entity === "activeMarker") {
          upsertActiveMarker(id, value);
          return;
        }
        normalizedRecorder.upsert(entity, id, value, extra);
      },
      remove: (entity, id, extra) => {
        if (entity === "activeMarker") {
          removeActiveMarker(id);
          return;
        }
        normalizedRecorder.remove(entity, id, extra);
      },
    };
  }

  // Sidebar buttons are re-rendered often. Forcing a reflow here restarts the
  // fade animation so the transition still looks intentional after updates.
  function swapSidebarContent(renderer) {
    els.toolButtonsContainer.classList.remove("sidebar-fade");
    renderer();
    // Форсируем reflow, чтобы анимация fade на sidebar-кнопках корректно перезапускалась после перерендера.
    void els.toolButtonsContainer.offsetWidth;
    els.toolButtonsContainer.classList.add("sidebar-fade");
    sidebarLegend.render();
  }

  function setSidebarTitle(text) {
    els.sidebarTitle.textContent = text;
  }

  function editLegendGroup(groupId) {
    if (!state.editMode) return;
    const group = (state.groupsData || []).find((entry) => entry.id === groupId);
    if (!group) return;

    const currentName = getLocalizedText(group, "name", state, group.name || "Слой карты");
    const nextName = window.prompt("Название обозначения в легенде", currentName);
    if (nextName == null) return;

    const currentShort = getLocalizedText(group, "short", state, group.short || "?");
    const nextShort = window.prompt("Короткое обозначение на кнопке", currentShort);
    if (nextShort == null) return;

    setLocalizedValue(group, "name", nextName.trim() || currentName, state);
    setLocalizedValue(group, "short", nextShort.trim() || currentShort, state);
    changeRecorder.upsert("markerGroup", group.id, group);
    renderBaseMapMarkers();
    renderMapSidebarButtons();
    if (!els.sidebarLegendPanel.hidden) sidebarLegend.render();
  }

  function readFileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Не удалось прочитать файл изображения."));
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(file);
    });
  }

  function togglePalettePopover(force) {
    paletteController.togglePopover(force);
  }

  function setPalette(paletteName) {
    paletteController.setPalette(paletteName);
  }

  function togglePanel(force) {
    const shouldOpen = typeof force === "boolean" ? force : !els.content.classList.contains("panel-open");
    els.content.classList.toggle("panel-open", shouldOpen);
    els.panelHandle.textContent = shouldOpen ? "\u25c2" : "\u25b8";
  }

  function setModeWord(text, visible) {
    els.modeWord.textContent = text;
    els.modeWord.classList.toggle("show", visible);
  }

  function setTopModeButton(label) {
    els.timelineOpenButton.textContent = label;
  }

  function isTypingTarget(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest("#globalSearchPanel")) return false;
    if (target.closest("#dataQualityPanel")) return false;
    return Boolean(
      target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']")
      || target.matches("input, textarea, select, [contenteditable='true'], [contenteditable='']"),
    );
  }

  function refreshTopbarActionButtons() {
    // The same topbar shell is reused by multiple modes, so this function is
    // the single place that decides which controls are relevant right now.
    els.activeMapToggleButton.classList.toggle("active", Boolean(state.activeMapMode));
    if (els.homebrewOpenButton) {
      els.homebrewOpenButton.classList.toggle("active", Boolean(state.homebrewMode));
    }
    els.renameWorldButton.hidden = !state.editMode;
    playerSidebar.renderFavorites();
    playerSidebar.renderPlayers();
    els.mapReturnButton.hidden = true;
    const inHomebrew = Boolean(state.homebrewMode);
    if (els.mapViewEditorTools) els.mapViewEditorTools.hidden = !state.editMode || inHomebrew;
    els.uploadMapTextureButton.hidden = !state.editMode || state.timelineMode || state.archiveMode || state.homebrewMode || state.heroesMode || state.activeMapMode;
    els.exportDataButton.hidden = !state.editMode || state.homebrewMode || state.activeMapMode;
    els.importDataButton.hidden = !state.editMode || state.homebrewMode || state.activeMapMode;
    els.exportActiveMapButton.hidden = !state.editMode || state.homebrewMode || !state.activeMapMode;
    if (els.activeMapToggleButton) els.activeMapToggleButton.hidden = inHomebrew;
    mapControls.renderViewSwitcher();
    if (els.mapViewSwitcher && inHomebrew) els.mapViewSwitcher.hidden = true;
    syncTopbar();
  }

  function refreshEditorActionButtons() {
    // Editor actions are mode-specific. Instead of maintaining separate toolbars
    // per section, we reveal only the actions that make sense in the current mode.
    const editEnabled = state.editMode;
    const inTimeline = editEnabled && state.timelineMode;
    const inArchive = editEnabled && state.archiveMode;
    const inHeroes = editEnabled && state.heroesMode;
    const inActiveMap = editEnabled && state.activeMapMode;
    const inMap = editEnabled && !state.timelineMode && !state.archiveMode && !state.homebrewMode && !state.heroesMode && !state.activeMapMode;
    const shouldShowAny = inTimeline || inArchive || inHeroes || inMap || inActiveMap;

    els.editorActions.hidden = !shouldShowAny;
    els.addRegionLabelButton.hidden = !inMap;
    els.toggleTextMoveModeButton.hidden = true;
    els.toggleDrawModeButton.hidden = !inMap;
    els.editLoadingScreenButton.hidden = !editEnabled;
    els.previewLoadingScreenButton.hidden = !editEnabled;
    els.addTimelineEventButton.hidden = !inTimeline;
    els.addArchiveGroupButton.hidden = !inArchive;
    els.addArchiveItemButton.hidden = !inArchive;
    els.addHeroGroupButton.hidden = !inHeroes;
    els.addHeroCardButton.hidden = !inHeroes;
    els.addActiveMarkerButton.hidden = !inActiveMap;
    els.addActiveRouteButton.hidden = !inActiveMap;
    els.toggleActivePinsButton.hidden = !inActiveMap;
    els.addActiveMarkerButton.classList.toggle("active", inActiveMap && state.activeMapTool === "marker");
    els.addActiveRouteButton.classList.toggle("active", inActiveMap && state.activeMapTool === "route");
    els.toggleActivePinsButton.classList.toggle("active", inActiveMap && state.activeMapShowAllMarkers);
    els.validateDataButton.hidden = !editEnabled;
    refreshTopbarActionButtons();
  }

  function setExclusiveMode(activeKey = null) {
    MODE_STATE_KEYS.forEach((key) => {
      state[key] = key === activeKey;
    });
  }

  // Body classes power most view-level CSS changes. Keeping them centralized
  // avoids scattered class toggles across unrelated feature modules.
  function setBodyMode(activeClass = null) {
    BODY_MODE_CLASSES.forEach((className) => {
      document.body.classList.toggle(className, className === activeClass);
    });
  }

  function setMapEditorControlsVisible(visible, drawModeActive) {
    els.drawLayerPanel.hidden = !(visible && drawModeActive);
    els.toggleDrawModeButton.classList.toggle("active", Boolean(drawModeActive));
    els.toggleTextMoveModeButton.classList.remove("active");
  }

  function openMapTextToolbar(label, rect) {
    mapTextToolbar.open(label, rect);
  }

  function closeMapTextToolbar() {
    mapTextToolbar.close();
  }

  function setTopbarSync(syncFn) {
    syncTopbar = typeof syncFn === "function" ? syncFn : () => {};
  }

  function setHomebrewController(controller) {
    homebrewController = controller && typeof controller.render === "function"
      ? controller
      : { render: () => {}, focusArticle: () => {} };
  }

  function syncTimelineTrackAlignment() {
    syncTimelineAxisTrackAlignment(els.timelineContainer);
  }

  function updateTimelineCurrentSelection() {
    const cards = els.timelineContainer.querySelectorAll(".event-card");
    cards.forEach((card) => card.classList.toggle("current", card.dataset.eventId === state.currentTimelineEventId));
  }

  function highlightElement(element, className = "search-hit") {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    setTimeout(() => element.classList.remove(className), 1800);
  }

  function highlightOnNextFrame(resolveElement, options = {}) {
    requestAnimationFrame(() => {
      const element = resolveElement();
      if (options.scrollTarget) {
        options.scrollTarget(element)?.scrollIntoView?.(
          options.scrollOptions || { behavior: "smooth", block: "nearest" },
        );
      }
      options.beforeHighlight?.(element);
      highlightElement(element);
    });
  }

  function navigateToEntity(target) {
    // Navigation is intentionally entity-based, not view-based. Search, player
    // links, archive links, and homebrew all route through the same dispatcher.
    if (!target) return;
    playerSidebar.setPlayerTarget(target);

    if (target.type === "marker") {
      const marker = state.markersData.find((entry) => entry.id === target.id);
      openMapMode();
      if (marker) panelDetails.updateFromMarker(marker);
      highlightOnNextFrame(() => els.markersContainer.querySelector(`[data-marker-id="${target.id}"]`));
      return;
    }

    if (target.type === "activeMarker") {
      openActiveMapMode();
      highlightOnNextFrame(() => activeMapApi.focusMarker(target.id));
      return;
    }

    if (target.type === "timeline") {
      const timelineEvent = state.eventsData.find((entry) => entry.id === target.id);
      state.currentTimelineEventId = target.id;
      state.currentTimelineEvent = timelineEvent || null;
      state.currentTimelineActId = timelineEvent?.actId || "";
      openTimelineMode();
      if (timelineEvent) panelDetails.updateFromTimelineEvent(timelineEvent);
      highlightOnNextFrame(
        () => els.timelineContainer.querySelector(`[data-event-id="${target.id}"]`),
        {
          scrollTarget: (eventCard) => eventCard?.closest(".timeline-event-item") || eventCard,
          scrollOptions: { behavior: "smooth", inline: "center", block: "nearest" },
          beforeHighlight: () => updateTimelineCurrentSelection(),
        },
      );
      return;
    }

    if (target.type === "archiveGroup") {
      state.activeArchiveGroupId = target.id;
      state.currentArchiveItemId = null;
      openArchiveMode();
      highlightOnNextFrame(
        () => els.archiveGroupsContainer.querySelector(`[data-archive-group="${target.id}"]`),
        {
          scrollTarget: (section) => section,
          scrollOptions: { behavior: "smooth", block: "start" },
        },
      );
      return;
    }

    if (target.type === "archiveItem") {
      state.activeArchiveGroupId = target.groupId || state.activeArchiveGroupId;
      state.currentArchiveItemId = target.id;
      openArchiveMode();
      highlightOnNextFrame(() => {
        archiveController.focusItem(target.groupId, target.id);
        return els.archiveGroupsContainer.querySelector(`[data-card-id="${target.groupId}-${target.id}"]`);
      });
      return;
    }

    if (target.type === "heroGroup") {
      state.activeHeroGroupId = target.id;
      state.currentHeroId = null;
      openHeroesMode();
      highlightOnNextFrame(
        () => els.heroesGroupsContainer.querySelector(`[data-hero-group="${target.id}"]`),
        {
          scrollTarget: (section) => section,
          scrollOptions: { behavior: "smooth", block: "start" },
        },
      );
      return;
    }

    if (target.type === "heroItem") {
      state.activeHeroGroupId = target.groupId || state.activeHeroGroupId;
      state.currentHeroId = target.id;
      openHeroesMode();
      highlightOnNextFrame(() => {
        heroesController.focusItem(target.groupId, target.id);
        return els.heroesGroupsContainer.querySelector(`[data-group-id="${target.groupId}"][data-hero-id="${target.id}"]`);
      });
      return;
    }

    if (target.type === "homebrewArticle") {
      state.currentHomebrewArticleId = target.id;
      openHomebrewMode();
      homebrewController.focusArticle?.(target.id);
    }
  }

  function openTimelineMode() {
    setExclusiveMode("timelineMode");
    setModeWord(getUiText(state, "mode_timeline"), false);
    setTopModeButton(getUiText(state, "mode_map"));
    setBodyMode("timeline-mode");
    togglePanel(false);
    activeMapApi.cancelDrawingRoute();
    heroesController.collapseExpandedCards();
    closeMapTextToolbar();
    setMapEditorControlsVisible(false, false);
    setSidebarTitle(getUiText(state, "sidebar_events"));
    renderTimeline();
    swapSidebarContent(timelineSidebar.renderButtons);
    refreshEditorActionButtons();
    requestAnimationFrame(syncTimelineTrackAlignment);
    setTimeout(() => setModeWord(getUiText(state, "mode_timeline"), true), 120);
  }

  function renderArchive() {
    archiveController.render();
  }

  function openArchiveMode() {
    setExclusiveMode("archiveMode");
    setModeWord(getUiText(state, "mode_archive"), true);
    setTopModeButton(getUiText(state, "mode_map"));
    setBodyMode("archive-mode");
    togglePanel(false);
    activeMapApi.cancelDrawingRoute();
    closeMapTextToolbar();
    heroesController.collapseExpandedCards();
    setMapEditorControlsVisible(false, false);
    setSidebarTitle(getUiText(state, "sidebar_sections"));
    archiveController.collapseExpandedCards();
    renderArchive();
    swapSidebarContent(archiveSidebar.renderButtons);
    refreshEditorActionButtons();
  }

  function openMapMode() {
    setExclusiveMode(null);
    setModeWord(getUiText(state, "mode_map"), true);
    setTopModeButton(getUiText(state, "mode_timeline"));
    setBodyMode(null);
    togglePanel(false);
    activeMapApi.cancelDrawingRoute();
    setSidebarTitle(getUiText(state, "sidebar_layers"));
    archiveController.collapseExpandedCards();
    swapSidebarContent(renderMapSidebarButtons);
    renderBaseMapMarkers();
    activeMapApi.render();
    setMapEditorControlsVisible(state.editMode, state.drawMode);
    refreshEditorActionButtons();
  }

  function openHomebrewMode() {
    setExclusiveMode("homebrewMode");
    setModeWord(getUiText(state, "mode_homebrew"), true);
    setTopModeButton(getUiText(state, "mode_map"));
    setBodyMode("homebrew-mode");
    togglePanel(false);
    activeMapApi.cancelDrawingRoute();
    closeMapTextToolbar();
    archiveController.collapseExpandedCards();
    heroesController.collapseExpandedCards();
    setMapEditorControlsVisible(false, false);
    homebrewController.render();
    refreshEditorActionButtons();
  }

  function openHeroesMode() {
    setExclusiveMode("heroesMode");
    setModeWord(getUiText(state, "mode_heroes"), false);
    setBodyMode("heroes-mode");
    togglePanel(false);
    activeMapApi.cancelDrawingRoute();
    closeMapTextToolbar();
    archiveController.collapseExpandedCards();
    setMapEditorControlsVisible(false, false);
    renderHeroes();
    refreshEditorActionButtons();
  }

  function openActiveMapMode() {
    setExclusiveMode("activeMapMode");
    setModeWord(getUiText(state, "mode_active_map"), true);
    setTopModeButton(getUiText(state, "mode_timeline"));
    setBodyMode("active-map-mode");
    togglePanel(false);
    closeMapTextToolbar();
    archiveController.collapseExpandedCards();
    heroesController.collapseExpandedCards();
    setSidebarTitle(getUiText(state, "sidebar_active"));
    swapSidebarContent(activeMapApi.renderButtons);
    renderBaseMapMarkers();
    activeMapApi.render();
    setMapEditorControlsVisible(false, false);
    refreshEditorActionButtons();
  }

  function renderHeroes() {
    heroesController.render();
  }

  function handleEscape() {
    if (!els.dataQualityPanel.hidden) {
      dataQualityController.close();
      return true;
    }

    if (!els.globalSearchPanel.hidden) {
      searchController.close();
      return true;
    }

    if (!els.favoritesPanel.hidden || !els.notesPanel.hidden || !els.playersPanel.hidden) {
      playerSidebar.close();
      return true;
    }

    if (!els.sidebarLegendPanel.hidden) {
      sidebarLegend.close();
      return true;
    }

    if (!els.mapTextToolbar.hidden) {
      mapTextToolbar.close();
      return true;
    }

    if (state.archiveMode || state.timelineMode || state.homebrewMode || state.heroesMode || state.activeMapMode) {
      openMapMode();
      return true;
    }

    if (els.content.classList.contains("panel-open")) {
      togglePanel(false);
      return true;
    }

    return false;
  }

  function renderTimeline() {
    els.timelineContainer.innerHTML = "";
    els.timelineContainer.appendChild(createTimelineAxisSvg());
    normalizeTimelineOrderByDate(state.eventsData);
    timelineActs.renderTimelineActTabs();
    timelineActs.getVisibleTimelineEvents().forEach((event) => {
      els.timelineContainer.appendChild(createTimelineEventItem(event, {
        editMode: state.editMode,
        localizationContext: state,
        actsData: state.timelineActsData,
        onToggleShortcut: timelineSidebar.toggleShortcut,
        onTogglePosition: editorActions.toggleTimelineEventPosition,
        onDelete: editorActions.deleteTimelineEvent,
        onActivateMarkerLink: timelineActs.handleTimelineMarkerLink,
        onAssignAct: editorActions.assignTimelineEventAct,
      }));
    });

    els.timelineContainer.appendChild(createTimelineFutureItem(getUiText(state, "timeline_future")));
    updateTimelineCurrentSelection();
    requestAnimationFrame(syncTimelineTrackAlignment);
  }

  function rerenderCurrentMode() {
    renderBaseMapMarkers();
    activeMapApi.render();

    if (state.timelineMode) {
      setModeWord(getUiText(state, "mode_timeline"), true);
      setTopModeButton(getUiText(state, "mode_map"));
      renderTimeline();
      setSidebarTitle(getUiText(state, "sidebar_events"));
      swapSidebarContent(timelineSidebar.renderButtons);
    } else if (state.archiveMode) {
      setModeWord(getUiText(state, "mode_archive"), true);
      setTopModeButton(getUiText(state, "mode_map"));
      renderArchive();
      setSidebarTitle(getUiText(state, "sidebar_sections"));
      swapSidebarContent(archiveSidebar.renderButtons);
    } else if (state.homebrewMode) {
      setModeWord(getUiText(state, "mode_homebrew"), true);
      setTopModeButton(getUiText(state, "mode_map"));
      homebrewController.render();
    } else if (state.heroesMode) {
      setModeWord(getUiText(state, "mode_heroes"), true);
      renderHeroes();
    } else if (state.activeMapMode) {
      setModeWord(getUiText(state, "mode_active_map"), true);
      setTopModeButton(getUiText(state, "mode_timeline"));
      setSidebarTitle(getUiText(state, "sidebar_active"));
      swapSidebarContent(activeMapApi.renderButtons);
    } else {
      setModeWord(getUiText(state, "mode_map"), true);
      setTopModeButton(getUiText(state, "mode_timeline"));
      setSidebarTitle(getUiText(state, "sidebar_layers"));
      swapSidebarContent(renderMapSidebarButtons);
    }

    refreshTopbarActionButtons();
  }

  mapControls.setupViewSwitcher();
  mapControls.setDisplayMode(state.mapViewMode || "author", { rerenderArchive: false });
  setupPanelImageInteractions({
    els,
    state,
    readFileToDataUrl,
    getSuggestedAssetPath,
    getChangeRecorder: () => changeRecorder,
  });
  mapTextToolbar.setup();
  mapControls.setupDrawBrushPalette();
  paletteController.setup();
  sidebarLegend.setup();
  searchController.setup();
  dataQualityController.setup();
  playerSidebar.setup();
  timelineActs.setup();
  const timelineToolbarActions = els.timelineActsBar?.parentElement;
  if (timelineToolbarActions && els.editTimelineActButton && els.editTimelineActButton.parentElement !== timelineToolbarActions) {
    timelineToolbarActions.appendChild(els.editTimelineActButton);
  }
  if (timelineToolbarActions && els.deleteTimelineActButton && els.deleteTimelineActButton.parentElement !== timelineToolbarActions) {
    timelineToolbarActions.appendChild(els.deleteTimelineActButton);
  }
  editorActions.setupButtons();
  setupInlineEditingInteractions({
    els,
    state,
    readFileToDataUrl,
    getChangeRecorder: () => changeRecorder,
    getArchiveShortLabel,
    renderTimeline,
    renderArchive,
    remapArchiveItemReferences,
    renderTimelineSidebarButtons: timelineSidebar.renderButtons,
    syncTimelineTrackAlignment,
  });
  setupHeroInteractions({
    els,
    state,
    readFileToDataUrl,
    getChangeRecorder: () => changeRecorder,
    remapHeroReferences,
    renderHeroes,
  });
  els.timelineContainer.addEventListener("click", (event) => {
    const item = event.target.closest(".timeline-event-item");
    const eventId = item?.dataset?.eventId || event.target.closest(".event-card")?.dataset?.eventId;
    if (!eventId) return;
    const timelineEvent = state.eventsData.find((entry) => entry.id === eventId);
    if (!timelineEvent) return;
    state.currentTimelineEventId = eventId;
    state.currentTimelineEvent = timelineEvent;
    playerSidebar.setPlayerTarget({ type: "timeline", id: eventId });
    updateTimelineCurrentSelection();
    panelDetails.updateFromTimelineEvent(timelineEvent);
  });
  window.addEventListener("resize", () => {
    if (state.timelineMode) requestAnimationFrame(syncTimelineTrackAlignment);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (isTypingTarget(event.target)) return;
    if (handleEscape()) event.preventDefault();
  });

  return {
    setActiveMapController,
    setHomebrewController,
    setSidebarRenderers,
    setupMapEditorCallbacks,
    setChangeRecorder,
    setPalette,
    togglePalettePopover,
    toggleSidebarLegend: sidebarLegend.toggle,
    closeSidebarLegend: sidebarLegend.close,
    setTopbarSync,
    togglePanel,
    setModeWord,
    refreshEditorActionButtons,
    refreshTopbarActionButtons,
    renderMapViewSwitcher: mapControls.renderViewSwitcher,
    setMapDisplayMode: mapControls.setDisplayMode,
    openTimelineMode,
    openArchiveMode,
    openHomebrewMode,
    openMapMode,
    openHeroesMode,
    openActiveMapMode,
    handleEscape,
    openMapTextToolbar,
    closeMapTextToolbar,
    setMapEditorControlsVisible,
    updatePanelFromMarker: panelDetails.updateFromMarker,
    updatePanelFromActiveMarker: (marker) => panelDetails.updateFromMarker(marker, { entity: "activeMarker" }),
    updatePanelFromTimelineEvent: panelDetails.updateFromTimelineEvent,
    setPanelEditable: panelDetails.setEditable,
    savePanelToCurrentMarker: panelDetails.saveCurrentMarker,
    renderTimeline,
    renderArchive,
    renderHomebrew: () => homebrewController.render(),
    renderHeroes,
    renderActiveMap: () => activeMapApi.render(),
    rerenderCurrentMode,
    remapArchiveItemReferences,
    remapHeroReferences,
  };
}
