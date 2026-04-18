function normalizeMeta(meta) {
  return meta && typeof meta === "object" ? meta : {};
}

/**
 * Active Map is stored separately from the main overlay file, but several
 * modules still mutate it. This helper keeps that shape consistent everywhere.
 */
export function normalizeActiveMapData(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    ...source,
    meta: normalizeMeta(source.meta),
    pinnedMarkerIds: Array.isArray(source.pinnedMarkerIds) ? source.pinnedMarkerIds : [],
    routes: Array.isArray(source.routes) ? source.routes : [],
    markers: Array.isArray(source.markers) ? source.markers : [],
  };
}

export function patchActiveMapData(value, patch = {}) {
  // Every patch refreshes updatedAt so exported active-map snapshots still tell
  // you roughly when the session overlay last changed.
  const normalized = normalizeActiveMapData(value);
  const nextMetaPatch = patch.meta && typeof patch.meta === "object" ? patch.meta : {};

  return {
    ...normalized,
    ...patch,
    meta: {
      ...normalized.meta,
      ...nextMetaPatch,
      updatedAt: new Date().toISOString(),
    },
    pinnedMarkerIds: Array.isArray(patch.pinnedMarkerIds) ? patch.pinnedMarkerIds : normalized.pinnedMarkerIds,
    routes: Array.isArray(patch.routes) ? patch.routes : normalized.routes,
    markers: Array.isArray(patch.markers) ? patch.markers : normalized.markers,
  };
}

export function replaceActiveMapMarkers(value, markers) {
  return patchActiveMapData(value, {
    markers: Array.isArray(markers) ? markers : [],
  });
}
