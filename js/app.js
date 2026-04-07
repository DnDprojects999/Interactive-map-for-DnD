import { getElements } from "./modules/dom.js";
import { state } from "./modules/state.js";
import { loadData } from "./modules/data.js";
import { createUI } from "./modules/ui.js";
import { createMapModule } from "./modules/map.js";
import { createEditorModule } from "./modules/editor.js";

const els = getElements();
const ui = createUI(els, state);
const mapModule = createMapModule(els, state, ui);
const editor = createEditorModule(els, state, ui, mapModule);

function setupTopLevelInteractions() {
  els.panelButton.addEventListener("click", () => ui.togglePanel());
  els.panelHandle.addEventListener("click", () => ui.togglePanel());
  els.closePanel.addEventListener("click", () => ui.togglePanel(false));

  els.styleSwitch.addEventListener("click", (event) => {
    const rect = els.styleSwitch.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    ui.setStyleMode(clickX > rect.width / 2 ? 1 : 0);
  });
  els.styleHandle.addEventListener("click", (event) => event.stopPropagation());

  els.timelineOpenButton.addEventListener("click", () => ui.openTimelineMode());
  els.mapReturnButton.addEventListener("click", () => ui.openMapMode());

  els.timelineContainer.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      els.timelineContainer.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  }, { passive: false });

  [els.panelTitle, els.panelSubtitle, els.panelText, els.fact1, els.fact2, els.fact3]
    .forEach((el) => el.addEventListener("input", ui.savePanelToCurrentMarker));
}

async function init() {
  try {
    const data = await loadData();
    state.groupsData = data.groupsData;
    state.markersData = data.markersData;
    state.eventsData = data.eventsData;
    state.editorGroupId = state.groupsData[0]?.id || null;

    editor.renderGroups();
    editor.renderMarkers();
    ui.renderTimeline();
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
    els.panelTitle.textContent = "Ошибка";
    els.panelSubtitle.textContent = "Не удалось загрузить JSON";
    els.panelText.textContent = "Проверь пути к файлам data/markers.json и data/timeline.json.";
    els.fact1.textContent = "Папка data должна существовать";
    els.fact2.textContent = "JSON должен быть валидным";
    els.fact3.textContent = "Смотри консоль браузера";
    ui.togglePanel(true);
  }
}

ui.setStyleMode(0);
ui.setPanelEditable(false);
ui.setModeWord("", false);
ui.togglePanel(true);
mapModule.applyMapTransform();

setupTopLevelInteractions();
mapModule.setupMapNavigation();
editor.setupEditorInteractions();

init();
