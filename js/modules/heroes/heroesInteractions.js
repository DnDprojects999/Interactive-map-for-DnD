import {
  moveGroupedItemBeforeTarget,
  syncGroupedSortOrder,
} from "../groupedOrdering.js";
import { getLocalizedText, setLocalizedValue } from "../localization.js";

const EDITABLE_HERO_FIELDS = [
  "heroes-group-title",
  "heroes-group-subtitle",
  "hero-card-title",
  "hero-card-role",
  "hero-card-text",
  "hero-expanded-title",
  "hero-expanded-role",
  "hero-expanded-text",
];

// Hero interactions cover inline text editing, portrait editing, link editing,
// accent overrides, and drag reordering inside/between hero groups.
function resolveHeroFromNode(state, node) {
  const groupId = node?.dataset?.groupId;
  const heroId = node?.dataset?.heroId;
  const group = state.heroesData.find((entry) => entry.id === groupId);
  const hero = group?.items?.find((entry) => entry.id === heroId);
  if (!group || !hero) return null;
  return { group, hero };
}

function resolveHeroImageTarget(state, target) {
  const imageNode = target?.closest?.(".hero-card-portrait, .hero-expanded-portrait");
  const card = target?.closest?.(".hero-card, .hero-expanded");
  if (!imageNode || !card) return null;
  const resolved = resolveHeroFromNode(state, card);
  if (!resolved) return null;
  return { imageNode, ...resolved };
}

function createLinkCandidates(state, type) {
  if (type === "marker") {
    return state.markersData.map((marker) => ({
      type,
      id: marker.id,
      label: marker.title || "Метка",
      detail: marker.type || "Карта",
    }));
  }

  if (type === "timeline") {
    return state.eventsData.map((event) => ({
      type,
      id: event.id,
      label: event.title || "Событие",
      detail: event.year || "Timeline",
    }));
  }

  if (type === "archiveItem") {
    return state.archiveData.flatMap((group) =>
      (group.items || []).map((item) => ({
        type,
        id: item.id,
        groupId: group.id,
        label: item.title || "Карточка архива",
        detail: group.title || "Archive",
      })),
    );
  }

  if (type === "heroItem") {
    return state.heroesData.flatMap((group) =>
      (group.items || []).map((hero) => ({
        type,
        id: hero.id,
        groupId: group.id,
        label: hero.title || "Герой",
        detail: group.title || "Hall of Heroes",
      })),
    );
  }

  return [];
}

function askForHeroLink(state) {
  const typeRaw = window.prompt("Тип связи: map, timeline, archive или hero", "timeline");
  if (!typeRaw) return null;

  const typeMap = {
    map: "marker",
    marker: "marker",
    timeline: "timeline",
    archive: "archiveItem",
    hero: "heroItem",
  };
  const type = typeMap[typeRaw.trim().toLowerCase()];
  if (!type) {
    window.alert("Не понял тип связи. Используй: map, timeline, archive или hero.");
    return null;
  }

  const candidates = createLinkCandidates(state, type).filter((candidate) => candidate.id);
  if (!candidates.length) {
    window.alert("Для этого типа пока нет записей.");
    return null;
  }

  const list = candidates
    .map((candidate, index) => `${index + 1}. ${candidate.label} (${candidate.detail})`)
    .join("\n");
  const selectedRaw = window.prompt(`Куда ведёт связь?\n${list}`, "1");
  if (!selectedRaw) return null;

  const selected = candidates[Number(selectedRaw) - 1];
  if (!selected) return null;

  const label = window.prompt("Текст кнопки связи", selected.label);
  if (label == null) return null;

  return {
    type: selected.type,
    id: selected.id,
    groupId: selected.groupId,
    label: label.trim() || selected.label,
  };
}

function updateHeroAccentPreview(container, groupId, heroId, color) {
  container
    .querySelectorAll(`[data-group-id="${groupId}"][data-hero-id="${heroId}"]`)
    .forEach((node) => node.style.setProperty("--hero-accent", color));
}

export function setupHeroInteractions(options) {
  const {
    els,
    state,
    readFileToDataUrl,
    getChangeRecorder,
    remapHeroReferences,
    renderHeroes,
  } = options;

  const heroImageInput = document.createElement("input");
  heroImageInput.type = "file";
  heroImageInput.accept = "image/*";
  heroImageInput.hidden = true;
  document.body.appendChild(heroImageInput);

  const getRecorder = () => getChangeRecorder?.() || { upsert: () => {}, remove: () => {} };
  let activeImageTarget = null;
  let dragHeroMeta = null;

  // Portrait uploads are funneled through one helper no matter whether the
  // image came from file picker, drag-drop, or clipboard paste.
  async function applyHeroImageFile(file, group, hero) {
    if (!file || !state.editMode || !file.type?.startsWith("image/")) return;
    try {
      hero.imageUrl = await readFileToDataUrl(file);
      hero.imageLabel = hero.imageLabel || "Портрет героя";
      getRecorder().upsert("heroItem", hero.id, hero, { groupId: group.id });
      renderHeroes();
    } catch (error) {
      console.error(error);
    }
  }

  els.heroesGroupsContainer.addEventListener("input", (event) => {
    if (!state.editMode) return;

    const target = event.target;
    if (target.matches?.(".hero-accent-picker")) {
      const expanded = target.closest(".hero-expanded");
      const resolved = resolveHeroFromNode(state, expanded);
      if (!resolved) return;

      resolved.hero.accentColorOverride = target.value;
      getRecorder().upsert("heroItem", resolved.hero.id, resolved.hero, { groupId: resolved.group.id });
      updateHeroAccentPreview(els.heroesGroupsContainer, resolved.group.id, resolved.hero.id, target.value);
      const resetButton = expanded?.querySelector(".hero-accent-reset");
      if (resetButton) resetButton.hidden = false;
      return;
    }

    if (!EDITABLE_HERO_FIELDS.some((className) => target.classList.contains(className))) return;

    if (target.classList.contains("heroes-group-title") || target.classList.contains("heroes-group-subtitle")) {
      const section = target.closest(".heroes-group");
      const group = state.heroesData.find((entry) => entry.id === section?.dataset?.heroGroup);
      if (!group) return;

      if (target.classList.contains("heroes-group-title")) setLocalizedValue(group, "title", target.textContent.trim(), state);
      if (target.classList.contains("heroes-group-subtitle")) setLocalizedValue(group, "subtitle", target.textContent.trim(), state);
      getRecorder().upsert("heroGroup", group.id, group);
      return;
    }

    const card = target.closest(".hero-card, .hero-expanded");
    const resolved = resolveHeroFromNode(state, card);
    if (!resolved) return;
    const { group, hero } = resolved;

    if (target.classList.contains("hero-card-title") || target.classList.contains("hero-expanded-title")) {
      setLocalizedValue(hero, "title", target.textContent.trim(), state);
    }
    if (target.classList.contains("hero-card-role") || target.classList.contains("hero-expanded-role")) {
      setLocalizedValue(hero, "role", target.textContent.trim(), state);
    }
    if (target.classList.contains("hero-card-text")) {
      setLocalizedValue(hero, "description", target.textContent.trim(), state);
    }
    if (target.classList.contains("hero-expanded-text")) {
      setLocalizedValue(hero, "fullDescription", target.textContent.trim(), state);
    }

    getRecorder().upsert("heroItem", hero.id, hero, { groupId: group.id });
  });

  els.heroesGroupsContainer.addEventListener("dblclick", (event) => {
    if (!state.editMode) return;
    const resolved = resolveHeroImageTarget(state, event.target);
    if (!resolved) return;

    event.preventDefault();
    const nextLabel = window.prompt("Подпись изображения", getLocalizedText(resolved.hero, "imageLabel", state, "Портрет героя"));
    if (nextLabel == null) return;

    setLocalizedValue(resolved.hero, "imageLabel", nextLabel.trim() || "Портрет героя", state);
    getRecorder().upsert("heroItem", resolved.hero.id, resolved.hero, { groupId: resolved.group.id });
    renderHeroes();
  });

  els.heroesGroupsContainer.addEventListener("click", (event) => {
    if (!state.editMode) return;

    const resetAccentButton = event.target.closest(".hero-accent-reset");
    if (resetAccentButton) {
      const expanded = resetAccentButton.closest(".hero-expanded");
      const resolved = resolveHeroFromNode(state, expanded);
      if (!resolved) return;

      event.preventDefault();
      event.stopPropagation();
      resolved.hero.accentColorOverride = "";
      getRecorder().upsert("heroItem", resolved.hero.id, resolved.hero, { groupId: resolved.group.id });
      renderHeroes();
      return;
    }

    // Related links turn hero cards into hubs that can jump into map, archive,
    // timeline, or other hero entries.
    const addLinkButton = event.target.closest(".hero-link-add");
    if (addLinkButton) {
      const expanded = addLinkButton.closest(".hero-expanded");
      const resolved = resolveHeroFromNode(state, expanded);
      if (!resolved) return;

      event.preventDefault();
      event.stopPropagation();
      const link = askForHeroLink(state);
      if (!link) return;

      resolved.hero.links = Array.isArray(resolved.hero.links) ? resolved.hero.links : [];
      resolved.hero.links.push(link);
      getRecorder().upsert("heroItem", resolved.hero.id, resolved.hero, { groupId: resolved.group.id });
      renderHeroes();
      return;
    }

    const existingLink = event.target.closest(".hero-link[data-link-index]");
    if (existingLink && event.altKey) {
      const expanded = existingLink.closest(".hero-expanded");
      const resolved = resolveHeroFromNode(state, expanded);
      if (!resolved) return;

      event.preventDefault();
      event.stopPropagation();
      const linkIndex = Number(existingLink.dataset.linkIndex);
      resolved.hero.links = (resolved.hero.links || []).filter((_, index) => index !== linkIndex);
      getRecorder().upsert("heroItem", resolved.hero.id, resolved.hero, { groupId: resolved.group.id });
      renderHeroes();
      return;
    }

    const resolved = resolveHeroImageTarget(state, event.target);
    if (!resolved) return;
    activeImageTarget = resolved;
    heroImageInput.click();
  });

  heroImageInput.addEventListener("change", async (event) => {
    const [file] = Array.from(event.target.files || []);
    if (file && activeImageTarget) {
      await applyHeroImageFile(file, activeImageTarget.group, activeImageTarget.hero);
    }
    heroImageInput.value = "";
    activeImageTarget = null;
  });

  els.heroesGroupsContainer.addEventListener("paste", async (event) => {
    if (!state.editMode) return;
    const resolved = resolveHeroImageTarget(state, event.target);
    if (!resolved) return;

    const imageItem = Array.from(event.clipboardData?.items || []).find((item) => item.type.startsWith("image/"));
    const file = imageItem?.getAsFile();
    if (!file) return;

    event.preventDefault();
    await applyHeroImageFile(file, resolved.group, resolved.hero);
  });

  els.heroesGroupsContainer.addEventListener("dragstart", (event) => {
    if (!state.editMode) return;
    const card = event.target.closest(".hero-card");
    if (!card) return;

    dragHeroMeta = {
      groupId: card.dataset.groupId,
      heroId: card.dataset.heroId,
    };
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${dragHeroMeta.groupId}:${dragHeroMeta.heroId}`);
  });

  els.heroesGroupsContainer.addEventListener("dragend", (event) => {
    const card = event.target.closest(".hero-card");
    if (card) card.classList.remove("dragging");
    dragHeroMeta = null;
  });

  els.heroesGroupsContainer.addEventListener("dragover", (event) => {
    if (!state.editMode) return;

    const imageTarget = resolveHeroImageTarget(state, event.target);
    if (imageTarget && !dragHeroMeta) {
      event.preventDefault();
      imageTarget.imageNode.classList.add("is-drop-target");
      event.dataTransfer.dropEffect = "copy";
      return;
    }

    if (!dragHeroMeta || !event.target.closest(".hero-card")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });

  els.heroesGroupsContainer.addEventListener("dragleave", (event) => {
    const imageNode = event.target?.closest?.(".hero-card-portrait, .hero-expanded-portrait");
    if (!imageNode) return;
    imageNode.classList.remove("is-drop-target");
  });

  els.heroesGroupsContainer.addEventListener("drop", async (event) => {
    if (!state.editMode) return;

    const imageTarget = resolveHeroImageTarget(state, event.target);
    if (imageTarget && !dragHeroMeta) {
      const [file] = Array.from(event.dataTransfer?.files || []);
      if (!file) return;

      event.preventDefault();
      imageTarget.imageNode.classList.remove("is-drop-target");
      await applyHeroImageFile(file, imageTarget.group, imageTarget.hero);
      return;
    }

    if (!dragHeroMeta) return;
    const targetCard = event.target.closest(".hero-card");
    if (!targetCard) return;
    event.preventDefault();

    const sourceGroup = state.heroesData.find((group) => group.id === dragHeroMeta.groupId);
    const targetGroup = state.heroesData.find((group) => group.id === targetCard.dataset.groupId);
    if (!sourceGroup || !targetGroup) return;

    sourceGroup.items = Array.isArray(sourceGroup.items) ? sourceGroup.items : [];
    targetGroup.items = Array.isArray(targetGroup.items) ? targetGroup.items : [];

    const movedHero = moveGroupedItemBeforeTarget({
      sourceItems: sourceGroup.items,
      targetItems: targetGroup.items,
      sourceId: dragHeroMeta.heroId,
      targetId: targetCard.dataset.heroId,
    });
    if (!movedHero) return;

    const recorder = getRecorder();
    if (sourceGroup.id !== targetGroup.id) {
      recorder.remove("heroItem", movedHero.id, { groupId: sourceGroup.id });
      remapHeroReferences?.(movedHero.id, sourceGroup.id, targetGroup.id, recorder);
    }

    syncGroupedSortOrder(sourceGroup.items, recorder, "heroItem", sourceGroup.id);
    if (sourceGroup.id !== targetGroup.id) {
      syncGroupedSortOrder(targetGroup.items, recorder, "heroItem", targetGroup.id);
    }

    renderHeroes();
  });
}
