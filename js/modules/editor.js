export function createEditorModule(els, state, ui, mapModule, changesManager) {
  let activeMapTextureObjectUrl = null;

  function applyMapTexture(source) {
    els.mapPhotoLayer.style.setProperty("--map-photo-image", source ? `url("${source}")` : "none");
  }

  function handleMapTextureSelection(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (activeMapTextureObjectUrl) URL.revokeObjectURL(activeMapTextureObjectUrl);
    activeMapTextureObjectUrl = URL.createObjectURL(file);
    applyMapTexture(activeMapTextureObjectUrl);
    els.panelSubtitle.textContent = `Фоновая карта обновлена: ${file.name}`;
    els.panelText.textContent = "Фото применено как базовый слой карты. Сетка и блики остаются сверху полупрозрачно.";
  }

  /**
   * Подсвечивает кнопку слоя, выбранного как "цель редактирования".
   * В обычном режиме (не edit-mode) кнопки работают как фильтры видимости.
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

  function renderGroups() {
    els.toolButtonsContainer.innerHTML = "";

    state.groupsData.forEach((group) => {
      const button = document.createElement("button");
      button.className = `tool-btn ${group.enabled ? "active" : ""}`;
      button.dataset.group = group.id;
      button.dataset.label = group.name;
      button.textContent = group.short || "?";

      button.addEventListener("click", () => {
        if (state.editMode) {
          state.editorGroupId = group.id;
          refreshGroupButtonsSelection();
          els.panelSubtitle.textContent = `Режим редактирования · выбран слой: ${group.name}`;
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
    labelsButton.title = state.editMode ? "Режим редактирования подписей территорий" : "Показать/скрыть подписи территорий";
    labelsButton.textContent = "Т";
    labelsButton.addEventListener("click", () => {
      if (state.editMode) {
        state.regionTextMode = !state.regionTextMode;
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
      layerButton.title = layer.name || `Слой ${index + 1}`;
      layerButton.textContent = "◻";
      layerButton.addEventListener("click", () => {
        if (state.editMode) {
          state.activeDrawLayerId = layer.id;
          state.drawMode = true;
          ui.setMapEditorControlsVisible(true, true);
          els.panelSubtitle.textContent = `Выбран слой рисования: ${layer.name || `Слой ${index + 1}`}`;
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
      addLayerButton.title = "Новый слой рисования";
      addLayerButton.textContent = "+";
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
    markerEl.style.left = `${marker.x}%`;
    markerEl.style.top = `${marker.y}%`;

    const group = groupsById.get(marker.group);
    if (group?.color) markerEl.style.background = group.color;
    if (group?.enabled === false) markerEl.classList.add("hidden");
    const nameEl = document.createElement("span");
    nameEl.className = "marker-name";
    nameEl.textContent = marker.title || "Метка";
    markerEl.appendChild(nameEl);

    markerEl.addEventListener("click", (event) => {
      if (state.editMode && event.altKey) {
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

      // Во время drag сразу меняем и DOM-координаты, и данные модели,
      // чтобы экспорт JSON отражал актуальное положение без отдельной синхронизации.
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
      selectButton.textContent = state.activeDrawLayerId === layer.id ? "✓" : "●";
      selectButton.addEventListener("click", () => {
        state.activeDrawLayerId = layer.id;
        renderGroups();
        renderDrawLayerPanel();
      });

      const upButton = document.createElement("button");
      upButton.textContent = "↑";
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
      downButton.textContent = "↓";
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
      deleteButton.textContent = "✕";
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
    if (!state.regionLabelsVisible) return;
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
      el.textContent = label.text || "Новая подпись";
      el.contentEditable = String(state.editMode && state.regionTextMode);
      el.classList.toggle("text-editable", state.editMode && state.regionTextMode);

      el.addEventListener("input", () => {
        label.text = el.textContent.trim();
        changesManager.upsert("regionLabel", label.id, label);
      });

      el.addEventListener("click", (event) => {
        event.stopPropagation();
        state.currentRegionLabel = label;
        ui.openMapTextToolbar(label, el.getBoundingClientRect());
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
    state.markersData.forEach((marker) => fragment.appendChild(createMarkerElement(marker, groupsById)));
    els.markersContainer.appendChild(fragment);
  }

  function toggleEditMode(force) {
    state.editMode = typeof force === "boolean" ? force : !state.editMode;
    document.body.classList.toggle("edit-mode", state.editMode);

    if (!state.editorGroupId && state.groupsData.length > 0) {
      state.editorGroupId = state.groupsData[0].id;
    }
    if (!state.editMode) state.regionTextMode = false;

    els.exportDataButton.hidden = !state.editMode;
    els.uploadMapTextureButton.hidden = !state.editMode;
    els.deleteMarkerButton.hidden = !state.editMode;
    els.drawLayerPanel.hidden = !state.editMode;
    els.addPaletteButton.hidden = !state.editMode;
    ui.setPanelEditable(state.editMode);
    ui.setMapEditorControlsVisible(state.editMode && !state.timelineMode && !state.archiveMode, state.drawMode);
    if (!state.editMode) {
      state.drawMode = false;
      ui.closeMapTextToolbar();
    }
    renderGroups();
    renderDrawLayerPanel();
    refreshGroupButtonsSelection();

    if (state.editMode) {
      els.panelSubtitle.textContent = "Режим редактирования включён";
      els.panelText.textContent =
        "Клик по карте: новая метка · Alt+клик по метке: удалить · подписи: зажми 1 сек в текстовом режиме для перетаскивания.";
    }
  }

  function exportWorldChangesJson() {
    // Экспортируем единый overlay-файл изменений для всех доменов редактора.
    changesManager.download("world-changes.json");
  }

  function deleteCurrentMarker() {
    if (!state.editMode || !state.currentMarker) return;
    const markerToDelete = state.currentMarker;
    state.markersData = state.markersData.filter((marker) => marker !== markerToDelete);
    if (markerToDelete.id) changesManager.remove("marker", markerToDelete.id);
    state.currentMarker = null;
    renderMarkers();
    els.panelTitle.textContent = "Метка удалена";
    els.panelSubtitle.textContent = "Редактор карты";
    els.panelText.textContent = "Выбери другую метку или создай новую кликом по карте.";
    els.fact1.textContent = "Alt + клик по метке — быстрое удаление";
    els.fact2.textContent = "Кнопка «Удалить метку» удаляет выбранную";
    els.fact3.textContent = "Изменение попадёт в экспорт JSON";
  }

  function setupEditorInteractions() {
    let drawingStroke = null;
    ensureDefaultDrawLayer();
    renderGroups();
    renderDrawLayers();
    renderRegionLabels();
    renderDrawLayerPanel();
    ui.setupMapEditorCallbacks({
      onCreateRegionLabel: () => createRegionLabel(),
      onToggleDrawMode: () => {
        state.drawMode = !state.drawMode;
        ui.setMapEditorControlsVisible(state.editMode && !state.timelineMode && !state.archiveMode, state.drawMode);
      },
      onTextStyleChange: (patch) => {
        if (!state.currentRegionLabel) return;
        Object.assign(state.currentRegionLabel, patch);
        changesManager.upsert("regionLabel", state.currentRegionLabel.id, state.currentRegionLabel);
        renderRegionLabels();
      },
      onBrushChange: ({ color, size }) => {
        if (color) state.drawBrushColor = color;
        if (typeof size === "number") state.drawBrushSize = size;
      },
    });

    // Создание новой метки доступно только в edit-mode и только по свободному месту карты.
    els.mapStage.addEventListener("click", (event) => {
      if (!state.editMode) return;
      if (event.target.closest(".region-label")) return;
      if (state.drawMode) return;
      if (state.regionTextMode) return;
      if (event.target.classList.contains("marker")) return;

      const { x, y } = mapModule.getMapPercentFromClient(event.clientX, event.clientY);
      const marker = {
        id: `marker-${Date.now()}`,
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

      state.markersData.push(marker);
      changesManager.upsert("marker", marker.id, marker);
      renderMarkers();
      ui.updatePanelFromMarker(marker);
    });

    els.mapStage.addEventListener("pointerdown", (event) => {
      if (!state.editMode || !state.drawMode) return;
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
      const labelElement = event.target.closest(".region-label");
      if (!labelElement) return;
      event.stopPropagation();
      const labelId = labelElement.dataset.labelId;
      const label = state.regionLabelsData.find((entry) => entry.id === labelId);
      if (!label) return;
      state.currentRegionLabel = label;

      const longPressDragDelayMs = 1000;
      let dragEnabled = !state.regionTextMode;
      let longPressTimerId = null;

      const onMove = (moveEvent) => {
        if (!dragEnabled) return;
        const { x, y } = mapModule.getMapPercentFromClient(moveEvent.clientX, moveEvent.clientY);
        label.x = x;
        label.y = y;
        labelElement.style.left = `${x}%`;
        labelElement.style.top = `${y}%`;
      };

      const releaseHandlers = () => {
        if (longPressTimerId !== null) {
          clearTimeout(longPressTimerId);
          longPressTimerId = null;
        }
        labelElement.removeEventListener("pointermove", onMove);
        labelElement.removeEventListener("pointerup", onEnd);
        labelElement.removeEventListener("pointercancel", onEnd);
      };

      const onEnd = () => {
        const hasDragged = dragEnabled;
        releaseHandlers();
        if (hasDragged) changesManager.upsert("regionLabel", label.id, label);
      };

      labelElement.addEventListener("pointermove", onMove);
      labelElement.addEventListener("pointerup", onEnd);
      labelElement.addEventListener("pointercancel", onEnd);

      if (!state.regionTextMode) return;

      ui.openMapTextToolbar(label, labelElement.getBoundingClientRect());
      longPressTimerId = window.setTimeout(() => {
        dragEnabled = true;
      }, longPressDragDelayMs);
    });

    els.exportDataButton.addEventListener("click", exportWorldChangesJson);
    els.uploadMapTextureButton.addEventListener("click", () => els.mapTextureInput.click());
    els.mapTextureInput.addEventListener("change", (event) => {
      const [file] = event.target.files || [];
      handleMapTextureSelection(file);
      event.target.value = "";
    });

    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.shiftKey && event.code === "Backquote") {
        event.preventDefault();
        toggleEditMode();
      }
    });

    window.addEventListener("beforeunload", () => {
      if (activeMapTextureObjectUrl) URL.revokeObjectURL(activeMapTextureObjectUrl);
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
