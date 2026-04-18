import { updatePanelImageView } from "./panelImages.js";
import { findArchiveFactionItem, isFactionArchiveGroup } from "./factionSymbols.js";
import { getLocalizedText, getLocalizedValue, setLocalizedValue } from "./localization.js";
import { getUiText } from "./uiLocale.js";

export function createPanelDetailsController(options) {
  const {
    els,
    state,
    getChangeRecorder,
    onSelectTarget = () => {},
    togglePanel,
    setMapEditorControlsVisible,
    refreshEditorActionButtons,
    rerenderMapMarkers,
  } = options;

  const editablePanelFields = [
    els.panelTitle,
    els.panelSubtitle,
    els.panelImageCaption,
    els.panelText,
    els.fact1,
    els.fact2,
    els.fact3,
  ];

  const getRecorder = () => getChangeRecorder?.() || { upsert: () => {} };

  // The right panel can represent either a map marker or a timeline event.
  // These helpers keep that dual role centralized instead of scattering checks.
  function getCurrentPanelRecord() {
    if (state.currentPanelEntity?.entity === "timelineEvent") return state.currentTimelineEvent;
    return state.currentMarker;
  }

  function isFactionMarker(marker) {
    const groupId = String(marker?.group || "").trim().toLowerCase();
    const markerType = String(marker?.type || "").trim().toLowerCase();
    return groupId === "factions" || markerType.includes("\u0444\u0440\u0430\u043a\u0446") || markerType.includes("faction");
  }

  function getFactionArchiveCandidates() {
    return state.archiveData.flatMap((group) => {
      if (!isFactionArchiveGroup(group)) return [];
      return (group.items || []).map((item) => ({ group, item }));
    });
  }

  function getTimelineCandidates() {
    return (state.eventsData || []).map((event) => ({
      id: event.id,
      title: getLocalizedText(event, "title", state, getUiText(state, "timeline_event")),
      year: getLocalizedText(event, "year", state, ""),
    }));
  }

  // Linking is selective on purpose: only faction-like markers are expected to
  // connect directly to archive entries.
  function refreshArchiveLinkButton() {
    if (!els.linkArchiveItemButton) return;
    const currentEntity = state.currentPanelEntity?.entity || "marker";
    const currentMarker = currentEntity === "timelineEvent" ? null : state.currentMarker;
    const canLink = Boolean(state.editMode && currentMarker && !state.activeMapMode && isFactionMarker(currentMarker));
    els.linkArchiveItemButton.hidden = !canLink;
    if (!canLink) return;

    const linked = findArchiveFactionItem(state.archiveData, currentMarker);
    els.linkArchiveItemButton.textContent = linked
      ? `${getUiText(state, "mode_archive")}: ${getLocalizedText(linked.item, "title", state, getUiText(state, "archive_record"))}`
      : getUiText(state, "link_archive_button");
  }

  function refreshTimelineLinkButtons() {
    // A marker may reference a timeline event, but a timeline event does not
    // link to itself through this control.
    const currentRecord = getCurrentPanelRecord();
    const currentEntity = state.currentPanelEntity?.entity || "marker";
    const canEditLink = Boolean(state.editMode && currentRecord && (currentEntity === "marker" || currentEntity === "activeMarker"));
    const linkedEvent = currentEntity === "timelineEvent"
      ? null
      : state.eventsData.find((entry) => entry.id === currentRecord?.timelineEventId);
    const linkedTitle = linkedEvent ? getLocalizedText(linkedEvent, "title", state, getUiText(state, "timeline_event")) : "";

    els.linkTimelineEventButton.hidden = !canEditLink;
    els.panelTimelineEventButton.hidden = !linkedEvent;

    if (canEditLink) {
      els.linkTimelineEventButton.textContent = linkedEvent
        ? `${getUiText(state, "mode_timeline")}: ${linkedTitle}`
        : getUiText(state, "link_timeline_button");
      els.linkTimelineEventButton.title = linkedEvent
        ? getUiText(state, "link_timeline_button_title_edit")
        : getUiText(state, "link_timeline_button_title");
    }

    if (linkedEvent) {
      els.panelTimelineEventButton.textContent = getUiText(state, "open_linked_timeline_event", { title: linkedTitle });
    }
  }

  function updateFromMarker(marker, options = {}) {
    // Switching the panel source also updates the shared "current target" used
    // by player tools, favorites, and cross-navigation.
    state.currentTimelineEvent = null;
    state.currentMarker = marker;
    state.currentPanelEntity = {
      entity: options.entity || "marker",
    };
    if (marker?.id) {
      onSelectTarget({
        type: options.entity === "activeMarker" ? "activeMarker" : "marker",
        id: marker.id,
      });
    }

    els.panelTitle.textContent = getLocalizedText(marker, "title", state, getUiText(state, "marker_untitled"));
    els.panelSubtitle.textContent = getLocalizedText(marker, "type", state, getUiText(state, "marker_type"));
    updatePanelImageView(els, marker, state);
    els.panelText.textContent = getLocalizedText(marker, "description", state, getUiText(state, "marker_description_empty"));

    const facts = getLocalizedValue(marker, "facts", state, ["\u2014", "\u2014", "\u2014"]);
    els.fact1.textContent = facts?.[0] || "\u2014";
    els.fact2.textContent = facts?.[1] || "\u2014";
    els.fact3.textContent = facts?.[2] || "\u2014";

    refreshArchiveLinkButton();
    refreshTimelineLinkButtons();
    els.deleteMarkerButton.hidden = !state.editMode;
    togglePanel(true);
  }

  function updateFromTimelineEvent(timelineEvent) {
    if (!timelineEvent) return;

    state.currentMarker = null;
    state.currentTimelineEvent = timelineEvent;
    state.currentPanelEntity = {
      entity: "timelineEvent",
    };
    state.currentTimelineEventId = timelineEvent.id || null;
    if (timelineEvent?.id) {
      onSelectTarget({
        type: "timeline",
        id: timelineEvent.id,
      });
    }

    els.panelTitle.textContent = getLocalizedText(timelineEvent, "title", state, getUiText(state, "timeline_event"));
    els.panelSubtitle.textContent = getLocalizedText(timelineEvent, "year", state, "");
    updatePanelImageView(els, timelineEvent, state);
    els.panelText.textContent = getLocalizedText(
      timelineEvent,
      "fullDescription",
      state,
      getLocalizedText(timelineEvent, "description", state, ""),
    );

    const facts = getLocalizedValue(timelineEvent, "facts", state, ["\u2014", "\u2014", "\u2014"]);
    els.fact1.textContent = facts?.[0] || "\u2014";
    els.fact2.textContent = facts?.[1] || "\u2014";
    els.fact3.textContent = facts?.[2] || "\u2014";

    refreshArchiveLinkButton();
    refreshTimelineLinkButtons();
    els.deleteMarkerButton.hidden = true;
    togglePanel(true);
  }

  // Edit mode reuses the same panel nodes by toggling contentEditable instead
  // of maintaining a separate form view.
  function setEditable(enabled) {
    editablePanelFields.forEach((element) => {
      element.contentEditable = String(enabled);
    });
    els.timelineContainer.querySelectorAll(".event-year, .event-title, .event-text").forEach((element) => {
      element.contentEditable = String(enabled);
    });
    els.archiveGroupsContainer
      .querySelectorAll(".archive-group-title, .archive-card-title, .archive-card-text, .archive-expanded-title, .archive-expanded-text")
      .forEach((element) => {
        element.contentEditable = String(enabled);
      });
    els.heroesGroupsContainer
      .querySelectorAll(".heroes-group-title, .heroes-group-subtitle, .hero-card-title, .hero-card-role, .hero-card-text, .hero-expanded-title, .hero-expanded-role, .hero-expanded-text")
      .forEach((element) => {
        element.contentEditable = String(enabled);
      });
    els.panelImageControls.hidden = !enabled;
    refreshArchiveLinkButton();
    refreshTimelineLinkButtons();
    setMapEditorControlsVisible(enabled && !state.timelineMode && !state.archiveMode && !state.heroesMode && !state.activeMapMode, state.drawMode);
    refreshEditorActionButtons();
  }

  function saveCurrentMarker() {
    // Saving is routed by the active panel entity so the same right panel can
    // persist marker fields and timeline-event fields through one entry point.
    const entity = state.currentPanelEntity?.entity || "marker";
    const currentRecord = getCurrentPanelRecord();
    if (!state.editMode || !currentRecord) return;

    if (entity === "timelineEvent") {
      setLocalizedValue(currentRecord, "title", els.panelTitle.textContent.trim(), state);
      setLocalizedValue(currentRecord, "year", els.panelSubtitle.textContent.trim(), state);
      currentRecord.imageUrl = els.panelImageUrlInput.value.trim();
      setLocalizedValue(currentRecord, "imageText", els.panelImageCaption.textContent.trim(), state);
      setLocalizedValue(currentRecord, "fullDescription", els.panelText.textContent.trim(), state);
      setLocalizedValue(
        currentRecord,
        "facts",
        [els.fact1.textContent.trim(), els.fact2.textContent.trim(), els.fact3.textContent.trim()],
        state,
      );
      if (currentRecord.id) getRecorder().upsert("timelineEvent", currentRecord.id, currentRecord);
      return;
    }

    setLocalizedValue(state.currentMarker, "title", els.panelTitle.textContent.trim(), state);
    setLocalizedValue(state.currentMarker, "type", els.panelSubtitle.textContent.trim(), state);
    state.currentMarker.imageUrl = els.panelImageUrlInput.value.trim();
    setLocalizedValue(state.currentMarker, "imageText", els.panelImageCaption.textContent.trim(), state);
    setLocalizedValue(state.currentMarker, "description", els.panelText.textContent.trim(), state);
    setLocalizedValue(
      state.currentMarker,
      "facts",
      [els.fact1.textContent.trim(), els.fact2.textContent.trim(), els.fact3.textContent.trim()],
      state,
    );
    if (state.currentMarker.id) getRecorder().upsert(entity, state.currentMarker.id, state.currentMarker);
  }

  els.linkArchiveItemButton?.addEventListener("click", () => {
    if (!state.editMode || !state.currentMarker || !isFactionMarker(state.currentMarker)) return;

    const candidates = getFactionArchiveCandidates();
    if (!candidates.length) {
      window.alert(getUiText(state, "link_archive_empty"));
      return;
    }

    const list = candidates
      .map(({ group, item }, index) => `${index + 1}. ${getLocalizedText(item, "title", state, getUiText(state, "marker_untitled"))} (${getLocalizedText(group, "title", state, getUiText(state, "mode_archive"))})`)
      .join("\n");
    const selectedRaw = window.prompt(getUiText(state, "link_archive_pick", { list }), "1");
    if (!selectedRaw) return;

    const selected = candidates[Number(selectedRaw) - 1];
    if (!selected) return;

    state.currentMarker.archiveGroupId = selected.group.id;
    state.currentMarker.archiveItemId = selected.item.id;
    if (state.currentMarker.id) {
      getRecorder().upsert(state.currentPanelEntity?.entity || "marker", state.currentMarker.id, state.currentMarker);
    }
    refreshArchiveLinkButton();
    rerenderMapMarkers?.();
  });

  els.linkTimelineEventButton?.addEventListener("click", () => {
    if (!state.editMode || !state.currentMarker) return;

    const candidates = getTimelineCandidates().filter((entry) => entry.id);
    if (!candidates.length) {
      window.alert(getUiText(state, "link_timeline_empty"));
      return;
    }

    const list = [
      getUiText(state, "link_clear"),
      ...candidates.map((entry, index) => `${index + 1}. ${entry.year ? `${entry.year} - ` : ""}${entry.title}`),
    ].join("\n");
    const selectedRaw = window.prompt(
      getUiText(state, "link_timeline_pick", { list }),
      state.currentMarker.timelineEventId ? "0" : "1",
    );
    if (selectedRaw == null) return;

    if (selectedRaw.trim() === "0") {
      state.currentMarker.timelineEventId = "";
      if (state.currentMarker.id) {
        getRecorder().upsert(state.currentPanelEntity?.entity || "marker", state.currentMarker.id, state.currentMarker);
      }
      refreshTimelineLinkButtons();
      return;
    }

    const selected = candidates[Number(selectedRaw) - 1];
    if (!selected) return;

    state.currentMarker.timelineEventId = selected.id;
    if (state.currentMarker.id) {
      getRecorder().upsert(state.currentPanelEntity?.entity || "marker", state.currentMarker.id, state.currentMarker);
    }
    refreshTimelineLinkButtons();
  });

  els.panelTimelineEventButton?.addEventListener("click", () => {
    if (!state.currentMarker?.timelineEventId) return;
    onSelectTarget({ type: "timeline", id: state.currentMarker.timelineEventId });
  });

  return {
    saveCurrentMarker,
    setEditable,
    updateFromMarker,
    updateFromTimelineEvent,
  };
}
