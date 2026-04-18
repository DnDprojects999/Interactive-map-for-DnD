import { getLocalizedText } from "../localization.js";
import { getUiText } from "../uiLocale.js";

const FALLBACK_HERO_ACCENT = "#b98a4b";

// View factories for hero cards and expanded cards. The controller decides when
// they open; this file decides how compact and expanded hero states are built.
function setEditable(element, editMode) {
  element.contentEditable = String(Boolean(editMode));
}

function getHeroAccent(hero) {
  return hero.accentColorOverride || hero.accentColor || FALLBACK_HERO_ACCENT;
}

function normalizeColorValue(value) {
  const normalized = String(value || "").trim();
  return /^#[\da-f]{6}$/i.test(normalized) ? normalized : FALLBACK_HERO_ACCENT;
}

function applyHeroAccent(element, hero) {
  element.style.setProperty("--hero-accent", getHeroAccent(hero));
}

function createAssignedPlayersLine(players, localizationContext, expanded = false) {
  // Hero cards can surface which players currently use this hero, which helps
  // the Hall of Heroes double as a roster overview.
  if (!Array.isArray(players) || !players.length) return null;

  const wrap = document.createElement("div");
  wrap.className = expanded ? "hero-player-badges" : "hero-player-line";

  const label = document.createElement("span");
  label.className = "hero-player-label";
  label.textContent = players.length > 1
    ? getUiText(localizationContext, "heroes_player_plural")
    : getUiText(localizationContext, "heroes_player_single");
  wrap.appendChild(label);

  if (expanded) {
    players.forEach((player) => {
      const badge = document.createElement("span");
      badge.className = "hero-player-chip";
      badge.textContent = player.label ? `${player.name} \u00b7 ${player.label}` : player.name;
      wrap.appendChild(badge);
    });
    return wrap;
  }

  const names = document.createElement("span");
  names.className = "hero-player-name";
  names.textContent = players.map((player) => player.name).join(", ");
  wrap.appendChild(names);
  return wrap;
}

function createHeroImage(hero, className, localizationContext) {
  const imageWrap = document.createElement("div");
  imageWrap.className = className;

  if (hero.imageUrl) {
    const image = document.createElement("img");
    if (!hero.imageUrl.startsWith("data:")) image.crossOrigin = "anonymous";
    image.src = hero.imageUrl;
    image.alt = getLocalizedText(
      hero,
      "imageLabel",
      localizationContext,
      getLocalizedText(hero, "title", localizationContext, "Hero portrait"),
    );
    image.loading = "lazy";
    imageWrap.appendChild(image);
  } else {
    const placeholder = document.createElement("span");
    placeholder.textContent = getLocalizedText(
      hero,
      "imageLabel",
      localizationContext,
      getUiText(localizationContext, "heroes_add_portrait"),
    );
    imageWrap.appendChild(placeholder);
  }

  return imageWrap;
}

// Accent controls let editors override the auto-picked portrait color when the
// sampled dominant color is not visually pleasant.
function createAccentControls(hero, localizationContext) {
  const controls = document.createElement("div");
  controls.className = "hero-accent-controls";

  const label = document.createElement("label");
  label.className = "hero-accent-label";

  const labelText = document.createElement("span");
  labelText.textContent = getUiText(localizationContext, "heroes_accent");

  const input = document.createElement("input");
  input.className = "hero-accent-picker";
  input.type = "color";
  input.value = normalizeColorValue(getHeroAccent(hero));
  input.dataset.heroAccentInput = "true";
  input.title = getUiText(localizationContext, "heroes_accent_title");

  label.append(labelText, input);
  controls.appendChild(label);

  const reset = document.createElement("button");
  reset.className = "hero-accent-reset";
  reset.type = "button";
  reset.textContent = getUiText(localizationContext, "heroes_auto");
  reset.title = getUiText(localizationContext, "heroes_auto_title");
  reset.hidden = !hero.accentColorOverride;
  controls.appendChild(reset);

  return controls;
}

export function createHeroCard(hero, group, options) {
  const {
    editMode,
    onOpen,
    getAssignedPlayers = () => [],
    localizationContext = null,
  } = options;

  // Compact hero cards stay intentionally short because large hero groups may
  // render many of them on the page at once.
  const card = document.createElement("article");
  card.className = "hero-card";
  card.dataset.groupId = group.id;
  card.dataset.heroId = hero.id;
  card.dataset.cardId = `${group.id}-${hero.id}`;
  card.draggable = Boolean(editMode);
  applyHeroAccent(card, hero);

  if (editMode) {
    const openButton = document.createElement("button");
    openButton.className = "hero-card-open-edit";
    openButton.type = "button";
    openButton.textContent = getUiText(localizationContext, "heroes_open");
    openButton.addEventListener("click", (event) => {
      event.stopPropagation();
      onOpen(card, hero, group.id);
    });
    card.appendChild(openButton);
  }

  card.appendChild(createHeroImage(hero, "hero-card-portrait", localizationContext));

  const body = document.createElement("div");
  body.className = "hero-card-body";

  const title = document.createElement("h3");
  title.className = "hero-card-title";
  title.textContent = getLocalizedText(hero, "title", localizationContext, getUiText(localizationContext, "heroes_new_hero"));
  setEditable(title, editMode);

  const role = document.createElement("div");
  role.className = "hero-card-role";
  role.textContent = getLocalizedText(hero, "role", localizationContext, getUiText(localizationContext, "heroes_role"));
  setEditable(role, editMode);
  const assignedPlayers = getAssignedPlayers(group.id, hero.id);
  const playersLine = createAssignedPlayersLine(assignedPlayers, localizationContext);

  const text = document.createElement("p");
  text.className = "hero-card-text";
  text.textContent = getLocalizedText(hero, "description", localizationContext, getUiText(localizationContext, "heroes_description_short"));
  setEditable(text, editMode);

  body.append(title, role);
  if (playersLine) body.appendChild(playersLine);
  body.appendChild(text);
  card.appendChild(body);

  card.addEventListener("click", () => {
    if (editMode) return;
    onOpen(card, hero, group.id);
  });

  return card;
}

export function createHeroGroupSection(group, options) {
  const { editMode, localizationContext = null } = options;
  const section = document.createElement("section");
  section.className = "heroes-group";
  section.dataset.heroGroup = group.id;

  const header = document.createElement("header");
  header.className = "heroes-group-header";

  const title = document.createElement("h2");
  title.className = "heroes-group-title";
  title.textContent = getLocalizedText(group, "title", localizationContext, getUiText(localizationContext, "heroes_new_group"));
  setEditable(title, editMode);

  const subtitle = document.createElement("p");
  subtitle.className = "heroes-group-subtitle";
  subtitle.textContent = getLocalizedText(group, "subtitle", localizationContext, getUiText(localizationContext, "heroes_group_description"));
  setEditable(subtitle, editMode);

  header.append(title, subtitle);
  section.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "heroes-card-grid";
  const items = Array.isArray(group.items) ? [...group.items] : [];
  items
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    .forEach((hero) => grid.appendChild(createHeroCard(hero, group, options)));

  section.appendChild(grid);
  return section;
}

export function createHeroExpandedCard(hero, options) {
  const {
    cardId,
    groupId,
    editMode,
    onCollapse,
    onNavigateLink,
    getAssignedPlayers = () => [],
    localizationContext = null,
  } = options;

  const expanded = document.createElement("article");
  expanded.className = "hero-expanded";
  expanded.dataset.cardId = cardId;
  expanded.dataset.groupId = groupId;
  expanded.dataset.heroId = hero.id;
  applyHeroAccent(expanded, hero);

  const closeButton = document.createElement("button");
  closeButton.className = "hero-collapse";
  closeButton.type = "button";
  closeButton.textContent = "\u00d7";
  closeButton.title = getUiText(localizationContext, "heroes_close");
  closeButton.addEventListener("click", onCollapse);
  expanded.appendChild(closeButton);

  expanded.appendChild(createHeroImage(hero, "hero-expanded-portrait", localizationContext));

  const body = document.createElement("div");
  body.className = "hero-expanded-body";

  const title = document.createElement("h2");
  title.className = "hero-expanded-title";
  title.textContent = getLocalizedText(hero, "title", localizationContext, getUiText(localizationContext, "heroes_new_hero"));
  setEditable(title, editMode);

  const role = document.createElement("div");
  role.className = "hero-expanded-role";
  role.textContent = getLocalizedText(hero, "role", localizationContext, getUiText(localizationContext, "heroes_role"));
  setEditable(role, editMode);
  const assignedPlayers = getAssignedPlayers(groupId, hero.id);
  const playersLine = createAssignedPlayersLine(assignedPlayers, localizationContext, true);

  const text = document.createElement("p");
  text.className = "hero-expanded-text";
  text.textContent = getLocalizedText(
    hero,
    "fullDescription",
    localizationContext,
    getLocalizedText(hero, "description", localizationContext, getUiText(localizationContext, "heroes_description_full")),
  );
  setEditable(text, editMode);

  const accentControls = editMode ? createAccentControls(hero, localizationContext) : null;

  // Related-record links let a hero card act as a hub into archive, map, and
  // other hero records.
  const links = document.createElement("div");
  links.className = "hero-links";
  (hero.links || []).forEach((link, index) => {
    const linkButton = document.createElement("button");
    linkButton.className = "hero-link";
    linkButton.type = "button";
    linkButton.dataset.linkIndex = String(index);
    linkButton.textContent = link.label || getUiText(localizationContext, "heroes_related_record");
    const editTitle = String(localizationContext?.currentLanguage || "") === "en"
      ? "Click: open - Alt+click: remove link"
      : "\u041a\u043b\u0438\u043a: \u043f\u0435\u0440\u0435\u0439\u0442\u0438 - Alt+\u043a\u043b\u0438\u043a: \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0441\u0432\u044f\u0437\u044c";
    linkButton.title = editMode
      ? editTitle
      : getUiText(localizationContext, "heroes_link_navigate_title");
    linkButton.addEventListener("click", (event) => {
      if (editMode && event.altKey) return;
      onNavigateLink?.(link);
    });
    links.appendChild(linkButton);
  });

  if (editMode) {
    const addLinkButton = document.createElement("button");
    addLinkButton.className = "hero-link hero-link-add";
    addLinkButton.type = "button";
    addLinkButton.textContent = getUiText(localizationContext, "heroes_add_link");
    links.appendChild(addLinkButton);
  }

  body.append(title, role);
  if (playersLine) body.appendChild(playersLine);
  body.appendChild(text);
  if (accentControls) body.appendChild(accentControls);
  body.appendChild(links);
  expanded.appendChild(body);
  return expanded;
}
