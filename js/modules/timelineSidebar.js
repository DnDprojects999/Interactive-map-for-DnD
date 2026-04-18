import {
  DEFAULT_TIMELINE_SHORTCUTS,
  getDefaultTimelineShortcutLabel,
  getTimelineEventsForAct,
  getTimelineSidebarActions,
} from "./timelineModel.js";

export function createTimelineSidebarController(options) {
  const {
    els,
    state,
    getChangeRecorder,
    renderTimeline,
  } = options;

  const getRecorder = () => getChangeRecorder?.() || { upsert: () => {}, remove: () => {} };

  // Timeline sidebar buttons are "jump points" into the horizontal timeline.
  function scrollToEvent(eventId) {
    const eventCard = els.timelineContainer.querySelector(`[data-event-id="${eventId}"]`);
    if (!eventCard) return;
    const eventItem = eventCard.closest(".timeline-event-item") || eventCard;
    eventItem.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function setShortcut(eventId, label) {
    if (!state.editMode) return;
    const event = state.eventsData.find((entry) => entry.id === eventId);
    if (!event) return;

    event.sidebarShortcut = true;
    event.sidebarShortcutLabel = (label?.trim?.() || getDefaultTimelineShortcutLabel(event)).slice(0, 8);
    getRecorder().upsert("timelineEvent", event.id, event);
    renderTimeline();
    if (state.timelineMode) renderButtons();
  }

  // Editors can add shortcuts only from events currently visible in the active
  // act, which keeps each act's sidebar focused.
  function addShortcut() {
    if (!state.editMode) return;
    const visibleEvents = getTimelineEventsForAct(state.eventsData, state.currentTimelineActId);
    const shortcutEventIds = new Set(getTimelineSidebarActions(visibleEvents).map((action) => action.eventId));
    const candidates = visibleEvents.filter((event) => event?.id && !shortcutEventIds.has(event.id));

    if (candidates.length === 0) {
      window.alert("Все события уже есть в левой панели.");
      return;
    }

    const list = candidates
      .map((event, index) => `${index + 1}. ${event.year || "?"} - ${event.title || "Без названия"}`)
      .join("\n");
    const selectedRaw = window.prompt(`Какое событие добавить в контрольные точки?\n${list}`, "1");
    if (!selectedRaw) return;

    const selectedEvent = candidates[Number(selectedRaw) - 1];
    if (!selectedEvent) return;

    const defaultLabel = getDefaultTimelineShortcutLabel(selectedEvent);
    const label = window.prompt("Подпись кнопки в левой панели", defaultLabel);
    if (label == null) return;
    setShortcut(selectedEvent.id, label);
  }

  function editShortcut(action) {
    if (!state.editMode || action?.isDefault) return;
    const event = state.eventsData.find((entry) => entry.id === action.eventId);
    if (!event) return;

    const command = window.prompt("Новая подпись или '-' чтобы убрать точку", action.label || getDefaultTimelineShortcutLabel(event));
    if (command == null) return;

    if (command.trim() === "-") {
      event.sidebarShortcut = false;
      event.sidebarShortcutLabel = "";
      getRecorder().upsert("timelineEvent", event.id, event);
      renderTimeline();
      if (state.timelineMode) renderButtons();
      return;
    }

    setShortcut(event.id, command);
  }

  function renderButtons() {
    // The sidebar is rebuilt from current act data every time because available
    // shortcuts change when acts switch or events are edited.
    els.toolButtonsContainer.innerHTML = "";

    const actions = getTimelineSidebarActions(getTimelineEventsForAct(state.eventsData, state.currentTimelineActId));
    actions.forEach((action) => {
      const button = document.createElement("button");
      button.className = `tool-btn active timeline-shortcut ${state.editMode && !action.isDefault ? "timeline-shortcut-editable" : ""}`;
      button.dataset.label = action.title;
      button.textContent = action.label;
      button.title = state.editMode && !action.isDefault
        ? `${action.title}\nПравый клик: переименовать или убрать`
        : action.title;
      button.addEventListener("click", () => scrollToEvent(action.eventId));
      button.addEventListener("contextmenu", (event) => {
        if (!state.editMode || action.isDefault) return;
        event.preventDefault();
        editShortcut(action);
      });
      button.addEventListener("dblclick", (event) => {
        if (!state.editMode || action.isDefault) return;
        event.preventDefault();
        editShortcut(action);
      });
      els.toolButtonsContainer.appendChild(button);
    });

    if (state.editMode) {
      const addButton = document.createElement("button");
      addButton.className = "tool-btn timeline-shortcut-add";
      addButton.dataset.label = "Добавить контрольную точку";
      addButton.textContent = "+";
      addButton.title = "Добавить контрольную точку таймлайна";
      addButton.addEventListener("click", addShortcut);
      els.toolButtonsContainer.appendChild(addButton);
    }
  }

  function toggleShortcut(eventId) {
    if (!state.editMode) return;

    const event = state.eventsData.find((entry) => entry.id === eventId);
    if (!event) return;
    if (DEFAULT_TIMELINE_SHORTCUTS.some((entry) => entry.eventId === eventId)) return;

    if (event.sidebarShortcut) {
      event.sidebarShortcut = false;
      event.sidebarShortcutLabel = "";
    } else {
      const defaultLabel = getDefaultTimelineShortcutLabel(event);
      const nextLabel = window.prompt("Подпись быстрой точки", defaultLabel);
      if (nextLabel == null) return;
      event.sidebarShortcut = true;
      event.sidebarShortcutLabel = (nextLabel.trim() || defaultLabel).slice(0, 8);
    }

    getRecorder().upsert("timelineEvent", event.id, event);
    renderTimeline();
    if (state.timelineMode) renderButtons();
  }

  return {
    renderButtons,
    toggleShortcut,
  };
}
