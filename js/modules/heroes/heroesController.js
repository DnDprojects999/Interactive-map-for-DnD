import {
  createHeroExpandedCard,
  createHeroGroupSection,
} from "./heroesView.js";
import { getPlayersForHero } from "../players/playerRoster.js";

const DEFAULT_HERO_ACCENT = "#b98a4b";

// Hero cards derive an accent from their portrait when possible, which helps
// the expanded card feel personalized without storing a manual color for every hero.
function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function readDominantColor(image) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  const size = 24;
  canvas.width = size;
  canvas.height = size;
  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha < 80) continue;
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    if (max < 35 || max - min < 8) continue;
    r += red;
    g += green;
    b += blue;
    count += 1;
  }

  if (!count) return null;
  return rgbToHex(Math.round(r / count), Math.round(g / count), Math.round(b / count));
}

function getResolvedAccent(hero, dominantColor = "") {
  return hero?.accentColorOverride || dominantColor || hero?.accentColor || DEFAULT_HERO_ACCENT;
}

export function createHeroesController(options) {
  const {
    els,
    state,
    onNavigate,
    onSelectItem = () => {},
  } = options;

  let activeExpandedCardId = null;

  // Just like archive, heroes allow one expanded card at a time.
  function collapseExpandedCards() {
    els.heroesGroupsContainer.querySelectorAll(".hero-expanded").forEach((expanded) => expanded.remove());
    els.heroesGroupsContainer.querySelectorAll(".hero-card.expanded").forEach((card) => card.classList.remove("expanded"));
    els.heroesGroupsContainer.querySelectorAll(".heroes-group.has-expanded").forEach((section) => section.classList.remove("has-expanded"));
    activeExpandedCardId = null;
    state.currentHeroId = null;
  }

  function applyDominantColors(root = els.heroesGroupsContainer) {
    // Accent colors are applied after render because the final image may come
    // from different sources and is sometimes only available after load.
    const nodes = root.matches?.(".hero-card, .hero-expanded")
      ? [root, ...root.querySelectorAll(".hero-card, .hero-expanded")]
      : [...root.querySelectorAll(".hero-card, .hero-expanded")];

    nodes.forEach((node) => {
      const group = state.heroesData.find((entry) => entry.id === node.dataset.groupId);
      const hero = group?.items?.find((entry) => entry.id === node.dataset.heroId);
      const image = node.querySelector("img");

      if (!hero || !image) {
        node.style.setProperty("--hero-accent", getResolvedAccent(hero));
        return;
      }

      if (hero.accentColorOverride) {
        node.style.setProperty("--hero-accent", getResolvedAccent(hero));
        return;
      }

      const updateColor = () => {
        try {
          const color = readDominantColor(image);
          node.style.setProperty("--hero-accent", getResolvedAccent(hero, color));
        } catch (error) {
          node.style.setProperty("--hero-accent", getResolvedAccent(hero));
        }
      };

      if (image.complete) {
        updateColor();
      } else {
        image.addEventListener("load", updateColor, { once: true });
        image.addEventListener(
          "error",
          () => {
            node.style.setProperty("--hero-accent", getResolvedAccent(hero));
          },
          { once: true },
        );
      }
    });
  }

  function openExpanded(card, hero, groupId) {
    // Expanded hero cards include cross-links and player assignments, so they
    // are created on demand instead of always sitting in the DOM.
    const cardId = card.dataset.cardId;
    const shouldCollapse = activeExpandedCardId === cardId;
    collapseExpandedCards();
    if (shouldCollapse) return;

    const groupSection = card.closest(".heroes-group");
    const grid = card.closest(".heroes-card-grid");
    if (!groupSection || !grid) return;

    groupSection.classList.add("has-expanded");
    card.classList.add("expanded");
    const expanded = createHeroExpandedCard(hero, {
      cardId,
      groupId,
      editMode: state.editMode,
      localizationContext: state,
      onCollapse: collapseExpandedCards,
      onNavigateLink: onNavigate,
      getAssignedPlayers: (targetGroupId, heroId) => getPlayersForHero(state.playersData, targetGroupId, heroId),
    });
    groupSection.insertBefore(expanded, grid.nextSibling);
    activeExpandedCardId = cardId;
    state.activeHeroGroupId = groupId;
    state.currentHeroId = hero.id || null;
    onSelectItem({ type: "heroItem", id: hero.id, groupId });
    applyDominantColors(expanded);
    expanded.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function render() {
    // Re-rendering the heroes page from scratch keeps portrait accents,
    // edit-state fields, and group ordering in one predictable pass.
    els.heroesGroupsContainer.innerHTML = "";
    state.heroesData.forEach((group) => {
      const section = createHeroGroupSection(group, {
        editMode: state.editMode,
        localizationContext: state,
        onOpen: openExpanded,
        getAssignedPlayers: (targetGroupId, heroId) => getPlayersForHero(state.playersData, targetGroupId, heroId),
      });
      els.heroesGroupsContainer.appendChild(section);
    });
    applyDominantColors();
  }

  function focusItem(groupId, heroId) {
    const card = els.heroesGroupsContainer.querySelector(`[data-group-id="${groupId}"][data-hero-id="${heroId}"]`);
    const group = state.heroesData.find((entry) => entry.id === groupId);
    const hero = group?.items?.find((entry) => entry.id === heroId);
    if (!card || !hero) return;
    openExpanded(card, hero, group.id);
  }

  return {
    collapseExpandedCards,
    focusItem,
    render,
  };
}
