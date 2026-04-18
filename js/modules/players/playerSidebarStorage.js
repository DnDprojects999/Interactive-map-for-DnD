const FAVORITES_STORAGE_KEY = "serkonia:player-favorites";
const NOTES_STORAGE_KEY = "serkonia:player-notes";
const MAX_FAVORITES = 24;
const MAX_NOTE_PAGES = 10;
const MAX_NOTE_PAGE_LABEL = 5;
const DEFAULT_NOTE_PAGE_LABEL = "Общ.";

// Storage helpers intentionally fail softly: favorites and notes are personal
// conveniences, so broken localStorage should never break the whole app.
function createLocalId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function safeReadStorage(key, fallback) {
  try {
    const raw = window.localStorage?.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function safeWriteStorage(key, value) {
  try {
    window.localStorage?.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Storage failures should not break the rest of the UI.
  }
}

function normalizeNotePageLabel(value) {
  const normalized = String(value || "").trim().slice(0, MAX_NOTE_PAGE_LABEL);
  return normalized || DEFAULT_NOTE_PAGE_LABEL;
}

function createNotePage(label = DEFAULT_NOTE_PAGE_LABEL, text = "") {
  return {
    id: createLocalId("note-page"),
    label: normalizeNotePageLabel(label),
    text: String(text || ""),
  };
}

function createDefaultNotesState(text = "") {
  const page = createNotePage(DEFAULT_NOTE_PAGE_LABEL, text);
  return {
    activePageId: page.id,
    pages: [page],
  };
}

function normalizeNotesState(rawValue) {
  if (typeof rawValue === "string") {
    return createDefaultNotesState(rawValue);
  }

  if (!rawValue || typeof rawValue !== "object") {
    return createDefaultNotesState();
  }

  const pages = (Array.isArray(rawValue.pages) ? rawValue.pages : [])
    .map((page) => ({
      id: String(page?.id || createLocalId("note-page")),
      label: normalizeNotePageLabel(page?.label),
      text: String(page?.text || ""),
    }))
    .filter((page) => page.id);

  if (!pages.length) return createDefaultNotesState();

  const activePageId = pages.some((page) => page.id === rawValue.activePageId)
    ? rawValue.activePageId
    : pages[0].id;

  return { activePageId, pages };
}

function normalizeStoredFavorites(rawFavorites, normalizeTarget) {
  // Favorites are normalized through normalizeTarget so stale or broken entries
  // do not survive into the visible list.
  if (!Array.isArray(rawFavorites)) return [];
  return rawFavorites
    .map((entry) => ({
      id: String(entry?.id || createLocalId("favorite")),
      target: normalizeTarget(entry?.target),
      createdAt: entry?.createdAt || new Date().toISOString(),
    }))
    .filter((entry) => entry.target);
}

export {
  DEFAULT_NOTE_PAGE_LABEL,
  FAVORITES_STORAGE_KEY,
  NOTES_STORAGE_KEY,
  MAX_FAVORITES,
  MAX_NOTE_PAGES,
  createLocalId,
  safeReadStorage,
  safeWriteStorage,
  normalizeNotePageLabel,
  createNotePage,
  createDefaultNotesState,
  normalizeNotesState,
  normalizeStoredFavorites,
};
