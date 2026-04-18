import { clamp } from "./state.js";
import { getLocalizedText } from "./localization.js";
import { createMapTextureController } from "./editor/mapTextureController.js";
import {
  resolveFactionMarkerSymbolLabel,
  resolveFactionMarkerSymbolUrl,
} from "./factionSymbols.js";
import {
  normalizeActiveMapData,
  patchActiveMapData,
} from "./activeMapState.js";

// Main map editor coordinator: marker layers, region labels, draw layers,
// Active Map pinning, and edit-mode access rules all meet here.
export function createEditorModule(els, state, ui, mapModule, changesManager) {
  const EDITOR_ACCESS_STORAGE_KEY = "serkonia:editor-access";

  if (!state.mapTextureByType || typeof state.mapTextureByType !== "object") {
    state.mapTextureByType = {};
  }

  function hasEditorAccess() {
    // Localhost is always trusted for convenience; deployed builds need either
    // ?editor=1 or an already granted localStorage flag.
    try {
      const hostname = window.location.hostname;
      const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
      if (isLocalHost) return true;

      const searchParams = new URLSearchParams(window.location.search);
      const accessGrantedByQuery = searchParams.get("editor") === "1";
      if (accessGrantedByQuery) {
        window.localStorage?.setItem(EDITOR_ACCESS_STORAGE_KEY, "granted");
      }
      return accessGrantedByQuery || window.localStorage?.getItem(EDITOR_ACCESS_STORAGE_KEY) === "granted";
    } catch (error) {
      return false;
    }
  }

  function readFileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Не удалось прочитать файл текстуры карты."));
      reader.readAsDataURL(file);
    });
  }

  const mapTextureController = createMapTextureController({
    els,
    state,
    changesManager,
    readFileToDataUrl,
  });
  function updateMapTextureButtonLabel() {
    mapTextureController.updateMapTextureButtonLabel();
  }

  function applyTextureForCurrentMapMode() {
    mapTextureController.applyTextureForCurrentMapMode();
  }

  async function handleMapTextureSelection(file) {
    await mapTextureController.handleMapTextureSelection(file);
  }

  function updateMapTextureButtonLabelOverride() {
    mapTextureController.updateMapTextureButtonLabel();
  }

  async function handleMapTextureSelectionOverride(file) {
    await mapTextureController.handleMapTextureSelection(file);
  }

  /**
   * В обычном режиме кнопки слева управляют видимостью слоёв карты.
   * В edit-mode те же кнопки выбирают группу или слой рисования для редактирования.
   */
  function refreshGroupButtonsSelection() {
    const buttons = els.toolButtonsContainer.querySelectorAll(".tool-btn");
    buttons.forEach((button) => {
      button.classList.toggle("editor-target", state.editMode && button.dataset.group === state.editorGroupId);
    });
  }

  function refreshDrawLayerButtonsSelection() {
    const buttons = els.toolButtonsContainer.querySelectorAll(".tool-btn[data-draw-layer-id]");
    buttons.forEach((button) => {
      button.classList.toggle("editor-target", state.editMode && button.dataset.drawLayerId === state.activeDrawLayerId);
    });
  }

  function getPinnedActiveMarkerIds() {
    return new Set(normalizeActiveMapData(state.activeMapData).pinnedMarkerIds);
  }

  function updateActiveMapData(patch) {
    // Active map state is patched through one helper so timestamp/meta updates
    // stay consistent with other active-map mutations.
    state.activeMapData = patchActiveMapData(state.activeMapData, patch);
  }

  function setPanelFacts(fact1 = "", fact2 = "", fact3 = "") {
    els.fact1.textContent = fact1;
    els.fact2.textContent = fact2;
    els.fact3.textContent = fact3;
  }

  function showEditorStatus(subtitle, text, facts = []) {
    els.panelSubtitle.textContent = subtitle;
    els.panelText.textContent = text;
    setPanelFacts(facts[0] || "", facts[1] || "", facts[2] || "");
  }

  function rerenderCurrentMode() {
    // Editor changes can affect multiple fullscreen modes, so this helper
    // refreshes only the one currently visible to the user.
    renderMarkers();
    if (state.timelineMode) ui.renderTimeline();
    if (state.archiveMode) ui.renderArchive();
    if (state.heroesMode) ui.renderHeroes();
    if (state.activeMapMode) ui.renderActiveMap();
  }

  function createDefaultMarker(x, y) {
    return {
      id: "marker-" + Date.now(),
      group: state.editorGroupId || state.groupsData[0]?.id || "cities",
      title: "Новая метка",
      type: "Новый тип",
      x,
      y,
      imageUrl: "",
      imageText: "Добавь подпись для иллюстрации в панели справа.",
      description: "Добавь описание в правой панели.",
      facts: ["Факт 1", "Факт 2", "Факт 3"],
    };
  }

  function togglePinnedMarker(marker) {
    const pinnedMarkers = getPinnedActiveMarkerIds();
    const nextPinned = !pinnedMarkers.has(marker.id);
    const nextPinnedList = nextPinned
      ? Array.from(new Set([...pinnedMarkers, marker.id]))
      : normalizeActiveMapData(state.activeMapData).pinnedMarkerIds.filter((entry) => entry !== marker.id);

    updateActiveMapData({ pinnedMarkerIds: nextPinnedList });
    renderMarkers();
    ui.renderActiveMap();
    showEditorStatus(
      nextPinned
        ? "Метка закреплена на Active Map"
        : "Метка убрана с Active Map",
      "Alt + клик по обычной метке закрепляет её на Active Map или убирает обратно.",
    );
  }

  function removeActiveMarkerFromState(markerId) {
    const activeMapData = normalizeActiveMapData(state.activeMapData);
    updateActiveMapData({
      markers: activeMapData.markers.filter((marker) => marker.id !== markerId),
      pinnedMarkerIds: activeMapData.pinnedMarkerIds.filter((entry) => entry !== markerId),
    });
  }

  function renderGroups() {
    els.toolButtonsContainer.innerHTML = "";

    state.groupsData.forEach((group) => {
      const localizedName = getLocalizedText(group, "name", state, group.name || "Слой карты");
      const localizedShort = getLocalizedText(group, "short", state, group.short || "?");
      const button = document.createElement("button");
      button.className = `tool-btn ${group.enabled ? "active" : ""}`;
      button.dataset.group = group.id;
      button.dataset.groupId = group.id;
      button.dataset.label = localizedName;
      button.dataset.badge = localizedShort;
      button.dataset.color = group.color || "";
      if (group.color) button.style.setProperty("--tool-accent", group.color);
      button.textContent = localizedShort;
      button.title = localizedName || "Слой карты";
      button.title = group.name || "Слой карты";

      button.title = localizedName || "Слой карты";
      button.dataset.label = localizedName || "Слой карты";
      button.dataset.badge = localizedShort || "?";
      button.title = localizedName || "Слой карты";
      button.addEventListener("click", () => {
        if (state.editMode) {
          state.editorGroupId = group.id;
          refreshGroupButtonsSelection();
          els.panelSubtitle.textContent = "Режим редактирования · выбран слой: " + group.name;
          els.panelSubtitle.textContent = "Выбран слой: " + localizedName;
          els.panelSubtitle.textContent = "Выбран слой: " + (localizedName || "Слой карты");
          return;
        }

        group.enabled = !group.enabled;
        button.classList.toggle("active", group.enabled);

        const relatedMarkers = els.markersContainer.querySelectorAll(`[data-group="${group.id}"]`);
        relatedMarkers.forEach((markerEl) => markerEl.classList.toggle("hidden", !group.enabled));
      });

      els.toolButtonsContainer.appendChild(button);
    });

    const labelsButton = document.createElement("button");
    labelsButton.className = `tool-btn ${state.regionLabelsVisible ? "active" : ""}`;
    labelsButton.style.setProperty("--tool-accent", "rgba(226,232,240,.42)");
    labelsButton.dataset.badge = "Т";
    labelsButton.dataset.label = "Подписи территорий";
    labelsButton.dataset.label = "Подписи территорий";
    labelsButton.title = state.editMode ? "Режим редактирования подписей территорий" : "Показать или скрыть подписи территорий";
    labelsButton.textContent = "Т";
    labelsButton.dataset.badge = "Т";
    labelsButton.dataset.label = "Подписи территорий";
    labelsButton.title = state.editMode ? "Редактирование подписей территорий" : "Показать или скрыть подписи территорий";
    labelsButton.textContent = "Т";
    labelsButton.addEventListener("click", () => {
      if (state.editMode) {
        state.regionTextMode = !state.regionTextMode;
        if (!state.regionTextMode) state.regionTextMoveMode = false;
        labelsButton.classList.toggle("active", state.regionTextMode);
        els.panelSubtitle.textContent = state.regionTextMode
          ? "Редактирование подписей территорий"
          : "Режим редактирования включён";
        renderRegionLabels();
        return;
      }
      state.regionLabelsVisible = !state.regionLabelsVisible;
      labelsButton.classList.toggle("active", state.regionLabelsVisible);
      renderRegionLabels();
    });
    els.toolButtonsContainer.appendChild(labelsButton);

    state.drawLayersData.forEach((layer, index) => {
      const layerButton = document.createElement("button");
      layerButton.className = `tool-btn ${layer.visible !== false ? "active" : ""}`;
      layerButton.dataset.drawLayerId = layer.id;
      layerButton.dataset.badge = "●";
      layerButton.dataset.label = layer.name || ("Слой " + (index + 1));
      layerButton.title = layer.name || ("Слой " + (index + 1));
      layerButton.textContent = "\u25cf";
      layerButton.dataset.badge = "●";
      layerButton.dataset.label = layer.name || ("Слой " + (index + 1));
      layerButton.title = layer.name || ("Слой " + (index + 1));
      layerButton.addEventListener("click", () => {
        if (state.editMode) {
          state.activeDrawLayerId = layer.id;
          state.drawMode = true;
          ui.setMapEditorControlsVisible(true, true);
          els.panelSubtitle.textContent = "Выбран слой рисования: " + (layer.name || ("Слой " + (index + 1)));
          els.panelSubtitle.textContent = "Выбран слой рисования: " + (layer.name || ("Слой " + (index + 1)));
          return;
        }
        layer.visible = layer.visible === false;
        renderDrawLayers();
        renderGroups();
      });
      els.toolButtonsContainer.appendChild(layerButton);
    });

    if (state.editMode) {
      const addLayerButton = document.createElement("button");
      addLayerButton.className = "tool-btn";
      addLayerButton.dataset.badge = "+";
      addLayerButton.dataset.label = "Новый слой рисования";
      addLayerButton.title = "Новый слой рисования";
      addLayerButton.textContent = "+";
      addLayerButton.dataset.label = "Новый слой рисования";
      addLayerButton.title = "Новый слой рисования";
      addLayerButton.addEventListener("click", () => {
        createDrawLayer();
        renderGroups();
      });
      els.toolButtonsContainer.appendChild(addLayerButton);
    }

    refreshGroupButtonsSelection();
    refreshDrawLayerButtonsSelection();
  }

  function createMarkerElement(marker, groupsById) {
    const markerEl = document.createElement("button");
    markerEl.className = "marker";
    markerEl.dataset.group = marker.group;
    if (marker.id) markerEl.dataset.markerId = marker.id;
    markerEl.style.left = `${marker.x}%`;
    markerEl.style.top = `${marker.y}%`;

    const group = groupsById.get(marker.group);
    if (group?.color) markerEl.style.background = group.color;
    const symbolUrl = resolveFactionMarkerSymbolUrl(state.archiveData, marker);
    if (symbolUrl) {
      markerEl.classList.add("marker-symbolic");
      const symbol = document.createElement("img");
      symbol.className = "marker-symbol-image";
      symbol.src = symbolUrl;
      symbol.alt = resolveFactionMarkerSymbolLabel(state.archiveData, marker);
      symbol.loading = "lazy";
      symbol.decoding = "async";
      markerEl.appendChild(symbol);
    }
    const pinnedActiveMarkers = getPinnedActiveMarkerIds();
    if (state.activeMapMode) {
      const pinned = pinnedActiveMarkers.has(marker.id);
      const visibleInActiveMode = state.activeMapShowAllMarkers || pinned;
      if (!visibleInActiveMode) markerEl.classList.add("hidden");
      markerEl.classList.toggle("active-map-pinned", pinned);
      markerEl.classList.toggle("active-map-preview", state.activeMapShowAllMarkers && !pinned);
    } else if (!state.editMode && group?.enabled === false) {
      markerEl.classList.add("hidden");
    }
    const nameEl = document.createElement("span");
    nameEl.className = "marker-name";
    nameEl.textContent = marker.title || "Метка";
    markerEl.appendChild(nameEl);
    nameEl.textContent = getLocalizedText(marker, "title", state, "Метка");
    nameEl.textContent = getLocalizedText(marker, "title", state, "Метка");

    nameEl.textContent = getLocalizedText(marker, "title", state, "Метка");

    markerEl.addEventListener("click", (event) => {
      if (state.editMode && event.altKey) {
        if (state.activeMapMode) {
          togglePinnedMarker(marker);
          return;
        }
        state.markersData = state.markersData.filter((m) => m !== marker);
        if (marker.id) changesManager.remove("marker", marker.id);
        renderMarkers();
        els.panelTitle.textContent = "Метка удалена";
        els.panelSubtitle.textContent = "Alt + клик удаляет метку";
        els.panelText.textContent = "Создай новую метку кликом по карте в режиме редактирования.";
        return;
      }
      ui.updatePanelFromMarker(marker);
    });

    markerEl.addEventListener("pointerdown", (event) => {
      if (!state.editMode) return;
      event.stopPropagation();
      markerEl.setPointerCapture(event.pointerId);

      // Не используем drag через transform: маркер должен сразу двигаться в процентах карты.
      // Так координаты сохраняются в JSON без пересчёта из DOM-пикселей.
      const dragMove = (moveEvent) => {
        const { x, y } = mapModule.getMapPercentFromClient(moveEvent.clientX, moveEvent.clientY);
        marker.x = x;
        marker.y = y;
        markerEl.style.left = `${marker.x}%`;
        markerEl.style.top = `${marker.y}%`;
      };

      const dragEnd = () => {
        if (marker.id) changesManager.upsert("marker", marker.id, marker);
        markerEl.removeEventListener("pointermove", dragMove);
        markerEl.removeEventListener("pointerup", dragEnd);
        markerEl.removeEventListener("pointercancel", dragEnd);
      };

      markerEl.addEventListener("pointermove", dragMove);
      markerEl.addEventListener("pointerup", dragEnd);
      markerEl.addEventListener("pointercancel", dragEnd);
    });

    return markerEl;
  }

  function ensureDefaultDrawLayer() {
    if (state.drawLayersData.length > 0) return;
    const defaultLayer = {
      id: "draw-layer-default",
      name: "Контуры",
      order: 0,
      strokes: [],
      visible: true,
    };
    state.drawLayersData.push(defaultLayer);
    state.activeDrawLayerId = defaultLayer.id;
  }

  function getActiveDrawLayer() {
    return state.drawLayersData.find((layer) => layer.id === state.activeDrawLayerId) || state.drawLayersData[0] || null;
  }

  function createDrawLayer() {
    const layer = {
      id: `draw-layer-${Date.now()}`,
      name: `Слой ${state.drawLayersData.length + 1}`,
      order: state.drawLayersData.length,
      strokes: [],
      visible: true,
    };
    state.drawLayersData.push(layer);
    state.activeDrawLayerId = layer.id;
    changesManager.upsert("drawLayer", layer.id, layer);
    renderGroups();
    renderDrawLayers();
    renderDrawLayerPanel();
  }

  function renderDrawLayers() {
    els.drawSvg.innerHTML = "";
    const sortedLayers = [...state.drawLayersData].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    sortedLayers.forEach((layer) => {
      if (layer.visible === false) return;
      (layer.strokes || []).forEach((stroke) => {
        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyline.setAttribute("points", (stroke.points || []).map((point) => `${point.x},${point.y}`).join(" "));
        polyline.setAttribute("fill", "none");
        polyline.setAttribute("stroke", stroke.color || "#7dd3fc");
        polyline.setAttribute("stroke-width", String(stroke.size || 2));
        polyline.setAttribute("stroke-linecap", "round");
        polyline.setAttribute("stroke-linejoin", "round");
        els.drawSvg.appendChild(polyline);
      });
    });
  }

  function renderDrawLayerPanel() {
    els.drawLayerList.innerHTML = "";
    const sortedLayers = [...state.drawLayersData].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    sortedLayers.forEach((layer, index) => {
      const row = document.createElement("div");
      row.className = "draw-layer-row";
      const nameInput = document.createElement("input");
      nameInput.value = layer.name || "";
      nameInput.className = "draw-layer-name";
      nameInput.addEventListener("input", () => {
        layer.name = nameInput.value.trim();
        changesManager.upsert("drawLayer", layer.id, layer);
      });

      const selectButton = document.createElement("button");
      selectButton.textContent = state.activeDrawLayerId === layer.id ? "\u2713" : "\u25cf";
      selectButton.addEventListener("click", () => {
        state.activeDrawLayerId = layer.id;
        renderGroups();
        renderDrawLayerPanel();
      });

      const upButton = document.createElement("button");
      upButton.textContent = "\u2191";
      upButton.disabled = index === 0;
      upButton.addEventListener("click", () => {
        if (index === 0) return;
        const prev = sortedLayers[index - 1];
        const curOrder = layer.order ?? index;
        layer.order = prev.order ?? (index - 1);
        prev.order = curOrder;
        changesManager.upsert("drawLayer", layer.id, layer);
        changesManager.upsert("drawLayer", prev.id, prev);
        renderDrawLayers();
        renderDrawLayerPanel();
      });

      const downButton = document.createElement("button");
      downButton.textContent = "\u2193";
      downButton.disabled = index === sortedLayers.length - 1;
      downButton.addEventListener("click", () => {
        if (index === sortedLayers.length - 1) return;
        const next = sortedLayers[index + 1];
        const curOrder = layer.order ?? index;
        layer.order = next.order ?? (index + 1);
        next.order = curOrder;
        changesManager.upsert("drawLayer", layer.id, layer);
        changesManager.upsert("drawLayer", next.id, next);
        renderDrawLayers();
        renderDrawLayerPanel();
      });

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "\u2715";
      deleteButton.addEventListener("click", () => {
        state.drawLayersData = state.drawLayersData.filter((entry) => entry.id !== layer.id);
        changesManager.remove("drawLayer", layer.id);
        state.activeDrawLayerId = state.drawLayersData[0]?.id || null;
        renderGroups();
        renderDrawLayers();
        renderDrawLayerPanel();
      });

      row.append(selectButton, nameInput, upButton, downButton, deleteButton);
      els.drawLayerList.appendChild(row);
    });
  }

  function renderRegionLabels() {
    els.regionLabelsContainer.innerHTML = "";
    if (!state.regionLabelsVisible && !state.editMode) return;
    state.regionLabelsData.forEach((label) => {
      const el = document.createElement("div");
      el.className = "region-label";
      el.dataset.labelId = label.id;
      el.style.left = `${label.x}%`;
      el.style.top = `${label.y}%`;
      el.style.fontFamily = label.fontFamily || "Cinzel";
      el.style.fontSize = `${label.fontSize || 36}px`;
      el.style.fontWeight = label.bold ? "700" : "500";
      el.style.fontStyle = label.italic ? "italic" : "normal";
      el.style.color = label.color || "#dbeafe";
      el.style.transform = `translate(-50%, -50%) rotate(${label.rotation || 0}deg)`;
      el.textContent = getLocalizedText(label, "text", state, label.text || "Новая подпись");
      el.textContent = label.text || "Новая подпись";
      el.textContent = getLocalizedText(label, "text", state, label.text || "Новая подпись");
      el.textContent = getLocalizedText(label, "text", state, label.text || "Новая подпись");
      const textEditable = state.editMode && state.regionTextMode && !state.regionTextMoveMode;
      el.contentEditable = String(textEditable);
      el.classList.toggle("text-editable", textEditable);

      el.addEventListener("input", () => {
        label.text = el.textContent.trim();
        changesManager.upsert("regionLabel", label.id, label);
      });

      el.addEventListener("click", (event) => {
        event.stopPropagation();
        state.currentRegionLabel = label;
        ui.openMapTextToolbar(label, el.getBoundingClientRect());
      });

      el.addEventListener("dblclick", (event) => {
        if (!state.editMode) return;
        event.stopPropagation();
        state.currentRegionLabel = label;
        state.regionTextMode = true;
        state.regionTextMoveMode = false;
        renderRegionLabels();
        requestAnimationFrame(() => {
          const refreshed = els.regionLabelsContainer.querySelector(`[data-label-id="${label.id}"]`);
          if (!refreshed) return;
          refreshed.focus();
          ui.openMapTextToolbar(label, refreshed.getBoundingClientRect());
        });
      });
      els.regionLabelsContainer.appendChild(el);
    });
  }

  function createRegionLabel() {
    const label = {
      id: `label-${Date.now()}`,
      text: "Новая область",
      x: 50,
      y: 50,
      fontFamily: "Cinzel",
      fontSize: 36,
      rotation: 0,
      color: "#dbeafe",
      bold: false,
      italic: false,
    };
    label.text = "Новая область";
    label.text = "Новая область";
    state.regionLabelsData.push(label);
    state.currentRegionLabel = label;
    state.regionTextMode = true;
    changesManager.upsert("regionLabel", label.id, label);
    renderRegionLabels();
    requestAnimationFrame(() => {
      const labelElement = els.regionLabelsContainer.querySelector(`[data-label-id="${label.id}"]`);
      if (!labelElement) return;
      labelElement.focus();
      const range = document.createRange();
      range.selectNodeContents(labelElement);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      ui.openMapTextToolbar(label, labelElement.getBoundingClientRect());
    });
  }

  function renderMarkers() {
    els.markersContainer.innerHTML = "";
    const groupsById = new Map(state.groupsData.map((group) => [group.id, group]));
    const fragment = document.createDocumentFragment();
    state.markersData.forEach((marker) => {
      if (state.activeMapMode) {
        const pinnedActiveMarkers = getPinnedActiveMarkerIds();
        if (!state.activeMapShowAllMarkers && !pinnedActiveMarkers.has(marker.id)) return;
      }
      fragment.appendChild(createMarkerElement(marker, groupsById));
    });
    els.markersContainer.appendChild(fragment);
  }

  function toggleEditMode(force) {
    const nextEditMode = typeof force === "boolean" ? force : !state.editMode;
    if (nextEditMode && !hasEditorAccess()) return;
    state.editMode = nextEditMode;
    document.body.classList.toggle("edit-mode", state.editMode);

    if (!state.editorGroupId && state.groupsData.length > 0) {
      state.editorGroupId = state.groupsData[0].id;
    }
    if (!state.editMode) {
      state.regionTextMode = false;
      state.regionTextMoveMode = false;
    }

    mapTextureController.updateMapTextureButtonLabel();
    els.deleteMarkerButton.hidden = !state.editMode;
    els.addPaletteButton.hidden = !state.editMode;
    ui.setPanelEditable(state.editMode);
    ui.refreshTopbarActionButtons();
    document.dispatchEvent(new CustomEvent("serkonia:edit-mode-changed"));
    ui.setMapEditorControlsVisible(state.editMode && !state.timelineMode && !state.archiveMode && !state.heroesMode && !state.activeMapMode, state.drawMode);
    if (!state.editMode) {
      state.drawMode = false;
      ui.closeMapTextToolbar();
    }
    if (!state.activeMapMode) renderGroups();
    rerenderCurrentMode();
    if (state.activeMapMode) ui.openActiveMapMode();
    renderDrawLayerPanel();
    mapTextureController.applyTextureForCurrentMapMode();
    refreshGroupButtonsSelection();

    if (state.editMode) {
      if (state.activeMapMode) {
        els.panelSubtitle.textContent = "Редактирование Active Map включено";
        els.panelText.textContent =
          "Клик по карте создаёт активное событие. Кнопка Маршрут включает рисование следов партии, а Alt + клик по обычной метке закрепляет её на Active Map.";
      } else {
        els.panelSubtitle.textContent = "Режим редактирования включён";
        els.panelText.textContent =
          "Клик по карте: новая метка \u00b7 Alt+клик по метке: удалить \u00b7 подписи территорий: кнопка \"\u2194 Перемещение текста\" включает перетаскивание.";
      }
    }
  }

  function exportWorldChangesJson() {
    // Экспортирует основной overlay мира. Active Map сохраняется отдельно в active-map.json.
    changesManager.download("changes.json");
  }

  function deleteCurrentMarker() {
    if (!state.editMode || !state.currentMarker) return;
    if (state.currentPanelEntity?.entity === "activeMarker") {
      removeActiveMarkerFromState(state.currentMarker.id);
      state.currentMarker = null;
      state.currentPanelEntity = { entity: "marker" };
      ui.renderActiveMap();
      els.panelTitle.textContent = "Активное событие удалено";
      showEditorStatus(
        "Редактор Active Map",
        "Активное событие удалено с карты. Новый активный маркер можно создать кликом по карте в режиме редактирования Active Map.",
        [
          "Alt + клик по обычной метке закрепляет её на Active Map",
          "Новые активные события создаются кликом по карте в режиме редактирования",
          "Изменения сохраняются в active-map.json",
        ],
      );
      return;
    }

    const markerToDelete = state.currentMarker;
    state.markersData = state.markersData.filter((marker) => marker !== markerToDelete);
    if (markerToDelete.id) changesManager.remove("marker", markerToDelete.id);
    state.currentMarker = null;
    renderMarkers();
    els.panelTitle.textContent = "Метка удалена";
    els.panelSubtitle.textContent = "Редактор карты";
    els.panelText.textContent = "Создай новую метку кликом по карте в режиме редактирования или выбери другую метку на карте.";
    els.fact1.textContent = "Alt + клик по метке быстро удаляет её";
    els.fact2.textContent = "Перетаскивание меняет положение метки на карте";
    els.fact3.textContent = "Изменения обычных меток попадают в changes.json";
  }

  function setupEditorInteractions() {
    let drawingStroke = null;
    ensureDefaultDrawLayer();
    renderGroups();
    renderDrawLayers();
    renderRegionLabels();
    renderDrawLayerPanel();
    mapTextureController.applyTextureForCurrentMapMode();
    mapTextureController.updateMapTextureButtonLabel();
    ui.setupMapEditorCallbacks({
      onCreateRegionLabel: () => createRegionLabel(),
      onToggleTextMoveMode: () => {
        state.regionTextMode = true;
        state.regionTextMoveMode = !state.regionTextMoveMode;
        renderRegionLabels();
        ui.setMapEditorControlsVisible(state.editMode && !state.timelineMode && !state.archiveMode && !state.heroesMode && !state.activeMapMode, state.drawMode);
        els.panelSubtitle.textContent = state.regionTextMoveMode
          ? "Перемещение подписей включено"
          : "Редактирование подписей включено";
      },
      onToggleDrawMode: () => {
        state.drawMode = !state.drawMode;
        ui.setMapEditorControlsVisible(state.editMode && !state.timelineMode && !state.archiveMode && !state.heroesMode && !state.activeMapMode, state.drawMode);
      },
      onTextStyleChange: (patch) => {
        if (!state.currentRegionLabel) return;
        if (typeof patch.x === "number") patch.x = clamp(patch.x, 0, 100);
        if (typeof patch.y === "number") patch.y = clamp(patch.y, 0, 100);
        Object.assign(state.currentRegionLabel, patch);
        changesManager.upsert("regionLabel", state.currentRegionLabel.id, state.currentRegionLabel);
        renderRegionLabels();
      },
      onBrushChange: ({ color, size }) => {
        if (color) state.drawBrushColor = color;
        if (typeof size === "number") state.drawBrushSize = size;
      },
      onMapViewModeChange: () => {
        mapTextureController.applyTextureForCurrentMapMode();
        mapTextureController.updateMapTextureButtonLabel();
        renderRegionLabels();
      },
    });

    // Клики по карте для новых меток и рисования работают только в edit-mode, чтобы не мешать обычной навигации.
    els.mapStage.addEventListener("click", (event) => {
      if (!state.editMode) return;
      if (state.activeMapMode) return;
      if (event.target.closest(".region-label")) return;
      if (state.drawMode) return;
      if (state.regionTextMode) return;
      if (event.target.classList.contains("marker")) return;

      const { x, y } = mapModule.getMapPercentFromClient(event.clientX, event.clientY);
      const marker = {
        ...createDefaultMarker(x, y),
        title: "Новая метка",
        type: "Новый тип",
        imageText: "Добавь подпись для иллюстрации в панели справа.",
        description: "Добавь описание в правой панели.",
        facts: ["Факт 1", "Факт 2", "Факт 3"],
      };

      marker.title = "Новая метка";
      marker.type = "Новый тип";
      marker.imageText = "Добавь подпись для иллюстрации в панели справа.";
      marker.description = "Добавь описание в правой панели.";
      marker.facts = ["Факт 1", "Факт 2", "Факт 3"];

      state.markersData.push(marker);
      changesManager.upsert("marker", marker.id, marker);
      renderMarkers();
      ui.updatePanelFromMarker(marker);
    });

    els.mapStage.addEventListener("pointerdown", (event) => {
      if (!state.editMode || !state.drawMode) return;
      if (state.activeMapMode) return;
      if (event.target.closest(".marker") || event.target.closest(".region-label")) return;
      const activeLayer = getActiveDrawLayer();
      if (!activeLayer) return;
      const start = mapModule.getMapPercentFromClient(event.clientX, event.clientY);
      drawingStroke = {
        id: `stroke-${Date.now()}`,
        color: state.drawBrushColor,
        size: state.drawBrushSize,
        points: [start],
      };
      activeLayer.strokes = Array.isArray(activeLayer.strokes) ? activeLayer.strokes : [];
      activeLayer.strokes.push(drawingStroke);
      renderDrawLayers();
    });

    els.mapStage.addEventListener("pointermove", (event) => {
      if (!state.editMode || !state.drawMode || !drawingStroke) return;
      if (state.activeMapMode) return;
      drawingStroke.points.push(mapModule.getMapPercentFromClient(event.clientX, event.clientY));
      renderDrawLayers();
    });

    const finishStroke = () => {
      if (!drawingStroke) return;
      const activeLayer = getActiveDrawLayer();
      if (activeLayer?.id) changesManager.upsert("drawLayer", activeLayer.id, activeLayer);
      drawingStroke = null;
    };

    els.mapStage.addEventListener("pointerup", finishStroke);
    els.mapStage.addEventListener("pointercancel", finishStroke);

    els.regionLabelsContainer.addEventListener("pointerdown", (event) => {
      if (!state.editMode) return;
      const targetElement = event.target instanceof Element ? event.target : event.target?.parentElement;
      const labelElement = targetElement?.closest?.(".region-label");
      if (!labelElement) return;
      event.stopPropagation();
      const labelId = labelElement.dataset.labelId;
      const label = state.regionLabelsData.find((entry) => entry.id === labelId);
      if (!label) return;
      state.currentRegionLabel = label;

      const dragEnabled = !state.regionTextMode || state.regionTextMoveMode;
      let hasDragged = false;

      if (dragEnabled) {
        event.preventDefault();
        labelElement.setPointerCapture(event.pointerId);
      }

      const onMove = (moveEvent) => {
        if (!dragEnabled) return;
        const { x, y } = mapModule.getMapPercentFromClient(moveEvent.clientX, moveEvent.clientY);
        hasDragged = true;
        label.x = x;
        label.y = y;
        labelElement.style.left = `${x}%`;
        labelElement.style.top = `${y}%`;
      };

      const releaseHandlers = () => {
        labelElement.removeEventListener("pointermove", onMove);
        labelElement.removeEventListener("pointerup", onEnd);
        labelElement.removeEventListener("pointercancel", onEnd);
      };

      const onEnd = () => {
        releaseHandlers();
        if (dragEnabled && labelElement.hasPointerCapture(event.pointerId)) {
          labelElement.releasePointerCapture(event.pointerId);
        }
        if (hasDragged) changesManager.upsert("regionLabel", label.id, label);
      };

      labelElement.addEventListener("pointermove", onMove);
      labelElement.addEventListener("pointerup", onEnd);
      labelElement.addEventListener("pointercancel", onEnd);

      const openToolbarIfNeeded = () => {
        state.currentRegionLabel = label;
        ui.openMapTextToolbar(label, labelElement.getBoundingClientRect());
      };

      if (!dragEnabled) openToolbarIfNeeded();

      if (dragEnabled) {
        labelElement.addEventListener("pointerup", () => {
          if (!hasDragged) openToolbarIfNeeded();
        }, { once: true });
      }
    });

    els.exportDataButton.addEventListener("click", exportWorldChangesJson);
    els.uploadMapTextureButton.addEventListener("click", () => els.mapTextureInput.click());
    els.mapTextureInput.addEventListener("change", async (event) => {
      const [file] = event.target.files || [];
      try {
        await mapTextureController.handleMapTextureSelection(file);
      } catch (error) {
        console.error(error);
      }
      event.target.value = "";
    });

    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.shiftKey && event.code === "Backquote") {
        if (!hasEditorAccess()) return;
        event.preventDefault();
        toggleEditMode();
      }
    });
  }

  return {
    renderGroups,
    renderMarkers,
    renderRegionLabels,
    renderDrawLayers,
    toggleEditMode,
    setupEditorInteractions,
    deleteCurrentMarker,
  };
}
