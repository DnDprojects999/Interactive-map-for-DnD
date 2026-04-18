import {
  normalizePlayerRecord,
  resolvePlayerCharacters,
} from "./playerRoster.js";
import * as playerSidebarStorage from "./playerSidebarStorage.js";
import * as playerSidebarTargets from "./playerSidebarTargets.js";

// Favorites and notes are personal helpers layered on top of the project data,
// while the player roster itself is part of editable shared content.
const FAVORITES_STORAGE_KEY = "serkonia:player-favorites";
const NOTES_STORAGE_KEY = "serkonia:player-notes";
const MAX_FAVORITES = 24;
const MAX_NOTE_PAGES = 10;
const DEFAULT_PLAYER_LABEL = "Игрок";

function renderEmptyState(container, text) {
  const empty = document.createElement("div");
  empty.className = "player-popout-empty";
  empty.textContent = text;
  container.appendChild(empty);
}

export function createPlayerSidebarController(options) {
  const {
    els,
    state,
    getChangeRecorder,
    onNavigate,
    onPlayersChanged,
  } = options;

  let favorites = playerSidebarStorage.normalizeStoredFavorites(
    playerSidebarStorage.safeReadStorage(FAVORITES_STORAGE_KEY, []),
    playerSidebarTargets.normalizeTarget,
  );
  let notesState = playerSidebarStorage.normalizeNotesState(
    playerSidebarStorage.safeReadStorage(NOTES_STORAGE_KEY, ""),
  );
  let activePanel = null;

  function getRecorder() {
    const recorder = typeof getChangeRecorder === "function" ? getChangeRecorder() : null;
    return {
      upsert: typeof recorder?.upsert === "function" ? recorder.upsert : () => {},
      remove: typeof recorder?.remove === "function" ? recorder.remove : () => {},
    };
  }

  function getRoster() {
    return Array.isArray(state.playersData) ? state.playersData : [];
  }

  function persistFavorites() {
    playerSidebarStorage.safeWriteStorage(FAVORITES_STORAGE_KEY, favorites);
  }

  function persistNotes() {
    playerSidebarStorage.safeWriteStorage(NOTES_STORAGE_KEY, notesState);
  }

  function emitPlayersChanged() {
    onPlayersChanged?.();
  }

  function replaceRoster(nextRoster) {
    state.playersData = nextRoster;
    emitPlayersChanged();
  }

  function upsertPlayer(rawPlayer, fallbackId = "") {
    // Normalize every write so hero assignments stay consistent even if the
    // draft came from prompts, imported content, or partially old data.
    const normalized = normalizePlayerRecord(rawPlayer, state.heroesData, fallbackId || playerSidebarStorage.createLocalId("player"));
    if (!normalized) return null;

    const roster = getRoster();
    const index = roster.findIndex((entry) => entry.id === normalized.id);
    const nextRoster = [...roster];

    if (index >= 0) nextRoster[index] = normalized;
    else nextRoster.push(normalized);

    getRecorder().upsert("player", normalized.id, normalized);
    replaceRoster(nextRoster);
    renderPlayers();
    return normalized;
  }

  function removePlayer(playerId) {
    const roster = getRoster();
    const nextRoster = roster.filter((entry) => entry.id !== playerId);
    if (nextRoster.length === roster.length) return false;

    getRecorder().remove("player", playerId);
    replaceRoster(nextRoster);
    renderPlayers();
    return true;
  }

  function collectHeroAssignments() {
    const assignments = new Map();

    getRoster().forEach((player) => {
      (player.characters || []).forEach((character) => {
        if (!character?.id || !character?.groupId) return;
        assignments.set(playerSidebarTargets.createHeroKey(character.groupId, character.id), player);
      });
    });

    return assignments;
  }

  function getAvailableHeroOptions(player) {
    // A hero can only belong to one player at a time, so already-claimed heroes
    // are removed from the assignment picker for everyone else.
    const assignments = collectHeroAssignments();
    const currentAssignments = new Set(
      (player.characters || [])
        .filter((character) => character?.groupId && character?.id)
        .map((character) => playerSidebarTargets.createHeroKey(character.groupId, character.id)),
    );

    return (state.heroesData || []).flatMap((group) =>
      (group.items || [])
        .map((hero) => {
      const key = playerSidebarTargets.createHeroKey(group.id, hero.id);
          const owner = assignments.get(key);
          const occupiedByOtherPlayer = owner && owner.id !== player.id;

          if (currentAssignments.has(key) || occupiedByOtherPlayer) return null;

          return {
            value: key,
            label: hero.title || "Безымянный герой",
            meta: hero.role
              ? `${group.title || "Hall of Heroes"} \u00b7 ${hero.role}`
              : (group.title || "Hall of Heroes"),
          };
        })
        .filter(Boolean),
    );
  }

  function promptPlayerDraft(player = null) {
    const name = window.prompt("Имя игрока", player?.name || "");
    if (name == null) return null;

    const trimmedName = String(name).trim();
    if (!trimmedName) {
      window.alert("Имя игрока не может быть пустым.");
      return null;
    }

    const label = window.prompt("Короткая подпись игрока", player?.label || DEFAULT_PLAYER_LABEL);
    const notes = window.prompt("Короткая заметка об игроке", player?.notes || "");

    return {
      ...player,
      id: player?.id || playerSidebarStorage.createLocalId("player"),
      name: trimmedName,
      label: String(label ?? player?.label ?? DEFAULT_PLAYER_LABEL).trim() || DEFAULT_PLAYER_LABEL,
      notes: String(notes ?? player?.notes ?? "").trim(),
      characters: Array.isArray(player?.characters) ? player.characters : [],
    };
  }

  function createPlayer() {
    const draft = promptPlayerDraft();
    if (!draft) return;

    const created = upsertPlayer(draft, draft.id);
    if (!created) return;

    requestAnimationFrame(() => {
      const createdCard = els.playersList.querySelector(`[data-player-id="${created.id}"]`);
      createdCard?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }

  function editPlayer(playerId) {
    const player = getRoster().find((entry) => entry.id === playerId);
    if (!player) return;

    const draft = promptPlayerDraft(player);
    if (!draft) return;
    upsertPlayer(draft, player.id);
  }

  function attachHeroToPlayer(playerId, heroKey) {
    const player = getRoster().find((entry) => entry.id === playerId);
      const reference = playerSidebarTargets.parseHeroKey(heroKey);
    if (!player || !reference) return;

    const alreadyAssigned = (player.characters || []).some((character) =>
      character.id === reference.id && character.groupId === reference.groupId,
    );
    if (alreadyAssigned) return;

    upsertPlayer({
      ...player,
      characters: [...(player.characters || []), reference],
    }, player.id);
  }

  function detachHeroFromPlayer(playerId, groupId, heroId) {
    const player = getRoster().find((entry) => entry.id === playerId);
    if (!player) return;

    upsertPlayer({
      ...player,
      characters: (player.characters || []).filter((character) =>
        !(character.id === heroId && character.groupId === groupId),
      ),
    }, player.id);
  }

  /**
   * Notes must always have one active page so the textarea can be rebound
   * after deletions, migrations and partially broken localStorage payloads.
   */
  function getActiveNotePage() {
    if (!Array.isArray(notesState.pages) || !notesState.pages.length) {
      notesState = playerSidebarStorage.createDefaultNotesState();
      persistNotes();
    }

    const active = notesState.pages.find((page) => page.id === notesState.activePageId);
    if (active) return active;

      notesState.activePageId = notesState.pages[0]?.id || playerSidebarStorage.createNotePage().id;
    persistNotes();
    return notesState.pages.find((page) => page.id === notesState.activePageId) || notesState.pages[0] || null;
  }

  function setPlayerTarget(target) {
    state.playerCurrentTarget = playerSidebarTargets.normalizeTarget(target);
    if (activePanel === "favorites") renderFavorites();
    if (activePanel === "players") renderPlayers();
  }

  function composeTargetKey(target) {
    const normalized = playerSidebarTargets.normalizeTarget(target);
    if (!normalized) return "";
    return `${normalized.type}:${normalized.id}:${normalized.groupId || ""}`;
  }

  function remapTargets(remapTarget) {
    // Cross-links in favorites and the current selection should survive entity
    // moves, so remapping happens centrally instead of in each feature module.
    if (typeof remapTarget !== "function") return;

    let favoritesChanged = false;
    const dedupe = new Set();
    const nextFavorites = [];

    favorites.forEach((entry) => {
      const currentTarget = playerSidebarTargets.normalizeTarget(entry.target);
      if (!currentTarget) return;

      const remappedTarget = playerSidebarTargets.normalizeTarget(remapTarget(currentTarget) || currentTarget);
      if (!remappedTarget) return;

      const targetKey = composeTargetKey(remappedTarget);
      if (!targetKey || dedupe.has(targetKey)) return;
      dedupe.add(targetKey);

      if (!playerSidebarTargets.isSameTarget(currentTarget, remappedTarget)) favoritesChanged = true;
      nextFavorites.push({
        ...entry,
        target: remappedTarget,
      });
    });

    if (favoritesChanged || nextFavorites.length !== favorites.length) {
      favorites = nextFavorites;
      persistFavorites();
    }

    const currentTarget = playerSidebarTargets.normalizeTarget(state.playerCurrentTarget);
    if (currentTarget) {
    const remappedCurrentTarget = playerSidebarTargets.normalizeTarget(remapTarget(currentTarget) || currentTarget);
    if (!playerSidebarTargets.isSameTarget(currentTarget, remappedCurrentTarget)) {
        state.playerCurrentTarget = remappedCurrentTarget;
      }
    }

    if (activePanel === "favorites") renderFavorites();
    if (activePanel === "players") renderPlayers();
  }

  function remapHeroReference(heroId, fromGroupId, toGroupId) {
    const normalizedHeroId = String(heroId || "").trim();
    const normalizedFromGroupId = String(fromGroupId || "").trim();
    const normalizedToGroupId = String(toGroupId || "").trim();
    if (!normalizedHeroId || !normalizedFromGroupId || !normalizedToGroupId) return;

    remapTargets((target) => {
      if (
        target.type === "heroItem"
        && target.id === normalizedHeroId
        && String(target.groupId || "") === normalizedFromGroupId
      ) {
        return {
          ...target,
          groupId: normalizedToGroupId,
        };
      }
      return target;
    });
  }

  function remapArchiveItemReference(itemId, fromGroupId, toGroupId) {
    const normalizedItemId = String(itemId || "").trim();
    const normalizedFromGroupId = String(fromGroupId || "").trim();
    const normalizedToGroupId = String(toGroupId || "").trim();
    if (!normalizedItemId || !normalizedFromGroupId || !normalizedToGroupId) return;

    remapTargets((target) => {
      if (
        target.type === "archiveItem"
        && target.id === normalizedItemId
        && String(target.groupId || "") === normalizedFromGroupId
      ) {
        return {
          ...target,
          groupId: normalizedToGroupId,
        };
      }
      return target;
    });
  }

  function close() {
    activePanel = null;
    els.favoritesPanel.hidden = true;
    els.notesPanel.hidden = true;
    els.playersPanel.hidden = true;
    els.favoritesToggleButton.classList.remove("active");
    els.notesToggleButton.classList.remove("active");
    els.playersToggleButton.classList.remove("active");
  }

  function open(panelName) {
    activePanel = panelName;
    els.favoritesPanel.hidden = panelName !== "favorites";
    els.notesPanel.hidden = panelName !== "notes";
    els.playersPanel.hidden = panelName !== "players";
    els.favoritesToggleButton.classList.toggle("active", panelName === "favorites");
    els.notesToggleButton.classList.toggle("active", panelName === "notes");
    els.playersToggleButton.classList.toggle("active", panelName === "players");
    if (panelName === "favorites") renderFavorites();
    if (panelName === "notes") renderNotes();
    if (panelName === "players") renderPlayers();
  }

  function toggle(panelName) {
    if (activePanel === panelName) {
      close();
      return;
    }
    open(panelName);
  }

  function renderFavorites() {
    // Favorites are resolved lazily against current data. If an old favorite no
    // longer points to anything, it simply drops out of the visible list.
    const currentTarget = playerSidebarTargets.normalizeTarget(state.playerCurrentTarget);
    const currentDescription = playerSidebarTargets.describeTarget(state, currentTarget);
    const alreadySaved = currentTarget && favorites.some((entry) => playerSidebarTargets.isSameTarget(entry.target, currentTarget));

    if (!currentTarget || !currentDescription) {
      els.favoritesHint.textContent = "Открой метку, событие, архивную карточку или героя, а потом сохрани это место сюда.";
      els.addFavoriteButton.disabled = true;
    } else if (alreadySaved) {
      els.favoritesHint.textContent = `Сейчас открыто: ${currentDescription.title}. Эта запись уже лежит в избранном.`;
      els.addFavoriteButton.disabled = true;
    } else {
      els.favoritesHint.textContent = `Сейчас открыто: ${currentDescription.title} \u00b7 ${currentDescription.subtitle}. Можно сохранить в избранное.`;
      els.addFavoriteButton.disabled = false;
    }

    els.favoritesList.innerHTML = "";

    if (!favorites.length) {
      renderEmptyState(
        els.favoritesList,
        "Пока пусто. Собери здесь важные места, NPC, главы архива и ключевые события кампании.",
      );
      return;
    }

    let renderedCount = 0;

    favorites.forEach((entry) => {
      const description = playerSidebarTargets.describeTarget(state, entry.target);
      if (!description) return;
      renderedCount += 1;

      const row = document.createElement("div");
      row.className = "player-favorite-item";

      const button = document.createElement("button");
      button.className = "player-favorite-main";
      button.type = "button";
      button.addEventListener("click", () => {
        onNavigate?.(entry.target);
        close();
      });

      const badge = document.createElement("span");
      badge.className = "player-favorite-badge";
      badge.textContent = description.badge;

      const title = document.createElement("strong");
      title.textContent = description.title;

      const subtitle = document.createElement("span");
      subtitle.textContent = description.subtitle;

      button.append(badge, title, subtitle);

      const removeButton = document.createElement("button");
      removeButton.className = "player-favorite-remove";
      removeButton.type = "button";
      removeButton.textContent = "\u00d7";
      removeButton.title = "Убрать из избранного";
      removeButton.addEventListener("click", () => {
        favorites = favorites.filter((favorite) => favorite.id !== entry.id);
        persistFavorites();
        renderFavorites();
      });

      row.append(button, removeButton);
      els.favoritesList.appendChild(row);
    });

    if (renderedCount === 0) {
      renderEmptyState(
        els.favoritesList,
        "Сохранённые цели больше не находятся в текущих данных. Можно почистить список и собрать новый.",
      );
    }
  }

  function renderCharacterLinks(container, player, characters) {
    if (!characters.length) {
      const empty = document.createElement("span");
      empty.className = "player-roster-empty-note";
      empty.textContent = state.editMode
        ? "Персонаж пока не назначен. Выбери героя ниже."
        : "Персонаж пока не назначен.";
      container.appendChild(empty);
      return;
    }

    characters.forEach((character) => {
      if (state.editMode) {
        const chip = document.createElement("div");
        chip.className = "player-roster-chip";

        const button = document.createElement("button");
        button.className = "player-roster-link";
        button.type = "button";
        button.textContent = character.title;
        button.title = character.role
          ? `${character.title} \u00b7 ${character.role}`
          : character.groupTitle;
        button.classList.toggle(
          "active",
          state.currentHeroId === character.id && state.activeHeroGroupId === character.groupId,
        );
        button.addEventListener("click", () => {
          onNavigate?.({
            type: "heroItem",
            id: character.id,
            groupId: character.groupId,
          });
        });

        const removeButton = document.createElement("button");
        removeButton.className = "player-roster-chip-remove";
        removeButton.type = "button";
        removeButton.textContent = "\u00d7";
        removeButton.title = `Убрать героя ${character.title} из игрока ${player.name}`;
        removeButton.addEventListener("click", () => {
          detachHeroFromPlayer(player.id, character.groupId, character.id);
        });

        chip.append(button, removeButton);
        container.appendChild(chip);
        return;
      }

      const button = document.createElement("button");
      button.className = "player-roster-link";
      button.type = "button";
      button.textContent = character.title;
      button.title = character.role
        ? `${character.title} \u00b7 ${character.role}`
        : character.groupTitle;
      button.classList.toggle(
        "active",
        state.currentHeroId === character.id && state.activeHeroGroupId === character.groupId,
      );
      button.addEventListener("click", () => {
        onNavigate?.({
          type: "heroItem",
          id: character.id,
          groupId: character.groupId,
        });
        close();
      });
      container.appendChild(button);
    });
  }

  function renderPlayerEditor(item, player) {
    // In edit mode the roster becomes a lightweight assignment console: rename
    // players, remove them, and bind/unbind heroes in one place.
    const actions = document.createElement("div");
    actions.className = "player-roster-actions";

    const editButton = document.createElement("button");
    editButton.className = "player-roster-manage";
    editButton.type = "button";
    editButton.textContent = "Изм.";
    editButton.title = `Изменить игрока ${player.name}`;
    editButton.addEventListener("click", () => editPlayer(player.id));

    const deleteButton = document.createElement("button");
    deleteButton.className = "player-roster-manage player-roster-manage-danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Удал.";
    deleteButton.title = `Удалить игрока ${player.name}`;
    deleteButton.addEventListener("click", () => {
      const shouldDelete = window.confirm(`Удалить игрока "${player.name}" из реестра?`);
      if (!shouldDelete) return;
      removePlayer(player.id);
    });

    actions.append(editButton, deleteButton);
    item.appendChild(actions);

    const heroOptions = getAvailableHeroOptions(player);
    const assignRow = document.createElement("div");
    assignRow.className = "player-roster-assign";

    const select = document.createElement("select");
    select.className = "player-roster-select";
    select.disabled = !heroOptions.length;

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = heroOptions.length
      ? "Выбери героя для привязки"
      : "Свободных героев сейчас нет";
    select.appendChild(placeholder);

    heroOptions.forEach((option) => {
      const optionNode = document.createElement("option");
      optionNode.value = option.value;
      optionNode.textContent = `${option.label} \u00b7 ${option.meta}`;
      select.appendChild(optionNode);
    });

    const addButton = document.createElement("button");
    addButton.className = "player-roster-manage";
    addButton.type = "button";
    addButton.textContent = "+ Герой";
    addButton.disabled = !heroOptions.length;
    addButton.addEventListener("click", () => {
      if (!select.value) return;
      attachHeroToPlayer(player.id, select.value);
    });

    assignRow.append(select, addButton);
    item.appendChild(assignRow);
  }

  function renderPlayers() {
    // Viewer mode and editor mode intentionally have different empty-state copy:
    // one explains the feature, the other nudges the creator toward setup.
    const roster = getRoster();
    els.playersEditorBar.hidden = !state.editMode;
    els.playersEditorHint.textContent = state.editMode
      ? "Редактор включён: добавляй игроков, меняй их подписи и сразу привязывай героев."
      : "Это живой список игроков кампании и их текущих персонажей.";
    els.playersList.innerHTML = "";

    if (!roster.length) {
      renderEmptyState(
        els.playersList,
        state.editMode
          ? "Реестр пока пуст. Нажми «+ Игрок», чтобы собрать состав стола прямо из интерфейса."
          : "Список игроков пока не заполнен. Включи edit mode, чтобы добавить участников.",
      );
      return;
    }

    roster.forEach((player) => {
      const item = document.createElement("article");
      item.className = "player-roster-item";
      item.dataset.playerId = player.id;

      const header = document.createElement("div");
      header.className = "player-roster-head";

      const titleWrap = document.createElement("div");
      titleWrap.className = "player-roster-title";

      const name = document.createElement("strong");
      name.textContent = player.name;
      titleWrap.appendChild(name);

      if (player.label) {
        const tag = document.createElement("span");
        tag.className = "player-roster-tag";
        tag.textContent = player.label;
        titleWrap.appendChild(tag);
      }

      header.appendChild(titleWrap);
      item.appendChild(header);

      if (player.notes) {
        const notes = document.createElement("p");
        notes.className = "player-roster-note";
        notes.textContent = player.notes;
        item.appendChild(notes);
      }

      const links = document.createElement("div");
      links.className = "player-roster-links";
      renderCharacterLinks(links, player, resolvePlayerCharacters(player, state.heroesData));
      item.appendChild(links);

      if (state.editMode) {
        renderPlayerEditor(item, player);
      }

      els.playersList.appendChild(item);
    });
  }

  function addCurrentFavorite() {
    const target = playerSidebarTargets.normalizeTarget(state.playerCurrentTarget);
    const description = playerSidebarTargets.describeTarget(state, target);
    if (!target || !description) return;

    const existing = favorites.find((entry) => playerSidebarTargets.isSameTarget(entry.target, target));
    if (existing) {
      favorites = [existing, ...favorites.filter((entry) => entry.id !== existing.id)];
      persistFavorites();
      renderFavorites();
      return;
    }

    favorites = [
      {
        id: playerSidebarStorage.createLocalId("favorite"),
        target,
        createdAt: new Date().toISOString(),
      },
      ...favorites,
    ].slice(0, MAX_FAVORITES);
    persistFavorites();
    renderFavorites();
  }

  function renderNotes() {
    // Notes are page-based so long campaign journals stay manageable and do not
    // collapse into one ever-growing textarea.
    const activePage = getActiveNotePage();
    if (!activePage) return;

    els.notesPagesList.innerHTML = "";
    notesState.pages.forEach((page) => {
      const tab = document.createElement("button");
      tab.className = "player-notes-tab";
      tab.type = "button";
      tab.textContent = page.label;
      tab.title = `${page.label}${page.text.trim() ? " \u00b7 есть заметки" : ""}`;
      tab.classList.toggle("active", page.id === notesState.activePageId);
      tab.addEventListener("click", () => {
        notesState.activePageId = page.id;
        persistNotes();
        renderNotes();
      });
      tab.addEventListener("dblclick", () => renameNotePage(page.id));
      els.notesPagesList.appendChild(tab);
    });

    els.addNotesPageButton.disabled = notesState.pages.length >= MAX_NOTE_PAGES;
    els.deleteNotesPageButton.disabled = notesState.pages.length <= 1;

    if (document.activeElement !== els.notesTextarea) {
      els.notesTextarea.value = activePage.text;
    }

    const trimmed = activePage.text.trim();
    if (!trimmed) {
      els.notesStatus.textContent = `Страница "${activePage.label}" пока пуста, но уже ждёт великих открытий.`;
      return;
    }

    const lines = trimmed.split(/\r?\n/).filter((line) => line.trim()).length;
    const chars = trimmed.length;
    els.notesStatus.textContent = `Страница "${activePage.label}" сохранена локально: ${lines} стр. \u00b7 ${chars} символов.`;
  }

  function clearNotes() {
    const activePage = getActiveNotePage();
    if (!activePage) return;
    activePage.text = "";
    persistNotes();
    els.notesTextarea.value = "";
    renderNotes();
  }

  function addNotePage() {
    if (notesState.pages.length >= MAX_NOTE_PAGES) return;
    const label = window.prompt("Короткое имя страницы заметок (до 5 символов)", "Город");
    if (label == null) return;

      const page = playerSidebarStorage.createNotePage(label);
    notesState.pages.push(page);
    notesState.activePageId = page.id;
    persistNotes();
    renderNotes();
    els.notesTextarea.focus();
  }

  function renameNotePage(pageId) {
    const page = notesState.pages.find((entry) => entry.id === pageId);
    if (!page) return;

    const label = window.prompt("Новое короткое имя страницы (до 5 символов)", page.label);
    if (label == null) return;

      page.label = playerSidebarStorage.normalizeNotePageLabel(label);
    persistNotes();
    renderNotes();
  }

  function deleteCurrentNotePage() {
    if (notesState.pages.length <= 1) {
      clearNotes();
      return;
    }

    const activePage = getActiveNotePage();
    if (!activePage) return;

    const shouldDelete = window.confirm(`Удалить страницу "${activePage.label}"?`);
    if (!shouldDelete) return;

    const activeIndex = notesState.pages.findIndex((page) => page.id === activePage.id);
    notesState.pages = notesState.pages.filter((page) => page.id !== activePage.id);
    const fallbackIndex = Math.max(0, Math.min(activeIndex, notesState.pages.length - 1));
    notesState.activePageId = notesState.pages[fallbackIndex]?.id || notesState.pages[0]?.id || "";
    persistNotes();
    renderNotes();
  }

  function setup() {
    renderFavorites();
    renderNotes();
    renderPlayers();

    els.favoritesToggleButton.addEventListener("click", () => toggle("favorites"));
    els.notesToggleButton.addEventListener("click", () => toggle("notes"));
    els.playersToggleButton.addEventListener("click", () => toggle("players"));
    els.favoritesCloseButton.addEventListener("click", close);
    els.notesCloseButton.addEventListener("click", close);
    els.playersCloseButton.addEventListener("click", close);
    els.addFavoriteButton.addEventListener("click", addCurrentFavorite);
    els.addPlayerButton.addEventListener("click", createPlayer);
    els.clearNotesButton.addEventListener("click", clearNotes);
    els.addNotesPageButton.addEventListener("click", addNotePage);
    els.deleteNotesPageButton.addEventListener("click", deleteCurrentNotePage);
    els.notesTextarea.addEventListener("input", () => {
      const activePage = getActiveNotePage();
      if (!activePage) return;
      activePage.text = els.notesTextarea.value;
      persistNotes();
      renderNotes();
    });

    document.addEventListener("click", (event) => {
      if (els.favoritesPanel.hidden && els.notesPanel.hidden && els.playersPanel.hidden) return;
      if (
        els.favoritesPanel.contains(event.target)
        || els.notesPanel.contains(event.target)
        || els.playersPanel.contains(event.target)
        || els.favoritesToggleButton.contains(event.target)
        || els.notesToggleButton.contains(event.target)
        || els.playersToggleButton.contains(event.target)
      ) {
        return;
      }
      close();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && activePanel) close();
    });
  }

  return {
    close,
    open,
    remapArchiveItemReference,
    remapHeroReference,
    renderFavorites,
    renderNotes,
    renderPlayers,
    setPlayerTarget,
    setup,
    toggle,
  };
}
