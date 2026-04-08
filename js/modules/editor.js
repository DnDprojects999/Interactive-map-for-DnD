export function createEditorModule(els, state, ui, mapModule, changesManager) {
  function isEditorAccessGranted() {
    const queryHasEditor = new URLSearchParams(window.location.search).get("editor") === "1";
    const localFlagEnabled = window.localStorage.getItem("serkonia:editor-access") === "granted";
    return queryHasEditor || localFlagEnabled;
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

    refreshGroupButtonsSelection();
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

    els.exportDataButton.hidden = !state.editMode;
    ui.setPanelEditable(state.editMode);
    refreshGroupButtonsSelection();

    if (state.editMode) {
      els.panelSubtitle.textContent = "Режим редактирования включён";
      els.panelText.textContent = "Клик по карте: новая метка · Alt+клик по метке: удалить · перетаскивание метки: изменить позицию.";
    }
  }

  function exportWorldChangesJson() {
    // Экспортируем единый overlay-файл изменений для всех доменов редактора.
    changesManager.download("world-changes.json");
  }

  function setupEditorInteractions() {
    // Создание новой метки доступно только в edit-mode и только по свободному месту карты.
    els.mapStage.addEventListener("click", (event) => {
      if (!state.editMode) return;
      if (event.target.classList.contains("marker")) return;

      const { x, y } = mapModule.getMapPercentFromClient(event.clientX, event.clientY);
      const marker = {
        id: `marker-${Date.now()}`,
        group: state.editorGroupId || state.groupsData[0]?.id || "cities",
        title: "Новая метка",
        type: "Новый тип",
        x,
        y,
        description: "Добавь описание в правой панели.",
        facts: ["Факт 1", "Факт 2", "Факт 3"],
      };

      state.markersData.push(marker);
      changesManager.upsert("marker", marker.id, marker);
      renderMarkers();
      ui.updatePanelFromMarker(marker);
    });

    els.exportDataButton.addEventListener("click", exportWorldChangesJson);

    document.addEventListener("keydown", (event) => {
      // "Скрытая" функция редактора: горячая клавиша работает только при явном editor-access.
      // Доступ можно дать через ?editor=1 или локальный флаг serkonia:editor-access=granted.
      if (!isEditorAccessGranted()) return;
      if (event.ctrlKey && event.shiftKey && event.code === "Backquote") {
        event.preventDefault();
        toggleEditMode();
      }
    });
  }

  return {
    renderGroups,
    renderMarkers,
    toggleEditMode,
    setupEditorInteractions,
  };
}
