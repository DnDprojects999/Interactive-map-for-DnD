export const state = {
  currentSlide: 0,
  currentPalette: "ember",
  customPalettes: [],

  groupsData: [],
  markersData: [],
  eventsData: [],
  archiveData: [],
  regionLabelsData: [],
  drawLayersData: [],

  currentMarker: null,
  currentRegionLabel: null,
  editMode: false,
  editorGroupId: null,
  activeDrawLayerId: null,
  drawMode: false,
  drawBrushColor: "#7dd3fc",
  drawBrushSize: 2,
  regionLabelsVisible: true,
  regionTextMode: false,
  regionTextMoveMode: false,
  timelineMode: false,
  archiveMode: false,
  activeArchiveGroupId: null,
  mapViewMode: "author",
  mapTextureByType: {
    author: "",
    interactive: "",
  },

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
