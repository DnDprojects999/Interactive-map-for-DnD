export function createUI(els, state) {
  let renderMapSidebarButtons = () => {};
  let recordChange = () => {};
  let activeExpandedCardId = null;
  let archiveScrollObserver = null;
  const editablePanelFields = [els.panelTitle, els.panelSubtitle, els.panelText, els.fact1, els.fact2, els.fact3];

  function setSidebarRenderers({ mapButtonsRenderer }) {
    renderMapSidebarButtons = typeof mapButtonsRenderer === "function" ? mapButtonsRenderer : () => {};
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
    if (palette === "night") document.body.classList.add("palette-night");
    if (palette === "frost") document.body.classList.add("palette-frost");

    const paletteOptions = els.palettePopover?.querySelectorAll(".palette-option") || [];
    paletteOptions.forEach((option) => {
      option.classList.toggle("active", option.dataset.paletteValue === palette);
    });
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

  function openTimelineMode() {
    state.timelineMode = true;
    state.archiveMode = false;
    setModeWord("Timeline", false);
    setTopModeButton("Timeline");
    document.body.classList.add("timeline-mode");
    document.body.classList.remove("archive-mode");
    setSidebarTitle("События");
    swapSidebarContent(renderTimelineSidebarButtons);
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

      const cardsGrid = document.createElement("div");
      cardsGrid.className = "archive-cards";

      (group.items || []).forEach((item, itemIndex) => {
        const card = document.createElement("article");
        card.className = "archive-card";
        card.dataset.cardId = `${group.id}-${item.id || itemIndex}`;

        const image = document.createElement("div");
        image.className = "archive-card-image";
        image.textContent = item.imageLabel || "Изображение";

        const title = document.createElement("h3");
        title.className = "archive-card-title";
        title.textContent = item.title || "Без названия";

        const text = document.createElement("p");
        text.className = "archive-card-text";
        text.textContent = item.description || "Описание пока не заполнено.";

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

    const collapseButton = document.createElement("button");
    collapseButton.className = "archive-collapse";
    collapseButton.type = "button";
    collapseButton.title = "Свернуть";
    collapseButton.textContent = "↗";
    collapseButton.addEventListener("click", collapseExpandedCards);

    const title = document.createElement("h3");
    title.className = "archive-expanded-title";
    title.textContent = item.title || "Без названия";

    const text = document.createElement("p");
    text.className = "archive-expanded-text";
    text.textContent = item.fullDescription || item.description || "Подробное описание пока не добавлено.";

    expanded.append(collapseButton, title, text);
    return expanded;
  }

  function setupArchiveCardInteractions() {
    const sectionNodes = els.archiveGroupsContainer.querySelectorAll(".archive-group");

    sectionNodes.forEach((section, groupIndex) => {
      const cards = section.querySelectorAll(".archive-card");
      cards.forEach((card, cardIndex) => {
        card.addEventListener("click", () => {
          const group = state.archiveData[groupIndex];
          const item = group?.items?.[cardIndex];
          if (!item) return;

          const cardId = card.dataset.cardId;
          const shouldCollapse = activeExpandedCardId === cardId;
          collapseExpandedCards();
          if (shouldCollapse) return;

          const cardsGrid = card.closest(".archive-cards");
          section.classList.add("has-expanded");
          if (cardsGrid) cardsGrid.classList.add("is-covered");
          card.classList.add("expanded");
          const expanded = createExpandedCard(item, cardId);
          section.insertBefore(expanded, cardsGrid || section.lastElementChild);
          activeExpandedCardId = cardId;
          expanded.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
    setSidebarTitle("Разделы");
    collapseExpandedCards();
    renderArchive();
    swapSidebarContent(renderArchiveSidebarButtons);
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
  }

  function updatePanelFromMarker(marker) {
    state.currentMarker = marker;
    els.panelTitle.textContent = marker.title || "Без названия";
    els.panelSubtitle.textContent = marker.type || "Метка";
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
  }

  function savePanelToCurrentMarker() {
    if (!state.editMode || !state.currentMarker) return;
    // Панель редактирует текущий объект напрямую — модель и UI остаются консистентны без промежуточного буфера.
    state.currentMarker.title = els.panelTitle.textContent.trim();
    state.currentMarker.type = els.panelSubtitle.textContent.trim();
    state.currentMarker.description = els.panelText.textContent.trim();
    state.currentMarker.facts = [els.fact1.textContent.trim(), els.fact2.textContent.trim(), els.fact3.textContent.trim()];
    if (state.currentMarker.id) recordChange("marker", state.currentMarker.id, state.currentMarker);
  }

  function renderTimeline() {
    els.timelineContainer.innerHTML = "";
    state.eventsData.forEach((event) => {
      const item = document.createElement("div");
      item.className = "timeline-event-item";

      const card = document.createElement("article");
      card.className = "event-card";

      const year = document.createElement("div");
      year.className = "event-year";
      year.textContent = event.year || "";

      const title = document.createElement("h3");
      title.className = "event-title";
      title.textContent = event.title || "Без названия";

      const text = document.createElement("p");
      text.className = "event-text";
      text.textContent = event.description || "";

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

  return {
    setSidebarRenderers,
    setChangeRecorder,
    setPalette,
    togglePalettePopover,
    togglePanel,
    setModeWord,
    openTimelineMode,
    openArchiveMode,
    openMapMode,
    updatePanelFromMarker,
    setPanelEditable,
    savePanelToCurrentMarker,
    renderTimeline,
    renderArchive,
  };
}
