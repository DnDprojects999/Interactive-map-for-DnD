import { getLocalizedText, normalizeTranslationsMap } from "./localization.js";

// Map views describe presentation modes, not different maps. Multiple modes can
// still point at the same texture while exposing different labels to the user.
export const DEFAULT_MAP_VIEWS = Object.freeze([
  {
    id: "author",
    label: "Авторский",
    textureKey: "author",
    userVisible: true,
    translations: {
      en: {
        label: "Author",
      },
    },
  },
  {
    id: "vector",
    label: "Вектор",
    textureKey: "interactive",
    userVisible: true,
    translations: {
      en: {
        label: "Vector",
      },
    },
  },
  {
    id: "vector-colored",
    label: "Вектор + цвет",
    textureKey: "interactive",
    userVisible: true,
    translations: {
      en: {
        label: "Vector + color",
      },
    },
  },
]);

function normalizeModeId(value, fallback = "mode") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return normalized || fallback;
}

function cloneTranslations(rawValue) {
  return normalizeTranslationsMap(rawValue);
}

export function normalizeMapViewEntry(rawValue, index = 0) {
  const defaults = DEFAULT_MAP_VIEWS[index] || DEFAULT_MAP_VIEWS[0];
  const id = normalizeModeId(rawValue?.id || defaults.id || `mode-${index + 1}`, `mode-${index + 1}`);
  const label = String(rawValue?.label || defaults.label || id).trim() || defaults.label || id;
  const textureKey = normalizeModeId(rawValue?.textureKey || defaults.textureKey || id, id);
  return {
    id,
    label,
    textureKey,
    userVisible: rawValue?.userVisible !== false,
    translations: cloneTranslations(rawValue?.translations || defaults.translations),
  };
}

export function normalizeMapViews(rawValue) {
  // Normalization also deduplicates ids so one broken config entry does not
  // break the switcher for the whole project.
  const source = Array.isArray(rawValue) && rawValue.length ? rawValue : DEFAULT_MAP_VIEWS;
  const views = [];
  const seenIds = new Set();

  source.forEach((entry, index) => {
    const normalized = normalizeMapViewEntry(entry, index);
    if (seenIds.has(normalized.id)) return;
    seenIds.add(normalized.id);
    views.push(normalized);
  });

  if (!views.length) {
    return DEFAULT_MAP_VIEWS.map((entry, index) => normalizeMapViewEntry(entry, index));
  }

  return views;
}

export function getMapViews(worldData, { includeHidden = true } = {}) {
  const views = normalizeMapViews(worldData?.mapViews);
  return includeHidden ? views : views.filter((entry) => entry.userVisible !== false);
}

export function resolveMapViewMode(worldData, requestedMode) {
  const views = getMapViews(worldData);
  const requestedId = normalizeModeId(requestedMode || views[0]?.id || "author", views[0]?.id || "author");
  return views.some((entry) => entry.id === requestedId) ? requestedId : (views[0]?.id || "author");
}

export function getMapViewConfig(worldData, modeId) {
  const resolvedMode = resolveMapViewMode(worldData, modeId);
  return getMapViews(worldData).find((entry) => entry.id === resolvedMode) || normalizeMapViewEntry(DEFAULT_MAP_VIEWS[0], 0);
}

export function getMapViewTextureKey(worldData, modeId) {
  return getMapViewConfig(worldData, modeId).textureKey || resolveMapViewMode(worldData, modeId);
}

export function getMapViewLabel(view, context, fallback = "Map mode") {
  return getLocalizedText(view, "label", context, fallback);
}

export function canUserSeeMapViewSwitcher(worldData) {
  return getMapViews(worldData, { includeHidden: false }).length > 1 && worldData?.mapViewSwitcherVisible !== false;
}
