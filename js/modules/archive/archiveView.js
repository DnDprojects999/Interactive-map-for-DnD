import {
  renderArchiveCardImage,
  renderArchiveExpandedImage,
} from "./archiveImages.js";
import {
  getArchiveItemSymbolLabel,
  getArchiveItemSymbolUrl,
  isFactionArchiveGroup,
} from "../factionSymbols.js";
import { getLocalizedText } from "../localization.js";

// Archive view factories build the visual card hierarchy for both compact cards
// and expanded cards. The controller decides when they open; this file decides
// what they look like.
export function createArchiveGroupSection(group, options = {}) {
  const {
    editMode = false,
    mapViewMode = "author",
    localizationContext = null,
    onExpandCard = () => {},
  } = options;

  const section = document.createElement("section");
  section.className = "archive-group";
  section.dataset.archiveGroup = group.id;

  const heading = document.createElement("h2");
  heading.className = "archive-group-title";
  heading.textContent = getLocalizedText(group, "title", localizationContext, "Группа");
  heading.contentEditable = String(editMode);

  const cardsGrid = document.createElement("div");
  cardsGrid.className = "archive-cards";
  cardsGrid.dataset.archiveGroupKind = isFactionArchiveGroup(group) ? "faction" : "general";

  getSortedArchiveItems(group).forEach((item, itemIndex) => {
    const card = createArchiveCard(item, {
      groupId: group.id,
      itemIndex,
      editMode,
      group,
      mapViewMode,
      localizationContext,
      onExpand: () => onExpandCard(section, card, item, group.id),
    });
    cardsGrid.appendChild(card);
  });

  section.append(heading, cardsGrid);
  return section;
}

export function createArchiveExpandedCard(item, options = {}) {
  const {
    cardId = "",
    groupId = "",
    editMode = false,
    mapViewMode = "author",
    localizationContext = null,
    onCollapse = () => {},
    group = null,
  } = options;
  // Faction groups render an extra heraldry/symbol panel that ordinary archive
  // groups do not need.
  const factionGroup = isFactionArchiveGroup(group);

  const expanded = document.createElement("article");
  expanded.className = "archive-expanded";
  expanded.dataset.expandedFor = cardId;
  expanded.dataset.groupId = groupId;
  expanded.dataset.itemId = item.id || "";

  const collapseButton = document.createElement("button");
  collapseButton.className = "archive-collapse";
  collapseButton.type = "button";
  collapseButton.title = "Скрыть раскрытую карточку";
  collapseButton.textContent = "×";
  collapseButton.addEventListener("click", onCollapse);

  const visual = document.createElement("div");
  visual.className = "archive-expanded-visual";
  if (editMode) {
    visual.title = "Клик/перетаскивание — отдельная картинка раскрытия. Если пусто, используется миниатюра.";
  }
  renderArchiveExpandedImage(visual, item, mapViewMode, localizationContext);

  const body = document.createElement("div");
  body.className = "archive-expanded-body";
  if (factionGroup) body.classList.add("archive-expanded-body-faction");

  const head = document.createElement("div");
  head.className = "archive-expanded-head";

  const title = document.createElement("h3");
  title.className = "archive-expanded-title";
  title.textContent = getLocalizedText(item, "title", localizationContext, "Без названия");
  title.contentEditable = String(editMode);
  head.appendChild(title);

  const text = document.createElement("p");
  text.className = "archive-expanded-text";
  text.textContent = getLocalizedText(
    item,
    "fullDescription",
    localizationContext,
    getLocalizedText(item, "description", localizationContext, "Подробное описание пока не добавлено."),
  );
  text.contentEditable = String(editMode);

  body.append(head);
  if (factionGroup) body.appendChild(createArchiveExpandedSymbolPanel(item, editMode, localizationContext));
  body.append(text);
  expanded.append(collapseButton, visual, body);
  return expanded;
}

export function createArchiveSymbolBadge(symbolUrl, label, className) {
  const badge = document.createElement("div");
  badge.className = className;

  const image = document.createElement("img");
  image.className = `${className}-image`;
  image.src = symbolUrl;
  image.alt = label || "Символ фракции";
  image.loading = "lazy";
  image.decoding = "async";
  badge.appendChild(image);
  return badge;
}

export function renderArchiveExpandedSymbolSlot(slot, item, localizationContext = null) {
  if (!slot) return;
  slot.innerHTML = "";

  const explicitSymbolUrl = item?.symbolUrl?.trim?.() || "";
  if (!explicitSymbolUrl) {
    const placeholder = document.createElement("span");
    placeholder.className = "archive-expanded-symbol-placeholder";
    placeholder.textContent = getLocalizedText(item, "symbolLabel", localizationContext, "Добавь герб, логотип или символ");
    slot.appendChild(placeholder);
    return;
  }

  const image = document.createElement("img");
  image.className = "archive-expanded-symbol-slot-image";
  image.src = explicitSymbolUrl;
  image.alt = getLocalizedText(item, "symbolLabel", localizationContext, getLocalizedText(item, "title", localizationContext, "Символ фракции"));
  image.loading = "lazy";
  image.decoding = "async";
  slot.appendChild(image);
}

function getSortedArchiveItems(group) {
  // sortOrder wins when present; id is only a deterministic fallback.
  return [...(group.items || [])].sort((a, b) => {
    const left = typeof a.sortOrder === "number" ? a.sortOrder : Number.POSITIVE_INFINITY;
    const right = typeof b.sortOrder === "number" ? b.sortOrder : Number.POSITIVE_INFINITY;
    if (left !== right) return left - right;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

function createArchiveCard(item, options) {
  const {
    groupId,
    itemIndex,
    editMode,
    mapViewMode,
    localizationContext,
    onExpand,
    group,
  } = options;

  // Compact card view is intentionally lightweight because large archive groups
  // can render many of these at once.
  const card = document.createElement("article");
  card.className = "archive-card";
  card.dataset.cardId = `${groupId}-${item.id || itemIndex}`;
  card.dataset.groupId = groupId;
  card.dataset.itemId = item.id || "";
  card.draggable = editMode;

  if (editMode) {
    const expandEditButton = document.createElement("button");
    expandEditButton.className = "archive-card-expand-edit";
    expandEditButton.type = "button";
    expandEditButton.textContent = "раскрыть";
    expandEditButton.addEventListener("click", (event) => {
      event.stopPropagation();
      onExpand();
    });
    card.appendChild(expandEditButton);
  }

  const image = document.createElement("div");
  image.className = "archive-card-image";
  renderArchiveCardImage(image, item, mapViewMode, localizationContext);
  const symbolUrl = isFactionArchiveGroup(group) ? getArchiveItemSymbolUrl(item) : "";
  if (symbolUrl) {
    image.appendChild(createArchiveSymbolBadge(symbolUrl, getArchiveItemSymbolLabel(item), "archive-card-symbol"));
  }
  if (editMode) {
    image.title = "Вставь/перетащи изображение. Двойной клик — изменить подпись.";
  }

  const title = document.createElement("h3");
  title.className = "archive-card-title";
  title.textContent = getLocalizedText(item, "title", localizationContext, "Без названия");
  title.contentEditable = String(editMode);

  const text = document.createElement("p");
  text.className = "archive-card-text";
  text.textContent = getLocalizedText(item, "description", localizationContext, "Описание пока не заполнено.");
  text.contentEditable = String(editMode);

  card.append(image, title, text);
  return card;
}

function createArchiveExpandedSymbolPanel(item, editMode, localizationContext) {
  const panel = document.createElement("div");
  panel.className = "archive-expanded-symbol-panel";

  const label = document.createElement("span");
  label.className = "archive-expanded-symbol-caption";
  label.textContent = "Герб / символ";

  const slot = document.createElement("div");
  slot.className = "archive-expanded-symbol-slot";
  if (editMode) {
    slot.title = "Клик, Ctrl+V или перетаскивание — отдельный герб/лого для карты и бейджа карточки.";
  }
  renderArchiveExpandedSymbolSlot(slot, item, localizationContext);

  panel.append(label, slot);
  return panel;
}
