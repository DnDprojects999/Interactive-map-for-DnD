import {
  createArchiveExpandedCard,
  createArchiveGroupSection,
} from "./archiveView.js";

export function createArchiveController(options) {
  const {
    els,
    state,
    setActiveSidebarGroup,
    onSelectItem = () => {},
  } = options;

  let activeExpandedCardId = null;
  let scrollObserver = null;

  // Archive uses one expanded card at a time. Tracking it here keeps the list
  // renderer and the sidebar navigation in sync.
  function setupScrollTracking() {
    if (scrollObserver) {
      scrollObserver.disconnect();
      scrollObserver = null;
    }

    const sections = els.archiveGroupsContainer.querySelectorAll(".archive-group");
    if (!sections.length) return;

    // Наблюдатель синхронизирует активную кнопку в sidebar с наиболее видимой секцией архива.
    // IntersectionObserver keeps the sidebar highlight aligned with the section
    // that is currently most visible in the archive scroll container.
    scrollObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (!visible.length) return;

      const topGroupId = visible[0].target.dataset.archiveGroup;
      if (topGroupId) setActiveSidebarGroup(topGroupId, { trackCurrent: false });
    }, {
      root: els.archiveScrollContainer,
      threshold: [0.15, 0.5, 0.75],
      rootMargin: "-5% 0px -70% 0px",
    });

    sections.forEach((section) => scrollObserver.observe(section));
  }

  function collapseExpandedCards() {
    // Centralized reset matters here because mode switches and repeated opens
    // can otherwise leave stacked expanded cards behind in the DOM.
    // Централизованный "reset" состояния: важно вызывать перед переключением режима,
    // чтобы не оставлять наложенные expanded-карточки в DOM.
    els.archiveGroupsContainer.querySelectorAll(".archive-expanded").forEach((expanded) => expanded.remove());
    els.archiveGroupsContainer.querySelectorAll(".archive-card.expanded").forEach((card) => card.classList.remove("expanded"));
    els.archiveGroupsContainer.querySelectorAll(".archive-group.has-expanded").forEach((section) => section.classList.remove("has-expanded"));
    els.archiveGroupsContainer.querySelectorAll(".archive-cards.is-covered").forEach((grid) => grid.classList.remove("is-covered"));
    activeExpandedCardId = null;
    state.currentArchiveItemId = null;
  }

  function openExpanded(section, card, item, groupId) {
    // Clicking the same card twice acts like a toggle: open once, collapse on
    // the second click.
    const cardId = card.dataset.cardId;
    const shouldCollapse = activeExpandedCardId === cardId;
    collapseExpandedCards();
    if (shouldCollapse) return;

    const cardsGrid = card.closest(".archive-cards");
    section.classList.add("has-expanded");
    if (cardsGrid) cardsGrid.classList.add("is-covered");
    card.classList.add("expanded");
    const expanded = createArchiveExpandedCard(item, {
      cardId,
      groupId,
      group: section ? state.archiveData.find((entry) => entry.id === groupId) : null,
      editMode: state.editMode,
      mapViewMode: state.mapViewMode,
      localizationContext: state,
      onCollapse: collapseExpandedCards,
    });
    section.insertBefore(expanded, cardsGrid || section.lastElementChild);
    activeExpandedCardId = cardId;
    state.activeArchiveGroupId = groupId;
    state.currentArchiveItemId = item.id || null;
    onSelectItem({ type: "archiveItem", id: item.id, groupId });
    expanded.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function setupCardInteractions() {
    const sectionNodes = els.archiveGroupsContainer.querySelectorAll(".archive-group");

    sectionNodes.forEach((section, groupIndex) => {
      const cards = section.querySelectorAll(".archive-card");
      cards.forEach((card, cardIndex) => {
        card.addEventListener("click", () => {
          if (state.editMode) return;
          const group = state.archiveData[groupIndex];
          const itemId = card.dataset.itemId;
          const item = group?.items?.find((entry) => entry.id === itemId) || group?.items?.[cardIndex];
          if (!item) return;
          openExpanded(section, card, item, group.id);
        });
      });
    });
  }

  function render() {
    // Rendering starts from clean DOM because archive cards can change shape
    // significantly between map modes and edit states.
    els.archiveGroupsContainer.innerHTML = "";

    state.archiveData.forEach((group) => {
      const section = createArchiveGroupSection(group, {
        editMode: state.editMode,
        mapViewMode: state.mapViewMode,
        localizationContext: state,
        onExpandCard: openExpanded,
      });
      els.archiveGroupsContainer.appendChild(section);
    });

    setupCardInteractions();
    setupScrollTracking();
  }

  function focusItem(groupId, itemId) {
    const section = els.archiveGroupsContainer.querySelector(`[data-archive-group="${groupId}"]`);
    const card = els.archiveGroupsContainer.querySelector(`[data-card-id="${groupId}-${itemId}"]`);
    if (!section || !card) return;
    const group = state.archiveData.find((entry) => entry.id === groupId);
    const item = group?.items?.find((entry) => entry.id === itemId);
    if (!item) return;
    openExpanded(section, card, item, group.id);
  }

  return {
    collapseExpandedCards,
    focusItem,
    render,
  };
}
