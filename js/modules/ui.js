export function createUI(els, state) {
  let renderMapSidebarButtons = () => {};
  let recordChange = () => {};
  let activeExpandedCardId = null;
  let archiveScrollObserver = null;
  let mapEditorCallbacks = {
    onCreateRegionLabel: () => {},
    onToggleTextMoveMode: () => {},
    onToggleDrawMode: () => {},
    onTextStyleChange: () => {},
    onBrushChange: () => {},
    onMapViewModeChange: () => {},
  };
  const mapFonts = ["Cinzel", "Inter", "Georgia", "Times New Roman", "Arial", "Verdana", "Trebuchet MS", "Palatino", "Garamond", "Courier New"];
  const paletteVariableNames = ["--map-fill", "--map-border", "--grid-line", "--fog-a", "--fog-b", "--fog-c"];
  const basePalettes = new Set(["ember", "night", "frost"]);
  const editablePanelFields = [
    els.panelTitle,
    els.panelSubtitle,
    els.panelImageCaption,
    els.panelText,
    els.fact1,
    els.fact2,
    els.fact3,
  ];
  const editableTimelineFields = ["event-year", "event-title", "event-text"];
  const editableArchiveFields = [
    "archive-group-title",
    "archive-card-title",
    "archive-card-text",
    "archive-expanded-title",
    "archive-expanded-text",
  ];
  let dragArchiveCardMeta = null;

  const mapViewModes = ["author", "vector", "vector-colored"];

  function getArchiveImageVariantKey() {
    return state.mapViewMode === "author" ? "author" : "interactive";
  }

  function ensureArchiveImageVariants(item) {
    if (!item || typeof item !== "object") return;
    if (!item.imageVariants || typeof item.imageVariants !== "object") item.imageVariants = {};
  }

  function getArchiveItemImageUrl(item) {
    const variantKey = getArchiveImageVariantKey();
    const variantUrl = item?.imageVariants?.[variantKey]?.trim?.() || "";
    if (variantUrl) return variantUrl;
    return item?.imageUrl?.trim?.() || "";
  }

  function setMapDisplayMode(mode, options = {}) {
    const nextMode = mapViewModes.includes(mode) ? mode : "author";
    const shouldRenderArchive = options.rerenderArchive !== false;
    state.mapViewMode = nextMode;

    document.body.classList.toggle("map-view-author", nextMode === "author");
    document.body.classList.toggle("map-view-vector", nextMode === "vector");
    document.body.classList.toggle("map-view-vector-colored", nextMode === "vector-colored");

    const modeButtons = els.mapViewSwitcher?.querySelectorAll?.("[data-map-view]") || [];
    modeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.mapView === nextMode);
    });

    mapEditorCallbacks.onMapViewModeChange(nextMode);

    if (shouldRenderArchive) {
      renderArchive();
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

  function updatePanelImageView(marker) {
    const imageUrl = marker?.imageUrl?.trim() || "";
    const caption = marker?.imageText || "Здесь позже может быть портрет города, герб, карта региона или иллюстрация точки интереса";

    els.panelImageCaption.textContent = caption;
    els.panelImageUrlInput.value = imageUrl;
    els.panelImageHint.textContent = marker?.imageAssetSuggestedPath
      ? `Рекомендуемый путь ассета: ${marker.imageAssetSuggestedPath}`
      : "Можно вставить URL или перетащить файл на область превью.";

    if (!imageUrl) {
      els.panelImagePreview.hidden = true;
      els.panelImagePreview.removeAttribute("src");
      return;
    }

    els.panelImagePreview.src = imageUrl;
    els.panelImagePreview.hidden = false;
  }

  function parseTimelineOrderValue(yearText) {
    const source = (yearText || "").toUpperCase().trim();
    if (!source) return Number.POSITIVE_INFINITY;

    const nowMatch = source.match(/^NOW(?:\s*([+-])\s*(\d+))?$/);
    if (nowMatch) {
      const sign = nowMatch[1] === "-" ? -1 : 1;
      const delta = Number(nowMatch[2] || 0);
      return 1_000_000 + (sign * delta);
    }

    const ageMatch = source.match(/^(-?\d+(?:\.\d+)?)\s*AGE$/);
    if (ageMatch) return Number(ageMatch[1]);

    const numeric = Number(source);
    if (Number.isFinite(numeric)) return numeric;
    return Number.POSITIVE_INFINITY;
  }

  function normalizeTimelineOrderByDate() {
    state.eventsData.sort((a, b) => {
      const left = parseTimelineOrderValue(a.year);
      const right = parseTimelineOrderValue(b.year);
      if (left !== right) return left - right;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }

  function setSidebarRenderers({ mapButtonsRenderer }) {
    renderMapSidebarButtons = typeof mapButtonsRenderer === "function" ? mapButtonsRenderer : () => {};
  }

  function setupMapEditorCallbacks(callbacks) {
    mapEditorCallbacks = { ...mapEditorCallbacks, ...(callbacks || {}) };
  }

  function setChangeRecorder(recorder) {
    recordChange = typeof recorder === "function" ? recorder : () => {};
  }

  function swapSidebarContent(renderer) {
    els.toolButtonsContainer.classList.remove("sidebar-fade");
    renderer();
    // Принудительный reflow нужен, чтобы CSS-анимация reliably перезапускалась при каждой смене контента.
    void els.toolButtonsContainer.offsetWidth;
    els.toolButtonsContainer.classList.add("sidebar-fade");
  }

  function setSidebarTitle(text) {
    els.sidebarTitle.textContent = text;
  }

  function readFileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Не удалось прочитать файл изображения."));
      reader.readAsDataURL(file);
    });
  }

  function renderArchiveCardImage(imageNode, item) {
    imageNode.innerHTML = "";
    const imageUrl = getArchiveItemImageUrl(item);
    if (!imageUrl) {
      imageNode.textContent = item?.imageLabel || "Изображение";
      return;
    }

    const preview = document.createElement("img");
    preview.className = "archive-card-image-preview";
    preview.src = imageUrl;
    preview.alt = item?.imageLabel || item?.title || "Иллюстрация карточки архива";
    imageNode.appendChild(preview);
  }

  function scrollToTimelineEvent(eventId) {
    const eventCard = els.timelineContainer.querySelector(`[data-event-id="${eventId}"]`);
    if (!eventCard) return;
    eventCard.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function renderTimelineSidebarButtons() {
    els.toolButtonsContainer.innerHTML = "";

    const actions = [
      { label: "Старт", title: "Начало компании", eventId: "founding" },
      { label: "NOW", title: "Текущая эпоха", eventId: "campaign-start" },
      { label: "Союз", title: "Союз гильдий", eventId: "guild-union" },
    ];

    actions.forEach((action) => {
      const button = document.createElement("button");
      button.className = "tool-btn active";
      button.textContent = action.label;
      button.title = action.title;
      button.addEventListener("click", () => scrollToTimelineEvent(action.eventId));
      els.toolButtonsContainer.appendChild(button);
    });
  }

  function getArchiveShortLabel(groupName) {
    const cleaned = (groupName || "").replace(/\s+/g, "").trim();
    return cleaned.slice(0, 2) || "??";
  }

  function setActiveArchiveSidebarGroup(groupId) {
    state.activeArchiveGroupId = groupId;
    const buttons = els.toolButtonsContainer.querySelectorAll(".tool-btn");
    buttons.forEach((button) => button.classList.toggle("active", button.dataset.archiveGroup === groupId));
  }

  function renderArchiveSidebarButtons() {
    els.toolButtonsContainer.innerHTML = "";

    state.archiveData.forEach((group) => {
      const button = document.createElement("button");
      button.className = "tool-btn";
      button.dataset.archiveGroup = group.id;
      button.textContent = getArchiveShortLabel(group.title);
      button.title = group.title;
      button.addEventListener("click", () => {
        const section = els.archiveGroupsContainer.querySelector(`[data-archive-group="${group.id}"]`);
        if (!section) return;
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveArchiveSidebarGroup(group.id);
      });
      els.toolButtonsContainer.appendChild(button);
    });

    if (state.archiveData[0]?.id) {
      setActiveArchiveSidebarGroup(state.archiveData[0].id);
    }
  }

  function setPalette(paletteName) {
    const palette = paletteName || "ember";
    state.currentPalette = palette;
    document.body.classList.remove("palette-night", "palette-frost");
    paletteVariableNames.forEach((variableName) => document.body.style.removeProperty(variableName));

    if (palette === "night") document.body.classList.add("palette-night");
    if (palette === "frost") document.body.classList.add("palette-frost");

    if (!basePalettes.has(palette)) {
      const customPalette = state.customPalettes.find((entry) => entry.id === palette);
      if (customPalette?.variables) {
        Object.entries(customPalette.variables).forEach(([variableName, value]) => {
          document.body.style.setProperty(variableName, value);
        });
      }
    }

    const paletteOptions = els.palettePopover?.querySelectorAll(".palette-option") || [];
    paletteOptions.forEach((option) => {
      option.classList.toggle("active", option.dataset.paletteValue === palette);
    });
  }

  function renderCustomPaletteButtons() {
    if (!els.palettePopover) return;
    els.palettePopover.querySelectorAll(".palette-option.custom-palette").forEach((node) => node.remove());
    state.customPalettes.forEach((palette) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "palette-option custom-palette";
      button.dataset.paletteValue = palette.id;
      button.textContent = palette.name;
      els.palettePopover.insertBefore(button, els.addPaletteButton);
    });
  }

  function createCustomPaletteFromCurrent() {
    if (!state.editMode) return;
    const defaultName = `Custom ${state.customPalettes.length + 1}`;
    const name = window.prompt("Название палитры", defaultName);
    if (!name || !name.trim()) return;

    const style = getComputedStyle(document.body);
    const variables = {};
    paletteVariableNames.forEach((variableName) => {
      variables[variableName] = style.getPropertyValue(variableName).trim();
    });

    const customPalette = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      variables,
    };
    state.customPalettes.push(customPalette);
    renderCustomPaletteButtons();
    setPalette(customPalette.id);
  }

  function togglePalettePopover(force) {
    if (!els.palettePopover || !els.paletteToggle) return;
    const isOpen = !els.palettePopover.hidden;
    const shouldOpen = typeof force === "boolean" ? force : !isOpen;
    els.palettePopover.hidden = !shouldOpen;
    els.paletteToggle.classList.toggle("active", shouldOpen);
  }

  function togglePanel(force) {
    const shouldOpen = typeof force === "boolean" ? force : !els.content.classList.contains("panel-open");
    els.content.classList.toggle("panel-open", shouldOpen);
    els.panelHandle.textContent = shouldOpen ? "▶" : "◀";
  }

  function setModeWord(text, visible) {
    els.modeWord.textContent = text;
    els.modeWord.classList.toggle("show", visible);
  }

  function setTopModeButton(label) {
    els.timelineOpenButton.textContent = label;
  }

  function refreshEditorActionButtons() {
    const editEnabled = state.editMode;
    const inTimeline = editEnabled && state.timelineMode;
    const inArchive = editEnabled && state.archiveMode;
    const inMap = editEnabled && !state.timelineMode && !state.archiveMode;
    const shouldShowAny = inTimeline || inArchive || inMap;

    els.editorActions.hidden = !shouldShowAny;
    els.addRegionLabelButton.hidden = !inMap;
    els.toggleTextMoveModeButton.hidden = !inMap;
    els.toggleDrawModeButton.hidden = !inMap;
    els.addTimelineEventButton.hidden = !inTimeline;
    els.addArchiveGroupButton.hidden = !inArchive;
    els.addArchiveItemButton.hidden = !inArchive;
  }

  function setMapEditorControlsVisible(visible, drawModeActive) {
    els.drawLayerPanel.hidden = !(visible && drawModeActive);
    els.toggleDrawModeButton.classList.toggle("active", Boolean(drawModeActive));
    els.toggleTextMoveModeButton.classList.toggle("active", Boolean(state.regionTextMoveMode));
  }

  function openMapTextToolbar(label, rect) {
    if (!state.editMode || !label) return;
    if (els.mapTextFontSelect.options.length === 0) {
      mapFonts.forEach((fontName) => {
        const option = document.createElement("option");
        option.value = fontName;
        option.textContent = fontName;
        option.style.fontFamily = fontName;
        els.mapTextFontSelect.appendChild(option);
      });
    }

    els.mapTextFontSelect.value = label.fontFamily || "Cinzel";
    els.mapTextSizeInput.value = String(label.fontSize || 36);
    els.mapTextColorInput.value = label.color || "#dbeafe";
    els.mapTextRotateInput.value = String(label.rotation || 0);
    els.mapTextBoldButton.classList.toggle("active", Boolean(label.bold));
    els.mapTextItalicButton.classList.toggle("active", Boolean(label.italic));

    els.mapTextToolbar.hidden = false;

    const fallbackTop = 180;
    const fallbackLeft = 120;
    const margin = 24;
    const desiredTop = (rect?.top || fallbackTop) - 68;
    const desiredLeft = rect?.left || fallbackLeft;
    const toolbarWidth = els.mapTextToolbar.offsetWidth || 340;
    const toolbarHeight = els.mapTextToolbar.offsetHeight || 44;
    const maxTop = Math.max(margin, window.innerHeight - toolbarHeight - margin);
    const maxLeft = Math.max(margin, window.innerWidth - toolbarWidth - margin);

    els.mapTextToolbar.style.top = `${Math.min(maxTop, Math.max(margin, desiredTop))}px`;
    els.mapTextToolbar.style.left = `${Math.min(maxLeft, Math.max(margin, desiredLeft))}px`;
  }

  function closeMapTextToolbar() {
    els.mapTextToolbar.hidden = true;
  }

  function createTimelineEvent() {
    if (!state.editMode) return;
    const newEvent = {
      id: generateEntityId("timeline"),
      year: "NOW",
      title: "Новое событие",
      description: "Добавь описание события.",
      position: "up",
    };

    state.eventsData.push(newEvent);
    normalizeTimelineOrderByDate();
    recordChange("timelineEvent", newEvent.id, newEvent);
    renderTimeline();
    const newCard = els.timelineContainer.querySelector(`[data-event-id="${newEvent.id}"]`);
    if (newCard) newCard.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function createArchiveGroup() {
    if (!state.editMode) return;
    const newGroup = {
      id: generateEntityId("archive-group"),
      title: "Новая глава",
      items: [],
    };
    state.archiveData.push(newGroup);
    state.activeArchiveGroupId = newGroup.id;
    recordChange("archiveGroup", newGroup.id, newGroup);
    renderArchive();
    renderArchiveSidebarButtons();
    const section = els.archiveGroupsContainer.querySelector(`[data-archive-group="${newGroup.id}"]`);
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function createArchiveItem() {
    if (!state.editMode) return;
    const groupChoices = state.archiveData
      .map((group, index) => `${index + 1}. ${group.title || `Глава ${index + 1}`}`)
      .join("\n");
    if (!groupChoices) return;
    const selectedGroupRaw = window.prompt(`В какую главу добавить карточку?\n${groupChoices}`, "1");
    if (!selectedGroupRaw) return;
    const selectedIndex = Number(selectedGroupRaw) - 1;
    const selectedGroup = state.archiveData[selectedIndex];
    const groupId = selectedGroup?.id || state.activeArchiveGroupId || state.archiveData[0]?.id;
    const group = state.archiveData.find((entry) => entry.id === groupId);
    if (!group) return;
    group.items = Array.isArray(group.items) ? group.items : [];

    const newItem = {
      id: generateEntityId("archive-item"),
      title: "Новая карточка",
      imageLabel: "Добавь подпись изображения",
      description: "Короткое описание карточки.",
      fullDescription: "Подробное описание карточки для расширенного просмотра.",
      sortOrder: group.items.length,
    };

    group.items.push(newItem);
    recordChange("archiveItem", newItem.id, newItem, { groupId: group.id });
    renderArchive();
    const card = els.archiveGroupsContainer.querySelector(`[data-card-id="${group.id}-${newItem.id}"]`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }

  function setupEditorActionButtons() {
    els.addRegionLabelButton.addEventListener("click", () => mapEditorCallbacks.onCreateRegionLabel());
    els.toggleTextMoveModeButton.addEventListener("click", () => mapEditorCallbacks.onToggleTextMoveMode());
    els.toggleDrawModeButton.addEventListener("click", () => mapEditorCallbacks.onToggleDrawMode());
    els.addTimelineEventButton.addEventListener("click", createTimelineEvent);
    els.addArchiveGroupButton.addEventListener("click", createArchiveGroup);
    els.addArchiveItemButton.addEventListener("click", createArchiveItem);
  }

  function openTimelineMode() {
    state.timelineMode = true;
    state.archiveMode = false;
    setModeWord("Timeline", false);
    setTopModeButton("Timeline");
    document.body.classList.add("timeline-mode");
    document.body.classList.remove("archive-mode");
    closeMapTextToolbar();
    setMapEditorControlsVisible(false, false);
    setSidebarTitle("События");
    swapSidebarContent(renderTimelineSidebarButtons);
    refreshEditorActionButtons();
    setTimeout(() => setModeWord("Timeline", true), 120);
  }

  function setupArchiveScrollTracking() {
    if (archiveScrollObserver) {
      archiveScrollObserver.disconnect();
      archiveScrollObserver = null;
    }

    const sections = els.archiveGroupsContainer.querySelectorAll(".archive-group");
    if (!sections.length) return;

    // Наблюдатель синхронизирует активную кнопку в sidebar с наиболее видимой секцией архива.
    archiveScrollObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (!visible.length) return;

      const topGroupId = visible[0].target.dataset.archiveGroup;
      if (topGroupId) setActiveArchiveSidebarGroup(topGroupId);
    }, {
      root: els.archiveScrollContainer,
      threshold: [0.15, 0.5, 0.75],
      rootMargin: "-5% 0px -70% 0px",
    });

    sections.forEach((section) => archiveScrollObserver.observe(section));
  }

  function renderArchive() {
    els.archiveGroupsContainer.innerHTML = "";

    state.archiveData.forEach((group) => {
      const section = document.createElement("section");
      section.className = "archive-group";
      section.dataset.archiveGroup = group.id;

      const heading = document.createElement("h2");
      heading.className = "archive-group-title";
      heading.textContent = group.title || "Группа";
      heading.contentEditable = String(state.editMode);

      const cardsGrid = document.createElement("div");
      cardsGrid.className = "archive-cards";

      const sortedItems = [...(group.items || [])].sort((a, b) => {
        const left = typeof a.sortOrder === "number" ? a.sortOrder : Number.POSITIVE_INFINITY;
        const right = typeof b.sortOrder === "number" ? b.sortOrder : Number.POSITIVE_INFINITY;
        if (left !== right) return left - right;
        return String(a.id || "").localeCompare(String(b.id || ""));
      });

      sortedItems.forEach((item, itemIndex) => {
        const card = document.createElement("article");
        card.className = "archive-card";
        card.dataset.cardId = `${group.id}-${item.id || itemIndex}`;
        card.dataset.groupId = group.id;
        card.dataset.itemId = item.id || "";
        card.draggable = state.editMode;

        if (state.editMode) {
          const expandEditButton = document.createElement("button");
          expandEditButton.className = "archive-card-expand-edit";
          expandEditButton.type = "button";
          expandEditButton.textContent = "раскрыть";
          expandEditButton.addEventListener("click", (event) => {
            event.stopPropagation();
            openArchiveCardExpanded(section, card, item, group.id);
          });
          card.appendChild(expandEditButton);
        }

        const image = document.createElement("div");
        image.className = "archive-card-image";
        renderArchiveCardImage(image, item);
        if (state.editMode) {
          image.title = "Вставь/перетащи изображение. Двойной клик — изменить подпись.";
        }

        const title = document.createElement("h3");
        title.className = "archive-card-title";
        title.textContent = item.title || "Без названия";
        title.contentEditable = String(state.editMode);

        const text = document.createElement("p");
        text.className = "archive-card-text";
        text.textContent = item.description || "Описание пока не заполнено.";
        text.contentEditable = String(state.editMode);

        card.append(image, title, text);
        cardsGrid.appendChild(card);
      });

      section.append(heading, cardsGrid);
      els.archiveGroupsContainer.appendChild(section);
    });

    setupArchiveCardInteractions();
    setupArchiveScrollTracking();
  }

  function collapseExpandedCards() {
    // Централизованный "reset" состояния: важно вызывать перед переключением режима,
    // чтобы не оставлять наложенные expanded-карточки в DOM.
    els.archiveGroupsContainer.querySelectorAll(".archive-expanded").forEach((expanded) => expanded.remove());
    els.archiveGroupsContainer.querySelectorAll(".archive-card.expanded").forEach((card) => card.classList.remove("expanded"));
    els.archiveGroupsContainer.querySelectorAll(".archive-group.has-expanded").forEach((section) => section.classList.remove("has-expanded"));
    els.archiveGroupsContainer.querySelectorAll(".archive-cards.is-covered").forEach((grid) => grid.classList.remove("is-covered"));
    activeExpandedCardId = null;
  }

  function createExpandedCard(item, cardId) {
    const expanded = document.createElement("article");
    expanded.className = "archive-expanded";
    expanded.dataset.expandedFor = cardId;
    expanded.dataset.groupId = item.__groupId || "";
    expanded.dataset.itemId = item.id || "";

    const collapseButton = document.createElement("button");
    collapseButton.className = "archive-collapse";
    collapseButton.type = "button";
    collapseButton.title = "Свернуть";
    collapseButton.textContent = "↗";
    collapseButton.addEventListener("click", collapseExpandedCards);

    const title = document.createElement("h3");
    title.className = "archive-expanded-title";
    title.textContent = item.title || "Без названия";
    title.contentEditable = String(state.editMode);

    const text = document.createElement("p");
    text.className = "archive-expanded-text";
    text.textContent = item.fullDescription || item.description || "Подробное описание пока не добавлено.";
    text.contentEditable = String(state.editMode);

    expanded.append(collapseButton, title, text);
    return expanded;
  }

  function openArchiveCardExpanded(section, card, item, groupId) {
    const cardId = card.dataset.cardId;
    const shouldCollapse = activeExpandedCardId === cardId;
    collapseExpandedCards();
    if (shouldCollapse) return;

    const cardsGrid = card.closest(".archive-cards");
    section.classList.add("has-expanded");
    if (cardsGrid) cardsGrid.classList.add("is-covered");
    card.classList.add("expanded");
    const expanded = createExpandedCard({ ...item, __groupId: groupId }, cardId);
    section.insertBefore(expanded, cardsGrid || section.lastElementChild);
    activeExpandedCardId = cardId;
    expanded.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function setupArchiveCardInteractions() {
    const sectionNodes = els.archiveGroupsContainer.querySelectorAll(".archive-group");

    sectionNodes.forEach((section, groupIndex) => {
      const cards = section.querySelectorAll(".archive-card");
      cards.forEach((card, cardIndex) => {
        card.addEventListener("click", () => {
          if (state.editMode) return;
          const group = state.archiveData[groupIndex];
          const itemId = card.dataset.itemId;
          const item = group?.items?.find((entry) => entry.id === itemId) || group?.items?.[cardIndex];
          if (!item) return;
          openArchiveCardExpanded(section, card, item, group.id);
        });
      });
    });
  }

  function openArchiveMode() {
    state.timelineMode = false;
    state.archiveMode = true;
    setModeWord("Archive", true);
    setTopModeButton("Map");
    document.body.classList.remove("timeline-mode");
    document.body.classList.add("archive-mode");
    closeMapTextToolbar();
    setMapEditorControlsVisible(false, false);
    setSidebarTitle("Разделы");
    collapseExpandedCards();
    renderArchive();
    swapSidebarContent(renderArchiveSidebarButtons);
    refreshEditorActionButtons();
  }

  function openMapMode() {
    state.timelineMode = false;
    state.archiveMode = false;
    setModeWord("Map", true);
    setTopModeButton("Timeline");
    document.body.classList.remove("timeline-mode", "archive-mode");
    setSidebarTitle("Слои");
    collapseExpandedCards();
    swapSidebarContent(renderMapSidebarButtons);
    setMapEditorControlsVisible(state.editMode, state.drawMode);
    refreshEditorActionButtons();
  }

  function updatePanelFromMarker(marker) {
    state.currentMarker = marker;
    els.panelTitle.textContent = marker.title || "Без названия";
    els.panelSubtitle.textContent = marker.type || "Метка";
    updatePanelImageView(marker);
    els.panelText.textContent = marker.description || "Описание пока не добавлено.";
    els.fact1.textContent = marker.facts?.[0] || "—";
    els.fact2.textContent = marker.facts?.[1] || "—";
    els.fact3.textContent = marker.facts?.[2] || "—";
    togglePanel(true);
  }

  function setPanelEditable(enabled) {
    editablePanelFields.forEach((el) => {
      el.contentEditable = String(enabled);
    });
    els.timelineContainer.querySelectorAll(".event-year, .event-title, .event-text").forEach((el) => {
      el.contentEditable = String(enabled);
    });
    els.archiveGroupsContainer
      .querySelectorAll(".archive-group-title, .archive-card-title, .archive-card-text, .archive-expanded-title, .archive-expanded-text")
      .forEach((el) => {
        el.contentEditable = String(enabled);
      });
    els.panelImageControls.hidden = !enabled;
    setMapEditorControlsVisible(enabled && !state.timelineMode && !state.archiveMode, state.drawMode);
    refreshEditorActionButtons();
  }

  function savePanelToCurrentMarker() {
    if (!state.editMode || !state.currentMarker) return;
    // Панель редактирует текущий объект напрямую — модель и UI остаются консистентны без промежуточного буфера.
    state.currentMarker.title = els.panelTitle.textContent.trim();
    state.currentMarker.type = els.panelSubtitle.textContent.trim();
    state.currentMarker.imageUrl = els.panelImageUrlInput.value.trim();
    state.currentMarker.imageText = els.panelImageCaption.textContent.trim();
    state.currentMarker.description = els.panelText.textContent.trim();
    state.currentMarker.facts = [els.fact1.textContent.trim(), els.fact2.textContent.trim(), els.fact3.textContent.trim()];
    if (state.currentMarker.id) recordChange("marker", state.currentMarker.id, state.currentMarker);
  }

  function renderTimeline() {
    els.timelineContainer.innerHTML = "";
    normalizeTimelineOrderByDate();
    state.eventsData.forEach((event) => {
      const item = document.createElement("div");
      item.className = "timeline-event-item";

      const card = document.createElement("article");
      card.className = "event-card";

      const year = document.createElement("div");
      year.className = "event-year";
      year.textContent = event.year || "";
      year.contentEditable = String(state.editMode);

      const title = document.createElement("h3");
      title.className = "event-title";
      title.textContent = event.title || "Без названия";
      title.contentEditable = String(state.editMode);

      const text = document.createElement("p");
      text.className = "event-text";
      text.textContent = event.description || "";
      text.contentEditable = String(state.editMode);

      card.dataset.eventId = event.id || "";

      const dot = document.createElement("div");
      dot.className = "event-dot";

      const dotDate = document.createElement("div");
      dotDate.className = "event-timeline-date";
      dotDate.textContent = event.year || "";

      card.append(year, title, text);
      item.append(card, dot, dotDate);
      els.timelineContainer.appendChild(item);
    });
  }

  function setupInlineEditingInteractions() {
    els.timelineContainer.addEventListener("input", (event) => {
      if (!state.editMode) return;
      const target = event.target;
      if (!editableTimelineFields.some((className) => target.classList.contains(className))) return;

      const card = target.closest(".event-card");
      const eventId = card?.dataset?.eventId;
      if (!eventId) return;

      const timelineEvent = state.eventsData.find((entry) => entry.id === eventId);
      if (!timelineEvent) return;

      if (target.classList.contains("event-year")) timelineEvent.year = target.textContent.trim();
      if (target.classList.contains("event-title")) timelineEvent.title = target.textContent.trim();
      if (target.classList.contains("event-text")) timelineEvent.description = target.textContent.trim();

      if (target.classList.contains("event-year")) {
        const item = card.closest(".timeline-event-item");
        const timelineDate = item?.querySelector(".event-timeline-date");
        if (timelineDate) timelineDate.textContent = timelineEvent.year || "";
      }

      recordChange("timelineEvent", timelineEvent.id, timelineEvent);
    });

    els.timelineContainer.addEventListener("focusout", (event) => {
      if (!state.editMode) return;
      const target = event.target;
      if (!target.classList?.contains("event-year")) return;
      normalizeTimelineOrderByDate();
      renderTimeline();
    });

    els.archiveGroupsContainer.addEventListener("input", (event) => {
      if (!state.editMode) return;
      const target = event.target;
      if (!editableArchiveFields.some((className) => target.classList.contains(className))) return;

      if (target.classList.contains("archive-group-title")) {
        const section = target.closest(".archive-group");
        const groupId = section?.dataset?.archiveGroup;
        if (!groupId) return;
        const group = state.archiveData.find((entry) => entry.id === groupId);
        if (!group) return;
        group.title = target.textContent.trim();
        const relatedSidebarButton = els.toolButtonsContainer.querySelector(`[data-archive-group="${group.id}"]`);
        if (relatedSidebarButton) {
          relatedSidebarButton.title = group.title;
          relatedSidebarButton.textContent = getArchiveShortLabel(group.title);
        }
        recordChange("archiveGroup", group.id, group);
        return;
      }

      const card = target.closest(".archive-card");
      if (card) {
        const groupId = card.dataset.groupId;
        const itemId = card.dataset.itemId;
        const group = state.archiveData.find((entry) => entry.id === groupId);
        const item = group?.items?.find((entry) => entry.id === itemId);
        if (!group || !item) return;

        if (target.classList.contains("archive-card-title")) item.title = target.textContent.trim();
        if (target.classList.contains("archive-card-text")) item.description = target.textContent.trim();

        recordChange("archiveItem", item.id, item, { groupId: group.id });
        return;
      }

      const expanded = target.closest(".archive-expanded");
      if (!expanded) return;
      const groupId = expanded.dataset.groupId;
      const itemId = expanded.dataset.itemId;
      const group = state.archiveData.find((entry) => entry.id === groupId);
      const item = group?.items?.find((entry) => entry.id === itemId);
      if (!group || !item) return;

      if (target.classList.contains("archive-expanded-title")) item.title = target.textContent.trim();
      if (target.classList.contains("archive-expanded-text")) item.fullDescription = target.textContent.trim();

      recordChange("archiveItem", item.id, item, { groupId: group.id });
    });

    const archiveImageFileInput = document.createElement("input");
    archiveImageFileInput.type = "file";
    archiveImageFileInput.accept = "image/*";
    archiveImageFileInput.hidden = true;
    document.body.appendChild(archiveImageFileInput);
    let activeArchiveImageTarget = null;

    const resolveArchiveImageItem = (target) => {
      const imageNode = target?.closest?.(".archive-card-image");
      const card = target?.closest?.(".archive-card");
      if (!imageNode || !card) return null;
      const group = state.archiveData.find((entry) => entry.id === card.dataset.groupId);
      const item = group?.items?.find((entry) => entry.id === card.dataset.itemId);
      if (!group || !item) return null;
      return { imageNode, group, item };
    };

    const applyArchiveImageFile = async (file, imageNode, group, item) => {
      if (!file || !state.editMode || !file.type?.startsWith("image/")) return;
      try {
        ensureArchiveImageVariants(item);
        const variantKey = getArchiveImageVariantKey();
        item.imageVariants[variantKey] = await readFileToDataUrl(file);
        renderArchiveCardImage(imageNode, item);
        recordChange("archiveItem", item.id, item, { groupId: group.id });
      } catch (error) {
        console.error(error);
      }
    };

    els.archiveGroupsContainer.addEventListener("dblclick", (event) => {
      if (!state.editMode) return;
      const resolved = resolveArchiveImageItem(event.target);
      if (!resolved) return;
      event.preventDefault();
      const nextLabel = window.prompt("Подпись изображения", resolved.item.imageLabel || "Изображение");
      if (nextLabel == null) return;
      resolved.item.imageLabel = nextLabel.trim() || "Изображение";
      renderArchiveCardImage(resolved.imageNode, resolved.item);
      recordChange("archiveItem", resolved.item.id, resolved.item, { groupId: resolved.group.id });
    });

    els.archiveGroupsContainer.addEventListener("click", (event) => {
      if (!state.editMode) return;
      const resolved = resolveArchiveImageItem(event.target);
      if (!resolved) return;
      activeArchiveImageTarget = resolved;
      archiveImageFileInput.click();
    });

    archiveImageFileInput.addEventListener("change", async (event) => {
      const [file] = Array.from(event.target.files || []);
      if (file && activeArchiveImageTarget) {
        await applyArchiveImageFile(
          file,
          activeArchiveImageTarget.imageNode,
          activeArchiveImageTarget.group,
          activeArchiveImageTarget.item,
        );
      }
      archiveImageFileInput.value = "";
      activeArchiveImageTarget = null;
    });

    els.archiveGroupsContainer.addEventListener("paste", async (event) => {
      if (!state.editMode) return;
      const resolved = resolveArchiveImageItem(event.target);
      if (!resolved) return;
      const imageItem = Array.from(event.clipboardData?.items || []).find((item) => item.type.startsWith("image/"));
      const file = imageItem?.getAsFile();
      if (!file) return;
      event.preventDefault();
      await applyArchiveImageFile(file, resolved.imageNode, resolved.group, resolved.item);
    });

    els.archiveGroupsContainer.addEventListener("dragstart", (event) => {
      if (!state.editMode) return;
      const card = event.target.closest(".archive-card");
      if (!card) return;
      dragArchiveCardMeta = {
        groupId: card.dataset.groupId,
        itemId: card.dataset.itemId,
      };
      card.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `${dragArchiveCardMeta.groupId}:${dragArchiveCardMeta.itemId}`);
    });

    els.archiveGroupsContainer.addEventListener("dragend", (event) => {
      const card = event.target.closest(".archive-card");
      if (card) card.classList.remove("dragging");
      dragArchiveCardMeta = null;
    });

    els.archiveGroupsContainer.addEventListener("dragover", (event) => {
      if (!state.editMode) return;

      const resolved = resolveArchiveImageItem(event.target);
      if (resolved && !dragArchiveCardMeta) {
        event.preventDefault();
        resolved.imageNode.classList.add("is-drop-target");
        event.dataTransfer.dropEffect = "copy";
        return;
      }

      if (!dragArchiveCardMeta) return;
      if (!event.target.closest(".archive-card")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });

    els.archiveGroupsContainer.addEventListener("dragleave", (event) => {
      const imageNode = event.target?.closest?.(".archive-card-image");
      if (!imageNode) return;
      imageNode.classList.remove("is-drop-target");
    });

    els.archiveGroupsContainer.addEventListener("drop", async (event) => {
      if (!state.editMode) return;

      const resolved = resolveArchiveImageItem(event.target);
      if (resolved && !dragArchiveCardMeta) {
        const [file] = Array.from(event.dataTransfer?.files || []);
        if (!file) return;
        event.preventDefault();
        resolved.imageNode.classList.remove("is-drop-target");
        await applyArchiveImageFile(file, resolved.imageNode, resolved.group, resolved.item);
        return;
      }

      if (!dragArchiveCardMeta) return;
      const targetCard = event.target.closest(".archive-card");
      if (!targetCard) return;
      event.preventDefault();

      const sourceGroup = state.archiveData.find((group) => group.id === dragArchiveCardMeta.groupId);
      const targetGroup = state.archiveData.find((group) => group.id === targetCard.dataset.groupId);
      if (!sourceGroup || !targetGroup) return;
      sourceGroup.items = Array.isArray(sourceGroup.items) ? sourceGroup.items : [];
      targetGroup.items = Array.isArray(targetGroup.items) ? targetGroup.items : [];

      const sourceIndex = sourceGroup.items.findIndex((item) => item.id === dragArchiveCardMeta.itemId);
      const targetIndex = targetGroup.items.findIndex((item) => item.id === targetCard.dataset.itemId);
      if (sourceIndex < 0 || targetIndex < 0) return;

      const [movedItem] = sourceGroup.items.splice(sourceIndex, 1);
      targetGroup.items.splice(targetIndex, 0, movedItem);

      sourceGroup.items.forEach((item, index) => {
        item.sortOrder = index;
        recordChange("archiveItem", item.id, item, { groupId: sourceGroup.id });
      });
      if (sourceGroup.id !== targetGroup.id) {
        targetGroup.items.forEach((item, index) => {
          item.sortOrder = index;
          recordChange("archiveItem", item.id, item, { groupId: targetGroup.id });
        });
      }

      renderArchive();
    });
  }

  function setupPanelImageInteractions() {
    const commitCurrentMarkerImage = () => {
      if (!state.editMode || !state.currentMarker) return;
      state.currentMarker.imageUrl = els.panelImageUrlInput.value.trim();
      state.currentMarker.imageText = els.panelImageCaption.textContent.trim();
      recordChange("marker", state.currentMarker.id, state.currentMarker);
      updatePanelImageView(state.currentMarker);
    };

    els.applyImageUrlButton.addEventListener("click", commitCurrentMarkerImage);

    els.panelImageUrlInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      commitCurrentMarkerImage();
    });

    const applyFile = async (file) => {
      if (!file || !state.editMode || !state.currentMarker) return;
      if (!file.type.startsWith("image/")) return;
      try {
        const dataUrl = await readFileToDataUrl(file);
        els.panelImageUrlInput.value = dataUrl;
        state.currentMarker.imageAssetSuggestedPath = getSuggestedAssetPath(file.name);
        els.panelImageHint.textContent = `Файл вставлен как data URL. Рекомендуемый путь ассета: ${state.currentMarker.imageAssetSuggestedPath}`;
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
  }

  function setupMapViewSwitcher() {
    if (!els.mapViewSwitcher) return;
    els.mapViewSwitcher.addEventListener("click", (event) => {
      const button = event.target.closest("[data-map-view]");
      if (!button) return;
      setMapDisplayMode(button.dataset.mapView);
    });
  }

  function setupMapTextToolbarInteractions() {
    els.mapTextFontSelect.addEventListener("change", () => {
      mapEditorCallbacks.onTextStyleChange({ fontFamily: els.mapTextFontSelect.value });
    });
    els.mapTextSizeInput.addEventListener("input", () => {
      mapEditorCallbacks.onTextStyleChange({ fontSize: Number(els.mapTextSizeInput.value) || 36 });
    });
    els.mapTextColorInput.addEventListener("input", () => {
      mapEditorCallbacks.onTextStyleChange({ color: els.mapTextColorInput.value });
    });
    els.mapTextRotateInput.addEventListener("input", () => {
      mapEditorCallbacks.onTextStyleChange({ rotation: Number(els.mapTextRotateInput.value) || 0 });
    });
    els.mapTextBoldButton.addEventListener("click", () => {
      const next = !els.mapTextBoldButton.classList.contains("active");
      els.mapTextBoldButton.classList.toggle("active", next);
      mapEditorCallbacks.onTextStyleChange({ bold: next });
    });
    els.mapTextItalicButton.addEventListener("click", () => {
      const next = !els.mapTextItalicButton.classList.contains("active");
      els.mapTextItalicButton.classList.toggle("active", next);
      mapEditorCallbacks.onTextStyleChange({ italic: next });
    });

    els.drawBrushColorSelect.addEventListener("change", () => {
      mapEditorCallbacks.onBrushChange({ color: els.drawBrushColorSelect.value });
    });
    els.drawBrushSizeInput.addEventListener("input", () => {
      mapEditorCallbacks.onBrushChange({ size: Number(els.drawBrushSizeInput.value) || 2 });
    });

    document.addEventListener("click", (event) => {
      if (els.mapTextToolbar.hidden) return;
      if (els.mapTextToolbar.contains(event.target)) return;
      if (event.target.closest(".region-label")) return;
      closeMapTextToolbar();
    });
  }

  function setupDrawBrushPalette() {
    const paletteOptions = [
      { value: "#7dd3fc", label: "Ледяной" },
      { value: "#60a5fa", label: "Синий" },
      { value: "#fca5a5", label: "Алый" },
      { value: "#fbbf24", label: "Золотой" },
      { value: "#86efac", label: "Зелёный" },
      { value: "#c4b5fd", label: "Фиалковый" },
      { value: "#f9fafb", label: "Светлый" },
    ];
    els.drawBrushColorSelect.innerHTML = "";
    paletteOptions.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.value;
      option.textContent = entry.label;
      els.drawBrushColorSelect.appendChild(option);
    });
    els.drawBrushColorSelect.value = state.drawBrushColor || paletteOptions[0].value;
    els.drawBrushSizeInput.value = String(state.drawBrushSize || 2);
  }

  function setupPaletteEditorInteractions() {
    els.addPaletteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      createCustomPaletteFromCurrent();
    });
  }

  setupMapViewSwitcher();
  setMapDisplayMode(state.mapViewMode || "author", { rerenderArchive: false });
  setupPanelImageInteractions();
  setupMapTextToolbarInteractions();
  setupDrawBrushPalette();
  setupPaletteEditorInteractions();
  setupEditorActionButtons();
  setupInlineEditingInteractions();

  return {
    setSidebarRenderers,
    setupMapEditorCallbacks,
    setChangeRecorder,
    setPalette,
    togglePalettePopover,
    togglePanel,
    setModeWord,
    setMapDisplayMode,
    openTimelineMode,
    openArchiveMode,
    openMapMode,
    openMapTextToolbar,
    closeMapTextToolbar,
    setMapEditorControlsVisible,
    updatePanelFromMarker,
    setPanelEditable,
    savePanelToCurrentMarker,
    renderTimeline,
    renderArchive,
  };
}
