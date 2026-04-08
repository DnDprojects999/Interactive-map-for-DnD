export function getElements() {
  const elements = {
    topbar: document.getElementById("topbar"),
    modeWord: document.getElementById("modeWord"),
    timelineOpenButton: document.getElementById("timelineOpenButton"),
    mapReturnButton: document.getElementById("mapReturnButton"),
    archiveOpenButton: document.getElementById("archiveOpenButton"),
    sidebarTitle: document.getElementById("sidebarTitle"),

    paletteWidget: document.getElementById("paletteWidget"),
    paletteToggle: document.getElementById("paletteToggle"),
    palettePopover: document.getElementById("palettePopover"),
    mapStage: document.getElementById("mapStage"),
    mapTransform: document.getElementById("mapTransform"),
    content: document.getElementById("content"),
    panelHandle: document.getElementById("panelHandle"),
    closePanel: document.getElementById("closePanel"),
    panelTitle: document.getElementById("panelTitle"),
    panelSubtitle: document.getElementById("panelSubtitle"),
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
