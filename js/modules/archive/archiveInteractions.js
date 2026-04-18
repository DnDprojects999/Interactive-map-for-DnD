import {
  ensureArchiveImageVariants,
  getArchiveImageVariantKey,
  renderArchiveCardImage,
  renderArchiveExpandedImage,
} from "./archiveImages.js";
import {
  getArchiveItemSymbolLabel,
  getArchiveItemSymbolUrl,
  isFactionArchiveGroup,
} from "../factionSymbols.js";
import {
  createArchiveSymbolBadge,
  renderArchiveExpandedSymbolSlot,
} from "./archiveView.js";
import {
  moveGroupedItemBeforeTarget,
  syncGroupedSortOrder,
} from "../groupedOrdering.js";

export function setupArchiveMediaInteractions(options) {
  const {
    container,
    documentBody = document.body,
    state,
    readFileToDataUrl,
    getChangeRecorder,
    remapArchiveItemReferences,
    renderArchive,
  } = options;

  const archiveImageFileInput = document.createElement("input");
  archiveImageFileInput.type = "file";
  archiveImageFileInput.accept = "image/*";
  archiveImageFileInput.hidden = true;
  documentBody.appendChild(archiveImageFileInput);

  let activeArchiveImageTarget = null;
  let dragArchiveCardMeta = null;

  // Archive media editing combines clicks, paste, drag-drop, and reordering,
  // so it is isolated from the plain text inline editor.
  const getRecorder = () => getChangeRecorder?.() || { upsert: () => {}, remove: () => {} };

  /**
   * Archive cards and the expanded card share the same underlying entity.
   * This helper resolves the clicked node back to the exact item and visual
   * slot so every interaction path updates one source of truth.
   */
  const syncArchiveCardSymbolBadge = (group, item) => {
    const cardImageNode = container.querySelector(
      `.archive-card[data-group-id="${group.id}"][data-item-id="${item.id}"] .archive-card-image`,
    );
    if (!cardImageNode) return;
    cardImageNode.querySelector(".archive-card-symbol")?.remove();
    if (!isFactionArchiveGroup(group)) return;

    const symbolUrl = getArchiveItemSymbolUrl(item);
    if (!symbolUrl) return;
    cardImageNode.appendChild(
      createArchiveSymbolBadge(symbolUrl, getArchiveItemSymbolLabel(item), "archive-card-symbol"),
    );
  };

  const resolveArchiveImageItem = (target) => {
    const symbolNode = target?.closest?.(".archive-expanded-symbol-slot");
    const symbolExpanded = target?.closest?.(".archive-expanded");
    if (symbolNode && symbolExpanded) {
      const group = state.archiveData.find((entry) => entry.id === symbolExpanded.dataset.groupId);
      const item = group?.items?.find((entry) => entry.id === symbolExpanded.dataset.itemId);
      if (!group || !item) return null;
      return { imageNode: symbolNode, group, item, imageKind: "symbol" };
    }

    const expandedImageNode = target?.closest?.(".archive-expanded-visual");
    const expanded = target?.closest?.(".archive-expanded");
    if (expandedImageNode && expanded) {
      const group = state.archiveData.find((entry) => entry.id === expanded.dataset.groupId);
      const item = group?.items?.find((entry) => entry.id === expanded.dataset.itemId);
      if (!group || !item) return null;
      return { imageNode: expandedImageNode, group, item, imageKind: "expanded" };
    }

    const imageNode = target?.closest?.(".archive-card-image");
    const card = target?.closest?.(".archive-card");
    if (!imageNode || !card) return null;
    const group = state.archiveData.find((entry) => entry.id === card.dataset.groupId);
    const item = group?.items?.find((entry) => entry.id === card.dataset.itemId);
    if (!group || !item) return null;
    return { imageNode, group, item, imageKind: "card" };
  };

  const applyArchiveImageFile = async (file, imageNode, group, item, imageKind = "card") => {
    // Card art, expanded art, and faction symbols all point to the same
    // archive item, but each one writes into a different field.
    if (!file || !state.editMode || !file.type?.startsWith("image/")) return;
    try {
      const variantKey = getArchiveImageVariantKey(state.mapViewMode);
      if (imageKind === "symbol") {
        item.symbolUrl = await readFileToDataUrl(file);
        renderArchiveExpandedSymbolSlot(imageNode, item);
        syncArchiveCardSymbolBadge(group, item);
      } else if (imageKind === "expanded") {
        ensureArchiveImageVariants(item, "expandedImageVariants");
        item.expandedImageVariants[variantKey] = await readFileToDataUrl(file);
        renderArchiveExpandedImage(imageNode, item, state.mapViewMode);
      } else {
        ensureArchiveImageVariants(item);
        item.imageVariants[variantKey] = await readFileToDataUrl(file);
        renderArchiveCardImage(imageNode, item, state.mapViewMode);
      }
      getRecorder().upsert("archiveItem", item.id, item, { groupId: group.id });
    } catch (error) {
      console.error(error);
    }
  };

  container.addEventListener("dblclick", (event) => {
    if (!state.editMode) return;
    const resolved = resolveArchiveImageItem(event.target);
    if (!resolved) return;
    event.preventDefault();

    const labelKey = resolved.imageKind === "expanded"
      ? "expandedImageLabel"
      : resolved.imageKind === "symbol"
        ? "symbolLabel"
        : "imageLabel";

    const currentLabel = resolved.item[labelKey]
      || (resolved.imageKind === "symbol"
        ? resolved.item.title
        : resolved.item.imageLabel)
      || "Изображение";
    const nextLabel = window.prompt("Подпись изображения", currentLabel);
    if (nextLabel == null) return;

    resolved.item[labelKey] = nextLabel.trim() || "Изображение";
    if (resolved.imageKind === "symbol") {
      renderArchiveExpandedSymbolSlot(resolved.imageNode, resolved.item);
      syncArchiveCardSymbolBadge(resolved.group, resolved.item);
    } else if (resolved.imageKind === "expanded") {
      renderArchiveExpandedImage(resolved.imageNode, resolved.item, state.mapViewMode);
    } else {
      renderArchiveCardImage(resolved.imageNode, resolved.item, state.mapViewMode);
    }
    getRecorder().upsert("archiveItem", resolved.item.id, resolved.item, { groupId: resolved.group.id });
  });

  container.addEventListener("click", (event) => {
    if (!state.editMode) return;
    const resolved = resolveArchiveImageItem(event.target);
    if (!resolved) return;
    activeArchiveImageTarget = resolved;
    archiveImageFileInput.click();
  });

  archiveImageFileInput.addEventListener("change", async (event) => {
    const [file] = Array.from(event.target.files || []);
    if (file && activeArchiveImageTarget) {
      await applyArchiveImageFile(
        file,
        activeArchiveImageTarget.imageNode,
        activeArchiveImageTarget.group,
        activeArchiveImageTarget.item,
        activeArchiveImageTarget.imageKind,
      );
    }
    archiveImageFileInput.value = "";
    activeArchiveImageTarget = null;
  });

  container.addEventListener("paste", async (event) => {
    if (!state.editMode) return;
    const resolved = resolveArchiveImageItem(event.target);
    if (!resolved) return;
    const imageItem = Array.from(event.clipboardData?.items || []).find((item) => item.type.startsWith("image/"));
    const file = imageItem?.getAsFile();
    if (!file) return;
    event.preventDefault();
    await applyArchiveImageFile(file, resolved.imageNode, resolved.group, resolved.item, resolved.imageKind);
  });

  container.addEventListener("dragstart", (event) => {
    if (!state.editMode) return;
    const card = event.target.closest(".archive-card");
    if (!card) return;
    dragArchiveCardMeta = {
      groupId: card.dataset.groupId,
      itemId: card.dataset.itemId,
    };
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${dragArchiveCardMeta.groupId}:${dragArchiveCardMeta.itemId}`);
  });

  container.addEventListener("dragend", (event) => {
    const card = event.target.closest(".archive-card");
    if (card) card.classList.remove("dragging");
    dragArchiveCardMeta = null;
  });

  container.addEventListener("dragover", (event) => {
    if (!state.editMode) return;

    const resolved = resolveArchiveImageItem(event.target);
    if (resolved && !dragArchiveCardMeta) {
      event.preventDefault();
      resolved.imageNode.classList.add("is-drop-target");
      event.dataTransfer.dropEffect = "copy";
      return;
    }

    if (!dragArchiveCardMeta) return;
    if (!event.target.closest(".archive-card")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });

  container.addEventListener("dragleave", (event) => {
    const imageNode = event.target?.closest?.(".archive-card-image, .archive-expanded-visual, .archive-expanded-symbol-slot");
    if (!imageNode) return;
    imageNode.classList.remove("is-drop-target");
  });

  container.addEventListener("drop", async (event) => {
    if (!state.editMode) return;

    const resolved = resolveArchiveImageItem(event.target);
    if (resolved && !dragArchiveCardMeta) {
      const [file] = Array.from(event.dataTransfer?.files || []);
      if (!file) return;
      event.preventDefault();
      resolved.imageNode.classList.remove("is-drop-target");
      await applyArchiveImageFile(file, resolved.imageNode, resolved.group, resolved.item, resolved.imageKind);
      return;
    }

    if (!dragArchiveCardMeta) return;
    const targetCard = event.target.closest(".archive-card");
    if (!targetCard) return;
    event.preventDefault();

    const sourceGroup = state.archiveData.find((group) => group.id === dragArchiveCardMeta.groupId);
    const targetGroup = state.archiveData.find((group) => group.id === targetCard.dataset.groupId);
    if (!sourceGroup || !targetGroup) return;
    sourceGroup.items = Array.isArray(sourceGroup.items) ? sourceGroup.items : [];
    targetGroup.items = Array.isArray(targetGroup.items) ? targetGroup.items : [];

    // Reordering can also move a card between groups, so sort order and
    // cross-references both need to be updated afterward.
    const movedItem = moveGroupedItemBeforeTarget({
      sourceItems: sourceGroup.items,
      targetItems: targetGroup.items,
      sourceId: dragArchiveCardMeta.itemId,
      targetId: targetCard.dataset.itemId,
    });
    if (!movedItem) return;

    const recorder = getRecorder();
    if (sourceGroup.id !== targetGroup.id) {
      recorder.remove("archiveItem", movedItem.id, { groupId: sourceGroup.id });
      remapArchiveItemReferences?.(movedItem.id, sourceGroup.id, targetGroup.id, recorder);
    }

    syncGroupedSortOrder(sourceGroup.items, recorder, "archiveItem", sourceGroup.id);
    if (sourceGroup.id !== targetGroup.id) {
      syncGroupedSortOrder(targetGroup.items, recorder, "archiveItem", targetGroup.id);
    }

    renderArchive();
  });
}
