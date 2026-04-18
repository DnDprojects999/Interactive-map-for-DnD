import { getLocalizedText } from "./localization.js";

// Sidebar shortcuts provide stable "jump points" on long timelines.
export const DEFAULT_TIMELINE_SHORTCUTS = [
  { label: "Старт", title: "Начало кампании", eventId: "founding" },
  { label: "NOW", title: "Текущая эпоха", eventId: "campaign-start" },
  { label: "Союз", title: "Союз гильдий", eventId: "guild-union" },
];

export function parseTimelineOrderValue(yearText) {
  // Timeline labels are intentionally permissive: plain numbers, AGE labels,
  // and NOW +/- offsets all collapse into one sortable numeric scale.
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

export function getDefaultTimelineShortcutLabel(event) {
  const yearLabel = event?.year?.trim?.();
  if (yearLabel) return yearLabel.slice(0, 8);

  const titleLabel = event?.title?.trim?.();
  if (!titleLabel) return "Точка";
  return titleLabel.split(/\s+/).slice(0, 2).join(" ").slice(0, 8);
}

export function getTimelineSidebarActions(eventsData, defaultShortcuts = DEFAULT_TIMELINE_SHORTCUTS) {
  // Default shortcuts are filled first, then user-defined shortcuts are added
  // without duplicating events that already have a reserved slot.
  const actions = [];
  const usedEventIds = new Set();

  defaultShortcuts.forEach((action) => {
    if (!eventsData.some((event) => event.id === action.eventId)) return;
    actions.push({ ...action, isDefault: true });
    usedEventIds.add(action.eventId);
  });

  eventsData.forEach((event) => {
    if (!event?.sidebarShortcut || usedEventIds.has(event.id)) return;
    actions.push({
      label: event.sidebarShortcutLabel?.trim?.() || getDefaultTimelineShortcutLabel(event),
      title: event.title || event.year || "Событие",
      eventId: event.id,
      isDefault: false,
    });
    usedEventIds.add(event.id);
  });

  return actions;
}

export function findTimelineAct(actsData, actId) {
  const normalizedActId = String(actId || "").trim();
  if (!normalizedActId) return null;
  return (actsData || []).find((entry) => String(entry?.id || "").trim() === normalizedActId) || null;
}

export function getTimelineEventsForAct(eventsData, actId) {
  const normalizedActId = String(actId || "").trim();
  if (!normalizedActId) return Array.isArray(eventsData) ? eventsData : [];
  return (eventsData || []).filter((event) => String(event?.actId || "").trim() === normalizedActId);
}

export function getTimelineActTitle(act, context, fallback = "Act") {
  return getLocalizedText(act, "title", context, fallback);
}

export function getTimelineActSummary(act, context, fallback = "") {
  return getLocalizedText(act, "description", context, fallback);
}

export function getTimelineActShortLabel(act, context, fallback = "Act") {
  const title = getTimelineActTitle(act, context, fallback).trim();
  if (!title) return fallback;

  const compact = title.replace(/\s+/g, " ").trim();
  if (compact.length <= 12) return compact;

  const initials = compact
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word)[0] || "")
    .join("")
    .slice(0, 4)
    .toUpperCase();

  return initials || compact.slice(0, 12);
}

export function normalizeTimelineOrderByDate(eventsData) {
  // Ordering is in-place because timeline edits work on the live state array.
  eventsData.sort((a, b) => {
    const left = parseTimelineOrderValue(a.year);
    const right = parseTimelineOrderValue(b.year);
    if (left !== right) return left - right;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

export function getTimelinePreferredWidth(event) {
  // Card width is estimated from content length so short events stay compact
  // while dense ones get more breathing room without manual sizing.
  const yearText = event?.year?.trim?.() || "";
  const titleText = event?.title?.trim?.() || "";
  const descriptionText = event?.description?.trim?.() || "";
  const lines = [yearText, titleText, ...descriptionText.split(/\r?\n/)];
  const combined = `${titleText} ${descriptionText}`.trim();
  const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const longestWord = combined
    .split(/\s+/)
    .filter(Boolean)
    .reduce((max, word) => Math.max(max, word.length), 0);
  const totalLength = `${yearText} ${combined}`.trim().length;

  const width = 260
    + Math.max(0, longestLine - 26) * 3.4
    + Math.max(0, longestWord - 14) * 9
    + Math.max(0, totalLength - 150) * 0.42;

  return Math.max(260, Math.min(520, Math.round(width)));
}

export function applyTimelineEventLayout(item, event) {
  if (!item) return;
  const cardWidth = getTimelinePreferredWidth(event);
  const slotWidth = Math.max(320, cardWidth + 72);
  item.style.setProperty("--timeline-card-width", `${cardWidth}px`);
  item.style.setProperty("--timeline-slot-width", `${slotWidth}px`);
}
