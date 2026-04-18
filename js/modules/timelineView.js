import {
  DEFAULT_TIMELINE_SHORTCUTS,
  applyTimelineEventLayout,
  findTimelineAct,
  getTimelineActShortLabel,
  getTimelineActTitle,
} from "./timelineModel.js";
import { getLocalizedText } from "./localization.js";

// DOM factory helpers for timeline rendering. They keep the render code in ui.js
// focused on flow control instead of hand-building every element inline.
export function createTimelineAxisSvg() {
  const axisSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  axisSvg.setAttribute("class", "timeline-axis-svg");
  axisSvg.setAttribute("aria-hidden", "true");
  axisSvg.setAttribute("focusable", "false");
  return axisSvg;
}

export function createTimelineEventItem(event, options = {}) {
  const {
    editMode = false,
    localizationContext = null,
    actsData = [],
    onToggleShortcut = () => {},
    onTogglePosition = () => {},
    onDelete = () => {},
    onActivateMarkerLink = () => {},
    onAssignAct = () => {},
  } = options;

  // Each timeline item owns both the content card and the axis marker below it.
  const item = document.createElement("div");
  item.className = `timeline-event-item timeline-event-${event.position === "down" ? "down" : "up"}`;
  item.dataset.eventId = event.id || "";
  applyTimelineEventLayout(item, event);

  const card = document.createElement("article");
  card.className = "event-card";
  card.dataset.eventId = event.id || "";

  const actions = createTimelineEventActions(event, {
    editMode,
    localizationContext,
    actsData,
    onToggleShortcut,
    onTogglePosition,
    onDelete,
    onActivateMarkerLink,
    onAssignAct,
  });
  if (actions) card.appendChild(actions);

  const year = document.createElement("div");
  year.className = "event-year";
  year.textContent = getLocalizedText(event, "year", localizationContext, "");
  year.contentEditable = String(editMode);

  const title = document.createElement("h3");
  title.className = "event-title";
  title.textContent = getLocalizedText(event, "title", localizationContext, "Без названия");
  title.contentEditable = String(editMode);

  const act = findTimelineAct(actsData, event.actId);
  if (act) {
    const actChip = document.createElement("div");
    actChip.className = "event-act-chip";
    actChip.textContent = getTimelineActTitle(act, localizationContext, "Act");
    card.appendChild(actChip);
  }

  const text = document.createElement("p");
  text.className = "event-text";
  text.textContent = getLocalizedText(event, "description", localizationContext, "");
  text.contentEditable = String(editMode);

  const dot = document.createElement("div");
  dot.className = "event-dot";

  const dotDate = document.createElement("div");
  dotDate.className = "event-timeline-date";
  dotDate.textContent = getLocalizedText(event, "year", localizationContext, "");

  const axis = document.createElement("div");
  axis.className = "timeline-event-axis";

  card.append(year, title, text);
  axis.append(dot, dotDate);
  item.append(card, axis);
  return item;
}

export function createTimelineFutureItem(labelText = "Неизведанное будущее") {
  const futureItem = document.createElement("div");
  futureItem.className = "timeline-future-item";

  const futureLineEnd = document.createElement("div");
  futureLineEnd.className = "timeline-future-line-end";

  const futureLabel = document.createElement("div");
  futureLabel.className = "timeline-future-label";
  futureLabel.textContent = labelText;

  futureItem.append(futureLineEnd, futureLabel);
  return futureItem;
}

function createTimelineEventActions(event, callbacks) {
  const {
    editMode,
    localizationContext,
    actsData,
    onToggleShortcut,
    onTogglePosition,
    onDelete,
    onActivateMarkerLink,
    onAssignAct,
  } = callbacks;
  // Action buttons depend on both edit state and the event data itself.
  const showMapButton = editMode || Boolean(event.markerId);
  const showActButton = editMode && Array.isArray(actsData) && actsData.length > 0;
  const showActions = editMode || showMapButton || showActButton;
  if (!showActions) return null;

  const actions = document.createElement("div");
  actions.className = "event-edit-actions";

  if (showMapButton) {
    const mapButton = createEventActionButton({
      className: `event-map-link-button ${event.markerId ? "active" : ""}`.trim(),
      text: "\u25A1",
      title: editMode
        ? (event.markerId ? "Сменить или убрать метку карты" : "Привязать место на карте")
        : "Открыть место события на карте",
      onClick: () => onActivateMarkerLink(event.id),
    });
    actions.appendChild(mapButton);
  }

  if (showActButton) {
    const currentAct = findTimelineAct(actsData, event.actId);
    const actButton = createEventActionButton({
      className: "event-act-button",
      text: currentAct ? getTimelineActShortLabel(currentAct, localizationContext, "Act") : "ALL",
      title: currentAct
        ? `Акт: ${getTimelineActTitle(currentAct, localizationContext, "Act")}`
        : "Общая хроника",
      onClick: () => onAssignAct(event.id),
    });
    actions.appendChild(actButton);
  }

  if (editMode) {
    const isDefaultShortcut = DEFAULT_TIMELINE_SHORTCUTS.some((entry) => entry.eventId === event.id);
    const shortcutButton = createEventActionButton({
      className: `event-shortcut-toggle ${event.sidebarShortcut ? "active" : ""}`,
      text: isDefaultShortcut ? "=" : (event.sidebarShortcut ? "*" : "+"),
      title: isDefaultShortcut
        ? "Эта быстрая точка уже входит в базовый набор"
        : (event.sidebarShortcut ? "Убрать из быстрых точек" : "Добавить в быстрые точки"),
      disabled: isDefaultShortcut,
      onClick: () => onToggleShortcut(event.id),
    });

    const positionButton = createEventActionButton({
      className: "event-position-toggle",
      text: event.position === "down" ? "\u2191" : "\u2193",
      title: event.position === "down"
        ? "Поднять событие над линией"
        : "Опустить событие под линию",
      onClick: () => onTogglePosition(event.id),
    });

    const deleteButton = createEventActionButton({
      className: "event-delete-button",
      text: "\u2715",
      title: "Удалить событие",
      onClick: () => onDelete(event.id),
    });

    actions.append(shortcutButton, positionButton, deleteButton);
  }

  return actions;
}

function createEventActionButton({ className, text, title, disabled = false, onClick }) {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.textContent = text;
  button.title = title;
  button.disabled = disabled;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}
