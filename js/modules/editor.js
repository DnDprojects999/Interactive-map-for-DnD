export function createEditorModule(els, state, ui, mapModule) {
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

      const dragMove = (moveEvent) => {
        const { x, y } = mapModule.getMapPercentFromClient(moveEvent.clientX, moveEvent.clientY);
        marker.x = x;
        marker.y = y;
        markerEl.style.left = `${marker.x}%`;
        markerEl.style.top = `${marker.y}%`;
      };

      const dragEnd = () => {
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

    els.editModeButton.textContent = state.editMode ? "Режим: редактирование" : "Режим: просмотр";
    els.exportDataButton.hidden = !state.editMode;
    ui.setPanelEditable(state.editMode);
    refreshGroupButtonsSelection();

    if (state.editMode) {
      els.panelSubtitle.textContent = "Режим редактирования включён";
      els.panelText.textContent = "Клик по карте: новая метка · Alt+клик по метке: удалить · перетаскивание метки: изменить позицию.";
    }
  }

  function exportMarkersJson() {
    const payload = {
      groups: state.groupsData,
      markers: state.markersData,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "markers.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function setupEditorInteractions() {
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
      renderMarkers();
      ui.updatePanelFromMarker(marker);
    });

    els.editModeButton.addEventListener("click", () => toggleEditMode());
    els.exportDataButton.addEventListener("click", exportMarkersJson);

    document.addEventListener("keydown", (event) => {
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
