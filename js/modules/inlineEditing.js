import { setupArchiveMediaInteractions } from "./archive/archiveInteractions.js";
import {
  applyTimelineEventLayout,
  normalizeTimelineOrderByDate,
} from "./timelineModel.js";
import { getLocalizedText, setLocalizedValue } from "./localization.js";

const EDITABLE_TIMELINE_FIELDS = ["event-year", "event-title", "event-text"];
const EDITABLE_ARCHIVE_FIELDS = [
  "archive-group-title",
  "archive-card-title",
  "archive-card-text",
  "archive-expanded-title",
  "archive-expanded-text",
];

export function setupInlineEditingInteractions(options) {
  const {
    els,
    state,
    readFileToDataUrl,
    getChangeRecorder,
    getArchiveShortLabel,
    renderTimeline,
    renderArchive,
    remapArchiveItemReferences,
    renderTimelineSidebarButtons,
    syncTimelineTrackAlignment,
  } = options;

  const getRecorder = () => getChangeRecorder?.() || { upsert: () => {}, remove: () => {} };

  // Inline editing keeps rendered cards as the editing surface instead of
  // swapping to separate forms for timeline and archive text fields.
  els.timelineContainer.addEventListener("input", (event) => {
    if (!state.editMode) return;
    const target = event.target;
    if (!EDITABLE_TIMELINE_FIELDS.some((className) => target.classList.contains(className))) return;

    const card = target.closest(".event-card");
    const eventId = card?.dataset?.eventId;
    if (!eventId) return;

    const timelineEvent = state.eventsData.find((entry) => entry.id === eventId);
    if (!timelineEvent) return;

    if (target.classList.contains("event-year")) setLocalizedValue(timelineEvent, "year", target.textContent.trim(), state);
    if (target.classList.contains("event-title")) setLocalizedValue(timelineEvent, "title", target.textContent.trim(), state);
    if (target.classList.contains("event-text")) setLocalizedValue(timelineEvent, "description", target.textContent.trim(), state);

    if (target.classList.contains("event-year")) {
      const item = card.closest(".timeline-event-item");
      const timelineDate = item?.querySelector(".event-timeline-date");
      if (timelineDate) timelineDate.textContent = getLocalizedText(timelineEvent, "year", state, "");
    }

    const item = card.closest(".timeline-event-item");
    applyTimelineEventLayout(item, timelineEvent);

    getRecorder().upsert("timelineEvent", timelineEvent.id, timelineEvent);
    requestAnimationFrame(syncTimelineTrackAlignment);
    if (state.timelineMode) renderTimelineSidebarButtons();
  });

  els.timelineContainer.addEventListener("focusout", (event) => {
    if (!state.editMode) return;
    const target = event.target;
    if (!target.classList?.contains("event-year")) return;
    normalizeTimelineOrderByDate(state.eventsData);
    renderTimeline();
    if (state.timelineMode) renderTimelineSidebarButtons();
  });

  els.archiveGroupsContainer.addEventListener("input", (event) => {
    if (!state.editMode) return;
    const target = event.target;
    if (!EDITABLE_ARCHIVE_FIELDS.some((className) => target.classList.contains(className))) return;

    if (target.classList.contains("archive-group-title")) {
      const section = target.closest(".archive-group");
      const groupId = section?.dataset?.archiveGroup;
      if (!groupId) return;
      const group = state.archiveData.find((entry) => entry.id === groupId);
      if (!group) return;
      setLocalizedValue(group, "title", target.textContent.trim(), state);
      const relatedSidebarButton = els.toolButtonsContainer.querySelector(`[data-archive-group="${group.id}"]`);
      if (relatedSidebarButton) {
        const localizedTitle = getLocalizedText(group, "title", state, "");
        relatedSidebarButton.title = localizedTitle;
        relatedSidebarButton.textContent = getArchiveShortLabel(localizedTitle);
      }
      getRecorder().upsert("archiveGroup", group.id, group);
      return;
    }

    const card = target.closest(".archive-card");
    if (card) {
      const groupId = card.dataset.groupId;
      const itemId = card.dataset.itemId;
      const group = state.archiveData.find((entry) => entry.id === groupId);
      const item = group?.items?.find((entry) => entry.id === itemId);
      if (!group || !item) return;

      if (target.classList.contains("archive-card-title")) setLocalizedValue(item, "title", target.textContent.trim(), state);
      if (target.classList.contains("archive-card-text")) setLocalizedValue(item, "description", target.textContent.trim(), state);

      getRecorder().upsert("archiveItem", item.id, item, { groupId: group.id });
      return;
    }

    const expanded = target.closest(".archive-expanded");
    if (!expanded) return;
    const groupId = expanded.dataset.groupId;
    const itemId = expanded.dataset.itemId;
    const group = state.archiveData.find((entry) => entry.id === groupId);
    const item = group?.items?.find((entry) => entry.id === itemId);
    if (!group || !item) return;

    if (target.classList.contains("archive-expanded-title")) setLocalizedValue(item, "title", target.textContent.trim(), state);
    if (target.classList.contains("archive-expanded-text")) setLocalizedValue(item, "fullDescription", target.textContent.trim(), state);

    getRecorder().upsert("archiveItem", item.id, item, { groupId: group.id });
  });

  // Media editing for archive cards is split out because file/paste/drag logic
  // is much heavier than plain text editing.
  setupArchiveMediaInteractions({
    container: els.archiveGroupsContainer,
    documentBody: document.body,
    state,
    readFileToDataUrl,
    getChangeRecorder,
    remapArchiveItemReferences,
    renderArchive,
  });
}
