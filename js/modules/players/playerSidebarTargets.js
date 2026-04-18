import { getLocalizedText } from "../localization.js";

// Player-side favorites and navigation only need lightweight target references.
// This module normalizes and describes those references across subsystems.
function normalizeTarget(target) {
  if (!target || typeof target !== "object" || !target.type || !target.id) return null;
  return {
    type: String(target.type),
    id: String(target.id),
    groupId: target.groupId ? String(target.groupId) : undefined,
  };
}

function isSameTarget(left, right) {
  return Boolean(
    left
    && right
    && left.type === right.type
    && left.id === right.id
    && String(left.groupId || "") === String(right.groupId || "")
  );
}

const TARGET_DESCRIBERS = {
  marker(state, target) {
    const marker = state.markersData.find((entry) => entry.id === target.id);
    if (!marker) return null;
    return {
      title: marker.title || "Метка карты",
      subtitle: marker.type || "Карта",
      badge: "Карта",
    };
  },
  activeMarker(state, target) {
    const marker = (state.activeMapData?.markers || []).find((entry) => entry.id === target.id);
    if (!marker) return null;
    return {
      title: marker.title || "Активное событие",
      subtitle: marker.type || "Active Map",
      badge: "Актив",
    };
  },
  timeline(state, target) {
    const event = state.eventsData.find((entry) => entry.id === target.id);
    if (!event) return null;
    return {
      title: event.title || "Событие",
      subtitle: event.year || "Timeline",
      badge: "Время",
    };
  },
  archiveGroup(state, target) {
    const group = state.archiveData.find((entry) => entry.id === target.id);
    if (!group) return null;
    return {
      title: group.title || "Глава архива",
      subtitle: "Archive",
      badge: "Архив",
    };
  },
  archiveItem(state, target) {
    const group = state.archiveData.find((entry) => entry.id === target.groupId);
    const item = group?.items?.find((entry) => entry.id === target.id);
    if (!group || !item) return null;
    return {
      title: item.title || "Карточка архива",
      subtitle: group.title || "Archive",
      badge: "Архив",
    };
  },
  heroGroup(state, target) {
    const group = state.heroesData.find((entry) => entry.id === target.id);
    if (!group) return null;
    return {
      title: group.title || "Группа героев",
      subtitle: group.subtitle || "Hall of Heroes",
      badge: "Герои",
    };
  },
  heroItem(state, target) {
    const group = state.heroesData.find((entry) => entry.id === target.groupId);
    const hero = group?.items?.find((entry) => entry.id === target.id);
    if (!group || !hero) return null;
    return {
      title: hero.title || "Герой",
      subtitle: group.title || "Hall of Heroes",
      badge: "Герои",
    };
  },
};

function describeTarget(state, target) {
  // Description first resolves the raw entity, then localizes visible labels so
  // player tools follow the current UI language.
  const normalized = normalizeTarget(target);
  if (!normalized) return null;
  const described = TARGET_DESCRIBERS[normalized.type]?.(state, normalized) || null;
  if (!described) return null;

  if (normalized.type === "marker") {
    const marker = state.markersData.find((entry) => entry.id === normalized.id);
    if (!marker) return described;
    return {
      ...described,
      title: getLocalizedText(marker, "title", state, described.title),
      subtitle: getLocalizedText(marker, "type", state, described.subtitle),
    };
  }

  if (normalized.type === "activeMarker") {
    const marker = (state.activeMapData?.markers || []).find((entry) => entry.id === normalized.id);
    if (!marker) return described;
    return {
      ...described,
      title: getLocalizedText(marker, "title", state, described.title),
      subtitle: getLocalizedText(marker, "type", state, described.subtitle),
    };
  }

  if (normalized.type === "timeline") {
    const event = state.eventsData.find((entry) => entry.id === normalized.id);
    if (!event) return described;
    return {
      ...described,
      title: getLocalizedText(event, "title", state, described.title),
      subtitle: getLocalizedText(event, "year", state, described.subtitle),
    };
  }

  if (normalized.type === "archiveGroup") {
    const group = state.archiveData.find((entry) => entry.id === normalized.id);
    if (!group) return described;
    return {
      ...described,
      title: getLocalizedText(group, "title", state, described.title),
    };
  }

  if (normalized.type === "archiveItem") {
    const group = state.archiveData.find((entry) => entry.id === normalized.groupId);
    const item = group?.items?.find((entry) => entry.id === normalized.id);
    if (!group || !item) return described;
    return {
      ...described,
      title: getLocalizedText(item, "title", state, described.title),
      subtitle: getLocalizedText(group, "title", state, described.subtitle),
    };
  }

  if (normalized.type === "heroGroup") {
    const group = state.heroesData.find((entry) => entry.id === normalized.id);
    if (!group) return described;
    return {
      ...described,
      title: getLocalizedText(group, "title", state, described.title),
      subtitle: getLocalizedText(group, "subtitle", state, described.subtitle),
    };
  }

  if (normalized.type === "heroItem") {
    const group = state.heroesData.find((entry) => entry.id === normalized.groupId);
    const hero = group?.items?.find((entry) => entry.id === normalized.id);
    if (!group || !hero) return described;
    return {
      ...described,
      title: getLocalizedText(hero, "title", state, described.title),
      subtitle: getLocalizedText(group, "title", state, described.subtitle),
    };
  }

  return described;
}

function createHeroKey(groupId, heroId) {
  return `${groupId}::${heroId}`;
}

function parseHeroKey(value) {
  const [groupId, id] = String(value || "").split("::");
  if (!groupId || !id) return null;
  return { groupId, id };
}

export {
  normalizeTarget,
  isSameTarget,
  describeTarget,
  createHeroKey,
  parseHeroKey,
};
