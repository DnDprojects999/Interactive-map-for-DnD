import { getLocalizedText, getLocalizedValue } from "./localization.js";

const SEARCH_LIMIT = 18;
const SEARCH_KIND_TOKENS = Object.freeze({
  marker: "map",
  activeMarker: "active",
  timeline: "timeline",
  archiveGroup: "archive",
  archiveItem: "archive",
  heroGroup: "heroes",
  heroItem: "heroes",
});

function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function hasUsefulQuery(query) {
  return normalize(query).length >= 2;
}

function compactText(parts) {
  return parts.filter(Boolean).join(" В· ");
}

// Search is intentionally built as a lightweight in-memory index from current
// state so it automatically reflects editor changes without extra syncing.
function createSearchIndex(state) {
  const entries = [];

  state.markersData.forEach((marker) => {
    const title = getLocalizedText(marker, "title", state, "Метка");
    const type = getLocalizedText(marker, "type", state, "Карта");
    const description = getLocalizedText(marker, "description", state, "");
    const facts = getLocalizedValue(marker, "facts", state, []) || [];
    entries.push({
      type: "marker",
      id: marker.id,
      title,
      label: "Карта",
      excerpt: compactText([type, description, ...facts]),
      haystack: normalize([title, type, description, ...facts].join(" ")),
    });
  });

  (state.activeMapData?.markers || []).forEach((marker) => {
    const title = getLocalizedText(marker, "title", state, "Активное событие");
    const type = getLocalizedText(marker, "type", state, "Active Map");
    const description = getLocalizedText(marker, "description", state, "");
    const facts = getLocalizedValue(marker, "facts", state, []) || [];
    entries.push({
      type: "activeMarker",
      id: marker.id,
      title,
      label: "Active Map",
      excerpt: compactText([type, description, ...facts]),
      haystack: normalize([title, type, description, ...facts].join(" ")),
    });
  });

  state.eventsData.forEach((event) => {
    const year = getLocalizedText(event, "year", state, "");
    const title = getLocalizedText(event, "title", state, "Событие");
    const description = getLocalizedText(event, "description", state, "");
    entries.push({
      type: "timeline",
      id: event.id,
      title,
      label: year || "Timeline",
      excerpt: description,
      haystack: normalize([year, title, description].join(" ")),
    });
  });

  state.archiveData.forEach((group) => {
    const groupTitle = getLocalizedText(group, "title", state, "Раздел архива");
    entries.push({
      type: "archiveGroup",
      id: group.id,
      title: groupTitle,
      label: "Archive",
      excerpt: "Раздел архива",
      haystack: normalize(groupTitle),
    });

    (group.items || []).forEach((item) => {
      const title = getLocalizedText(item, "title", state, "Карточка архива");
      const description = getLocalizedText(item, "description", state, "");
      const fullDescription = getLocalizedText(item, "fullDescription", state, "");
      entries.push({
        type: "archiveItem",
        id: item.id,
        groupId: group.id,
        title,
        label: groupTitle || "Archive",
        excerpt: compactText([description, fullDescription]),
        haystack: normalize([groupTitle, title, description, fullDescription].join(" ")),
      });
    });
  });

  state.heroesData.forEach((group) => {
    const groupTitle = getLocalizedText(group, "title", state, "Группа героев");
    const groupSubtitle = getLocalizedText(group, "subtitle", state, "");
    entries.push({
      type: "heroGroup",
      id: group.id,
      title: groupTitle,
      label: "Hall of Heroes",
      excerpt: groupSubtitle,
      haystack: normalize([groupTitle, groupSubtitle].join(" ")),
    });

    (group.items || []).forEach((hero) => {
      const title = getLocalizedText(hero, "title", state, "Герой");
      const role = getLocalizedText(hero, "role", state, "");
      const description = getLocalizedText(hero, "description", state, "");
      const fullDescription = getLocalizedText(hero, "fullDescription", state, "");
      entries.push({
        type: "heroItem",
        id: hero.id,
        groupId: group.id,
        title,
        label: groupTitle || "Hall of Heroes",
        excerpt: compactText([role, description, fullDescription]),
        haystack: normalize([groupTitle, title, role, description, fullDescription].join(" ")),
      });
    });
  });

  return entries;
}

function scoreEntry(entry, query) {
  // Simple heuristic scoring is enough here: exact title match beats prefix,
  // prefix beats substring, and metadata matches rank lower.
  const title = normalize(entry.title);
  const label = normalize(entry.label);
  if (title === query) return 100;
  if (title.startsWith(query)) return 80;
  if (title.includes(query)) return 62;
  if (label.includes(query)) return 42;
  if (entry.haystack.includes(query)) return 26;
  return 0;
}

export function createGlobalSearchController(options) {
  const {
    els,
    state,
    onNavigate,
  } = options;

  let currentResults = [];

  // Search panel is ephemeral UI, so open/close just toggles visibility and
  // leaves the actual index to be rebuilt on demand.
  function close() {
    els.globalSearchPanel.hidden = true;
    document.body.classList.remove("search-open");
  }

  function renderResults(query) {
    const normalizedQuery = normalize(query);
    els.globalSearchResults.innerHTML = "";

    if (!hasUsefulQuery(normalizedQuery)) {
      const empty = document.createElement("div");
      empty.className = "global-search-empty";
      empty.textContent = "Начни вводить минимум 2 символа.";
      els.globalSearchResults.appendChild(empty);
      currentResults = [];
      return;
    }

    currentResults = createSearchIndex(state)
      .map((entry) => ({ ...entry, score: scoreEntry(entry, normalizedQuery) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, SEARCH_LIMIT);

    if (!currentResults.length) {
      const empty = document.createElement("div");
      empty.className = "global-search-empty";
      empty.textContent = "Ничего не нашлось. Попробуй другое слово.";
      els.globalSearchResults.appendChild(empty);
      return;
    }

    currentResults.forEach((entry) => {
      const button = document.createElement("button");
      button.className = "global-search-result";
      button.type = "button";
      button.dataset.searchKind = SEARCH_KIND_TOKENS[entry.type] || "default";

      const kind = document.createElement("span");
      kind.className = "global-search-result-kind";
      kind.textContent = entry.label;

      const title = document.createElement("strong");
      title.textContent = entry.title;

      const excerpt = document.createElement("span");
      excerpt.textContent = entry.excerpt || "Перейти к записи";

      button.append(kind, title, excerpt);
      button.addEventListener("click", () => {
        close();
        onNavigate(entry);
      });
      els.globalSearchResults.appendChild(button);
    });
  }

  function open() {
    els.globalSearchPanel.hidden = false;
    document.body.classList.add("search-open");
    els.globalSearchInput.focus();
    els.globalSearchInput.select();
    renderResults(els.globalSearchInput.value);
  }

  function setup() {
    els.globalSearchButton.addEventListener("click", open);
    els.globalSearchCloseButton.addEventListener("click", close);
    els.globalSearchInput.addEventListener("input", () => renderResults(els.globalSearchInput.value));
    els.globalSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Enter" || !currentResults[0]) return;
      event.preventDefault();
      close();
      onNavigate(currentResults[0]);
    });
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open();
      }
    });
  }

  return {
    close,
    open,
    setup,
  };
}
