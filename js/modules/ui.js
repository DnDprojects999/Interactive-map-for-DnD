export function createUI(els, state) {
  function setSlide(index) {
    state.currentSlide = index;
    els.slides.style.transform = `translateX(-${index * 100}%)`;
  }

  function setStyleMode(index) {
    state.currentStyleMode = index;
    const maxX = els.styleSwitch.clientWidth - els.styleHandle.clientWidth - 8;
    els.styleHandle.style.transform = `translateX(${index === 1 ? maxX : 0}px)`;

    els.mapStage.classList.toggle("sketch-mode", index === 0);
    els.mapStage.classList.toggle("art-mode", index === 1);
    els.mapCaption.textContent = index === 0 ? "Сейчас включён режим: скетч" : "Сейчас включён режим: арт";
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

  function openTimelineMode() {
    state.timelineMode = true;
    setModeWord("Timeline", false);
    document.body.classList.add("timeline-mode");
    setSlide(1);
    setTimeout(() => setModeWord("Timeline", true), 160);
  }

  function openMapMode() {
    state.timelineMode = false;
    setModeWord("Map", false);
    document.body.classList.remove("timeline-mode");
    setSlide(0);
    setTimeout(() => setModeWord("", false), 160);
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
    [els.panelTitle, els.panelSubtitle, els.panelText, els.fact1, els.fact2, els.fact3].forEach((el) => {
      el.contentEditable = String(enabled);
    });
  }

  function savePanelToCurrentMarker() {
    if (!state.editMode || !state.currentMarker) return;
    state.currentMarker.title = els.panelTitle.textContent.trim();
    state.currentMarker.type = els.panelSubtitle.textContent.trim();
    state.currentMarker.description = els.panelText.textContent.trim();
    state.currentMarker.facts = [els.fact1.textContent.trim(), els.fact2.textContent.trim(), els.fact3.textContent.trim()];
  }

  function renderTimeline() {
    els.timelineContainer.innerHTML = "";
    state.eventsData.forEach((event) => {
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

      card.append(year, title, text);
      els.timelineContainer.appendChild(card);
    });
  }

  return {
    setSlide,
    setStyleMode,
    togglePanel,
    setModeWord,
    openTimelineMode,
    openMapMode,
    updatePanelFromMarker,
    setPanelEditable,
    savePanelToCurrentMarker,
    renderTimeline,
  };
}
