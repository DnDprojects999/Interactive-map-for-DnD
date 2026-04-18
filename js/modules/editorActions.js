import { normalizeTimelineOrderByDate } from "./timelineModel.js";
import {
  createArchiveGroupTemplate,
  createArchiveItemTemplate,
  createHeroCardTemplate,
  createHeroGroupTemplate,
  createTimelineActTemplate,
  createTimelineEventTemplate,
  inferArchiveTemplateKind,
} from "./entityTemplates.js";
import { getLocalizedText, setLocalizedValue } from "./localization.js";

export function createEditorActionsController(options) {
  const {
    els,
    state,
    generateEntityId,
    getChangeRecorder,
    getMapEditorCallbacks,
    renderArchive,
    renderArchiveSidebarButtons,
    renderHeroes,
    renderTimeline,
    renderTimelineSidebarButtons,
    openDataQualityReport,
  } = options;

  const getRecorder = () => getChangeRecorder?.() || { upsert: () => {}, remove: () => {} };
  const getCallbacks = () => getMapEditorCallbacks?.() || {};

  // These actions are the "small creation tools" for every major section. They
  // stay separate from the heavy editor module so mode toolbars remain easier
  // to reason about.
  function askForArchiveTemplateKind(defaultKind = "general") {
    const selected = window.prompt(
      "Тип архивной главы: faction, city, authority или general",
      defaultKind,
    );
    if (!selected) return null;

    const normalized = String(selected).trim().toLowerCase();
    if (["faction", "city", "authority", "general"].includes(normalized)) return normalized;
    window.alert("Используй один из вариантов: faction, city, authority или general.");
    return null;
  }

  function toggleTimelineEventPosition(eventId) {
    if (!state.editMode) return;

    const event = state.eventsData.find((entry) => entry.id === eventId);
    if (!event) return;

    event.position = event.position === "down" ? "up" : "down";
    getRecorder().upsert("timelineEvent", event.id, event);
    renderTimeline();
    if (state.timelineMode) renderTimelineSidebarButtons();
  }

  function deleteTimelineEvent(eventId) {
    if (!state.editMode) return;

    const eventIndex = state.eventsData.findIndex((entry) => entry.id === eventId);
    if (eventIndex < 0) return;

    const [removedEvent] = state.eventsData.splice(eventIndex, 1);
    getRecorder().remove("timelineEvent", removedEvent.id);
    renderTimeline();
    if (state.timelineMode) renderTimelineSidebarButtons();
  }

  // New timeline events inherit a bit of context from the previous item so
  // creators do not have to rebuild spacing/position from scratch each time.
  function createTimelineEvent() {
    if (!state.editMode) return;

    const previousEvent = state.eventsData[state.eventsData.length - 1];
    const newEvent = {
      ...createTimelineEventTemplate(previousEvent),
      id: generateEntityId("timeline"),
      actId: state.currentTimelineActId || "",
    };

    state.eventsData.push(newEvent);
    normalizeTimelineOrderByDate(state.eventsData);
    getRecorder().upsert("timelineEvent", newEvent.id, newEvent);
    renderTimeline();
    const newCard = els.timelineContainer.querySelector(`[data-event-id="${newEvent.id}"]`);
    if (newCard) newCard.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function createTimelineAct() {
    if (!state.editMode) return;

    const newAct = {
      ...createTimelineActTemplate(state.timelineActsData.length),
      id: generateEntityId("timeline-act"),
    };

    const localizedTitle = getLocalizedText(newAct, "title", state, newAct.title);
    const nextTitle = window.prompt("Название акта", localizedTitle);
    if (nextTitle == null) return;
    setLocalizedValue(newAct, "title", String(nextTitle).trim() || localizedTitle, state);

    const localizedDescription = getLocalizedText(newAct, "description", state, newAct.description);
    const nextDescription = window.prompt("Описание акта", localizedDescription);
    if (nextDescription == null) return;
    setLocalizedValue(newAct, "description", String(nextDescription).trim() || localizedDescription, state);

    state.timelineActsData.push(newAct);
    state.currentTimelineActId = newAct.id;
    getRecorder().upsert("timelineAct", newAct.id, newAct);
    renderTimeline();
    if (state.timelineMode) renderTimelineSidebarButtons();
  }

  // Acts are edited through short prompts because they only own a small amount
  // of metadata compared with full article/card editors.
  function editTimelineAct() {
    if (!state.editMode) return;
    const act = state.timelineActsData.find((entry) => entry.id === state.currentTimelineActId);
    if (!act) return;

    const currentTitle = getLocalizedText(act, "title", state, act.title || "Акт");
    const nextTitle = window.prompt("Название акта", currentTitle);
    if (nextTitle == null) return;

    const currentDescription = getLocalizedText(
      act,
      "description",
      state,
      act.description || "Отдельная арка хроники для крупной истории, фронта или важной кампанийной линии.",
    );
    const nextDescription = window.prompt(
      "Описание акта",
      currentDescription,
    );
    if (nextDescription == null) return;

    setLocalizedValue(act, "title", String(nextTitle).trim() || currentTitle, state);
    setLocalizedValue(act, "description", String(nextDescription).trim() || currentDescription, state);
    getRecorder().upsert("timelineAct", act.id, act);
    renderTimeline();
    if (state.timelineMode) renderTimelineSidebarButtons();
  }

  function deleteTimelineAct() {
    // Removing an act does not remove its events. They fall back into the
    // general timeline so content is not lost by accident.
    if (!state.editMode) return;
    const act = state.timelineActsData.find((entry) => entry.id === state.currentTimelineActId);
    if (!act?.id) return;

    const actTitle = String(act.title || "этот акт").trim();
    if (!window.confirm(`Удалить акт "${actTitle}"? События из него вернутся в раздел "Общее".`)) return;

    state.eventsData.forEach((entry) => {
      if (String(entry.actId || "").trim() !== act.id) return;
      entry.actId = "";
      getRecorder().upsert("timelineEvent", entry.id, entry);
    });

    state.timelineActsData = state.timelineActsData.filter((entry) => entry.id !== act.id);
    state.currentTimelineActId = "";
    getRecorder().remove("timelineAct", act.id);
    renderTimeline();
    if (state.timelineMode) renderTimelineSidebarButtons();
  }

  function assignTimelineEventAct(eventId) {
    if (!state.editMode) return;

    const event = state.eventsData.find((entry) => entry.id === eventId);
    if (!event) return;

    const list = [
      "0. Общая хроника",
      ...state.timelineActsData.map((act, index) => `${index + 1}. ${act.title || `Акт ${index + 1}`}`),
    ].join("\n");
    const currentIndex = Math.max(
      0,
      state.timelineActsData.findIndex((act) => act.id === event.actId) + 1,
    );
    const selectedRaw = window.prompt(`В какой акт перенести событие?\n${list}`, String(currentIndex));
    if (selectedRaw == null) return;

    if (selectedRaw.trim() === "0") {
      event.actId = "";
    } else {
      const selectedAct = state.timelineActsData[Number(selectedRaw) - 1];
      if (!selectedAct) return;
      event.actId = selectedAct.id;
    }

    getRecorder().upsert("timelineEvent", event.id, event);
    renderTimeline();
    if (state.timelineMode) renderTimelineSidebarButtons();
  }

  // Archive and hero creators insert new records straight into their owning
  // group, then scroll the new card into view to keep the editing flow local.
  function createArchiveGroup() {
    if (!state.editMode) return;

    const kind = askForArchiveTemplateKind("faction");
    if (!kind) return;

    const newGroup = {
      ...createArchiveGroupTemplate(kind),
      id: generateEntityId("archive-group"),
    };

    state.archiveData.push(newGroup);
    state.activeArchiveGroupId = newGroup.id;
    getRecorder().upsert("archiveGroup", newGroup.id, newGroup);
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
      ...createArchiveItemTemplate(inferArchiveTemplateKind(group), group.items.length),
      id: generateEntityId("archive-item"),
    };

    group.items.push(newItem);
    getRecorder().upsert("archiveItem", newItem.id, newItem, { groupId: group.id });
    renderArchive();
    const card = els.archiveGroupsContainer.querySelector(`[data-card-id="${group.id}-${newItem.id}"]`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }

  function createHeroGroup() {
    if (!state.editMode) return;

    const newGroup = {
      ...createHeroGroupTemplate(),
      id: generateEntityId("hero-group"),
    };

    state.heroesData.push(newGroup);
    state.activeHeroGroupId = newGroup.id;
    getRecorder().upsert("heroGroup", newGroup.id, newGroup);
    renderHeroes();
    const section = els.heroesGroupsContainer.querySelector(`[data-hero-group="${newGroup.id}"]`);
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function createHeroCard() {
    if (!state.editMode) return;

    const groupChoices = state.heroesData
      .map((group, index) => `${index + 1}. ${group.title || `Группа ${index + 1}`}`)
      .join("\n");
    if (!groupChoices) return;

    const selectedGroupRaw = window.prompt(`В какую группу добавить героя?\n${groupChoices}`, "1");
    if (!selectedGroupRaw) return;

    const selectedIndex = Number(selectedGroupRaw) - 1;
    const selectedGroup = state.heroesData[selectedIndex];
    const groupId = selectedGroup?.id || state.activeHeroGroupId || state.heroesData[0]?.id;
    const group = state.heroesData.find((entry) => entry.id === groupId);
    if (!group) return;

    group.items = Array.isArray(group.items) ? group.items : [];
    const newHero = {
      ...createHeroCardTemplate(group.items.length),
      id: generateEntityId("hero"),
    };

    group.items.push(newHero);
    state.activeHeroGroupId = group.id;
    getRecorder().upsert("heroItem", newHero.id, newHero, { groupId: group.id });
    renderHeroes();
    const card = els.heroesGroupsContainer.querySelector(`[data-card-id="${group.id}-${newHero.id}"]`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }

  function setupButtons() {
    els.addRegionLabelButton.addEventListener("click", () => getCallbacks().onCreateRegionLabel?.());
    els.toggleTextMoveModeButton.addEventListener("click", () => getCallbacks().onToggleTextMoveMode?.());
    els.toggleDrawModeButton.addEventListener("click", () => getCallbacks().onToggleDrawMode?.());
    els.addTimelineEventButton.addEventListener("click", createTimelineEvent);
    els.addTimelineActButton?.addEventListener("click", createTimelineAct);
    els.editTimelineActButton?.addEventListener("click", editTimelineAct);
    els.deleteTimelineActButton?.addEventListener("click", deleteTimelineAct);
    els.addArchiveGroupButton.addEventListener("click", createArchiveGroup);
    els.addArchiveItemButton.addEventListener("click", createArchiveItem);
    els.addHeroGroupButton.addEventListener("click", createHeroGroup);
    els.addHeroCardButton.addEventListener("click", createHeroCard);
    els.validateDataButton.addEventListener("click", () => openDataQualityReport?.());
  }

  return {
    assignTimelineEventAct,
    createTimelineAct,
    deleteTimelineAct,
    deleteTimelineEvent,
    editTimelineAct,
    setupButtons,
    toggleTimelineEventPosition,
  };
}
