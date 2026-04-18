import {
  findTimelineAct,
  getTimelineActSummary,
  getTimelineActTitle,
  getTimelineEventsForAct,
} from "../timelineModel.js";
import { getLocalizedText } from "../localization.js";
import { getUiText } from "../uiLocale.js";

export function createTimelineActsController({
  els,
  state,
  readFileToDataUrl,
  getChangeRecorder,
  navigateToEntity,
  renderTimeline,
  renderTimelineSidebarButtons,
  updatePanelFromTimelineEvent,
}) {
  function getVisibleTimelineEvents() {
    return getTimelineEventsForAct(state.eventsData, state.currentTimelineActId);
  }

  function getCurrentTimelineAct() {
    return findTimelineAct(state.timelineActsData, state.currentTimelineActId);
  }

  function renderTimelineActBackdrop() {
    const activeAct = getCurrentTimelineAct();
    const imageUrl = typeof activeAct?.backgroundImageUrl === "string"
      ? activeAct.backgroundImageUrl.trim()
      : "";

    if (els.timelineActImageButton) {
      els.timelineActImageButton.hidden = !(state.editMode && state.timelineMode && activeAct);
      if (!els.timelineActImageButton.hidden) {
        els.timelineActImageButton.textContent = imageUrl ? "Обновить фон" : "+ Фон акта";
      }
    }

    if (!els.timelineActBackdrop) return;
    if (!imageUrl) {
      els.timelineActBackdrop.hidden = true;
      els.timelineActBackdrop.style.backgroundImage = "none";
      return;
    }

    els.timelineActBackdrop.hidden = false;
    els.timelineActBackdrop.style.backgroundImage = `url("${imageUrl.replace(/"/g, "\\\"")}")`;
  }

  async function applyTimelineActBackdropFile(file) {
    const activeAct = getCurrentTimelineAct();
    if (!file || !activeAct || !state.editMode) return;
    if (!file.type.startsWith("image/")) return;

    try {
      const dataUrl = await readFileToDataUrl(file);
      activeAct.backgroundImageUrl = dataUrl;
      getChangeRecorder().upsert("timelineAct", activeAct.id, activeAct);
      renderTimelineActBackdrop();
    } catch (error) {
      console.error(error);
    }
  }

  function activateTimelineAct(actId = "") {
    state.currentTimelineActId = String(actId || "").trim();
    if (!getVisibleTimelineEvents().some((event) => event.id === state.currentTimelineEventId)) {
      state.currentTimelineEventId = null;
      state.currentTimelineEvent = null;
    }
    renderTimeline();
    if (state.timelineMode) {
      renderTimelineSidebarButtons();
    }
  }

  function renderTimelineActTabs() {
    if (!els.timelineActsBar) return;

    const defaultSubtitle = getUiText(state, "timeline_subtitle");
    const activeAct = getCurrentTimelineAct();
    const actSummary = activeAct ? getTimelineActSummary(activeAct, state, "") : "";
    const actTitle = activeAct ? getTimelineActTitle(activeAct, state, getUiText(state, "mode_timeline")) : "";
    els.timelineSubtitle.textContent = activeAct
      ? (actSummary || getUiText(state, "timeline_act_subtitle", { title: actTitle }))
      : defaultSubtitle;

    els.timelineActsBar.innerHTML = "";

    const overviewButton = document.createElement("button");
    overviewButton.className = `timeline-act-button ${state.currentTimelineActId ? "" : "active"}`.trim();
    overviewButton.type = "button";
    overviewButton.textContent = getUiText(state, "timeline_overview");
    overviewButton.title = defaultSubtitle;
    overviewButton.addEventListener("click", () => activateTimelineAct(""));
    els.timelineActsBar.appendChild(overviewButton);

    state.timelineActsData.forEach((act, index) => {
      const title = getTimelineActTitle(act, state, getUiText(state, "timeline_act_label", { index: index + 1 }));
      const button = document.createElement("button");
      button.className = `timeline-act-button ${act.id === state.currentTimelineActId ? "active" : ""}`.trim();
      button.type = "button";
      button.textContent = title;
      button.title = getTimelineActSummary(act, state, title) || title;
      button.addEventListener("click", () => activateTimelineAct(act.id));
      els.timelineActsBar.appendChild(button);
    });

    if (els.addTimelineActButton) {
      els.addTimelineActButton.hidden = !(state.editMode && state.timelineMode);
    }
    if (els.editTimelineActButton) {
      els.editTimelineActButton.hidden = !(state.editMode && state.timelineMode && activeAct);
    }
    if (els.deleteTimelineActButton) {
      els.deleteTimelineActButton.hidden = !(state.editMode && state.timelineMode && activeAct);
    }

    renderTimelineActBackdrop();
  }

  function handleTimelineMarkerLink(eventId) {
    const timelineEvent = state.eventsData.find((entry) => entry.id === eventId);
    if (!timelineEvent) return;

    if (!state.editMode) {
      if (!timelineEvent.markerId) return;
      navigateToEntity({ type: "marker", id: timelineEvent.markerId });
      return;
    }

    const candidates = (state.markersData || []).filter((entry) => entry?.id);
    if (!candidates.length) {
      window.alert("Сначала добавь хотя бы одну метку на карте.");
      return;
    }

    const list = [
      "0. Убрать связь",
      ...candidates.map((marker, index) => `${index + 1}. ${getLocalizedText(marker, "title", state, getUiText(state, "marker_untitled"))}`),
    ].join("\n");
    const selectedRaw = window.prompt(
      `Какую метку карты привязать к этому событию?\n${list}`,
      timelineEvent.markerId ? "0" : "1",
    );
    if (selectedRaw == null) return;

    if (selectedRaw.trim() === "0") {
      timelineEvent.markerId = "";
    } else {
      const selected = candidates[Number(selectedRaw) - 1];
      if (!selected) return;
      timelineEvent.markerId = selected.id;
    }

    getChangeRecorder().upsert("timelineEvent", timelineEvent.id, timelineEvent);
    renderTimeline();
    if (state.timelineMode) renderTimelineSidebarButtons();
    if (state.currentPanelEntity?.entity === "timelineEvent" && state.currentTimelineEventId === timelineEvent.id) {
      updatePanelFromTimelineEvent(timelineEvent);
    }
  }

  function setup() {
    els.timelineActImageButton?.addEventListener("click", () => {
      if (els.timelineActImageButton.hidden) return;
      els.timelineActImageInput.click();
    });

    els.timelineActImageInput?.addEventListener("change", async (event) => {
      const [file] = Array.from(event.target.files || []);
      await applyTimelineActBackdropFile(file);
      els.timelineActImageInput.value = "";
    });
  }

  return {
    getVisibleTimelineEvents,
    getCurrentTimelineAct,
    renderTimelineActBackdrop,
    renderTimelineActTabs,
    handleTimelineMarkerLink,
    setup,
  };
}
