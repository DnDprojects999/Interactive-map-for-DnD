export const state = {
  currentSlide: 0,
  currentStyleMode: 0,

  groupsData: [],
  markersData: [],
  eventsData: [],
  archiveData: [],

  currentMarker: null,
  editMode: false,
  editorGroupId: null,
  timelineMode: false,
  archiveMode: false,
  activeArchiveGroupId: null,

  mapScale: 1,
  mapOffsetX: 0,
  mapOffsetY: 0,
  isPanning: false,
  panPointerId: null,
  panStartX: 0,
  panStartY: 0,
};

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
