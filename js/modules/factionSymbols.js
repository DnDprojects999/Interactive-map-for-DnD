import { inferArchiveTemplateKind } from "./entityTemplates.js";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

// Faction markers can borrow heraldry from linked archive cards, which avoids
// duplicating the same symbol asset in two different subsystems.
export function isFactionArchiveGroup(group) {
  return inferArchiveTemplateKind(group) === "faction";
}

export function getArchiveItemSymbolUrl(item) {
  return item?.symbolUrl?.trim?.() || item?.imageUrl?.trim?.() || "";
}

export function getArchiveItemSymbolLabel(item) {
  return item?.symbolLabel?.trim?.() || item?.imageLabel?.trim?.() || item?.title || "Символ фракции";
}

export function findArchiveFactionItem(archiveData, marker) {
  // Prefer explicit archive links first, then fall back to matching by title
  // for older data that predates direct linking.
  const groups = Array.isArray(archiveData) ? archiveData.filter(isFactionArchiveGroup) : [];
  if (!groups.length || !marker) return null;

  if (marker.archiveItemId) {
    const directGroup = groups.find((group) => !marker.archiveGroupId || group.id === marker.archiveGroupId);
    const directItem = directGroup?.items?.find((item) => item.id === marker.archiveItemId);
    if (directItem) return { group: directGroup, item: directItem };

    for (const group of groups) {
      const item = (group.items || []).find((entry) => entry.id === marker.archiveItemId);
      if (item) return { group, item };
    }
  }

  const markerTitle = normalize(marker.title);
  if (!markerTitle) return null;

  for (const group of groups) {
    const item = (group.items || []).find((entry) => normalize(entry.title) === markerTitle);
    if (item) return { group, item };
  }

  return null;
}

export function resolveFactionMarkerSymbolUrl(archiveData, marker) {
  const direct = marker?.symbolUrl?.trim?.() || "";
  if (direct) return direct;
  const linked = findArchiveFactionItem(archiveData, marker);
  return linked ? getArchiveItemSymbolUrl(linked.item) : "";
}

export function resolveFactionMarkerSymbolLabel(archiveData, marker) {
  const linked = findArchiveFactionItem(archiveData, marker);
  return linked ? getArchiveItemSymbolLabel(linked.item) : marker?.title || "Символ фракции";
}
