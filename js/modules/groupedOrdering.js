/**
 * Shared helpers for drag-and-drop reordering in grouped collections.
 * Archive cards and heroes use the same ordering rules, so we keep the
 * mutation logic in one place to avoid subtle drift between modules.
 */

function defaultGetId(entry) {
  return entry?.id;
}

export function moveGroupedItemBeforeTarget(options) {
  const {
    sourceItems,
    targetItems,
    sourceId,
    targetId,
    getId = defaultGetId,
  } = options;

  if (!Array.isArray(sourceItems) || !Array.isArray(targetItems)) return null;

  const sourceIndex = sourceItems.findIndex((entry) => getId(entry) === sourceId);
  let targetIndex = targetItems.findIndex((entry) => getId(entry) === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return null;

  const [movedItem] = sourceItems.splice(sourceIndex, 1);
  if (!movedItem) return null;

  if (sourceItems === targetItems && sourceIndex < targetIndex) {
    targetIndex -= 1;
  }

  targetItems.splice(targetIndex, 0, movedItem);
  return movedItem;
}

export function syncGroupedSortOrder(items, recorder, entity, groupId) {
  if (!Array.isArray(items)) return;

  items.forEach((entry, index) => {
    entry.sortOrder = index;
    recorder.upsert(entity, entry.id, entry, { groupId });
  });
}
