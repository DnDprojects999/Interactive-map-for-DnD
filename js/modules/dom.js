export function getElements() {
  const elements = {
    topbar: document.getElementById("topbar"),
    modeWord: document.getElementById("modeWord"),
    timelineOpenButton: document.getElementById("timelineOpenButton"),
    mapReturnButton: document.getElementById("mapReturnButton"),
    archiveOpenButton: document.getElementById("archiveOpenButton"),
    sidebarTitle: document.getElementById("sidebarTitle"),

    paletteWidget: document.getElementById("paletteWidget"),
    mapViewSwitcher: document.getElementById("mapViewSwitcher"),
    paletteToggle: document.getElementById("paletteToggle"),
    palettePopover: document.getElementById("palettePopover"),
    addPaletteButton: document.getElementById("addPaletteButton"),
    mapStage: document.getElementById("mapStage"),
    mapTransform: document.getElementById("mapTransform"),
    mapPhotoLayer: document.getElementById("mapPhotoLayer"),
    drawSvg: document.getElementById("drawSvg"),
    regionLabelsContainer: document.getElementById("regionLabelsContainer"),
    content: document.getElementById("content"),
    panelHandle: document.getElementById("panelHandle"),
    deleteMarkerButton: document.getElementById("deleteMarkerButton"),
    panelTitle: document.getElementById("panelTitle"),
    panelSubtitle: document.getElementById("panelSubtitle"),
    panelImage: document.getElementById("panelImage"),
    panelImagePreview: document.getElementById("panelImagePreview"),
    panelImageCaption: document.getElementById("panelImageCaption"),
    panelImageControls: document.getElementById("panelImageControls"),
    panelImageUrlInput: document.getElementById("panelImageUrlInput"),
    applyImageUrlButton: document.getElementById("applyImageUrlButton"),
    panelImageFileInput: document.getElementById("panelImageFileInput"),
    panelImageHint: document.getElementById("panelImageHint"),
    panelText: document.getElementById("panelText"),
    fact1: document.getElementById("fact1"),
    fact2: document.getElementById("fact2"),
    fact3: document.getElementById("fact3"),
    toolButtonsContainer: document.getElementById("toolButtonsContainer"),
    markersContainer: document.getElementById("markersContainer"),
    timelineContainer: document.getElementById("timelineContainer"),
    archiveDrawer: document.getElementById("archiveDrawer"),
    archiveScrollContainer: document.getElementById("archiveScrollContainer"),
    archiveGroupsContainer: document.getElementById("archiveGroupsContainer"),
    editorActions: document.getElementById("editorActions"),
    addTimelineEventButton: document.getElementById("addTimelineEventButton"),
    addRegionLabelButton: document.getElementById("addRegionLabelButton"),
    toggleTextMoveModeButton: document.getElementById("toggleTextMoveModeButton"),
    toggleDrawModeButton: document.getElementById("toggleDrawModeButton"),
    addArchiveGroupButton: document.getElementById("addArchiveGroupButton"),
    addArchiveItemButton: document.getElementById("addArchiveItemButton"),
    mapTextToolbar: document.getElementById("mapTextToolbar"),
    mapTextFontSelect: document.getElementById("mapTextFontSelect"),
    mapTextSizeInput: document.getElementById("mapTextSizeInput"),
    mapTextBoldButton: document.getElementById("mapTextBoldButton"),
    mapTextItalicButton: document.getElementById("mapTextItalicButton"),
    mapTextColorInput: document.getElementById("mapTextColorInput"),
    mapTextRotateInput: document.getElementById("mapTextRotateInput"),
    drawLayerPanel: document.getElementById("drawLayerPanel"),
    drawLayerList: document.getElementById("drawLayerList"),
    drawBrushSizeInput: document.getElementById("drawBrushSizeInput"),
    drawBrushColorSelect: document.getElementById("drawBrushColorSelect"),
    mapScaleIndicator: document.getElementById("mapScaleIndicator"),
    uploadMapTextureButton: document.getElementById("uploadMapTextureButton"),
    mapTextureInput: document.getElementById("mapTextureInput"),
    exportDataButton: document.getElementById("exportDataButton"),
  };

  const missingEntries = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingEntries.length > 0) {
    throw new Error(`DOM init error: missing required elements (${missingEntries.join(", ")}).`);
  }

  return elements;
}
