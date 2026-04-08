import { getElements } from "./modules/dom.js";
import { state } from "./modules/state.js";
import { loadData } from "./modules/data.js";
import { createUI } from "./modules/ui.js";
import { createMapModule } from "./modules/map.js";
import { createEditorModule } from "./modules/editor.js";
import { createChangesManager } from "./modules/changes.js";

function assertModuleApi(moduleName, moduleObject, methods) {
  methods.forEach((methodName) => {
    if (typeof moduleObject?.[methodName] !== "function") {
      throw new Error(`${moduleName} init error: missing method "${methodName}".`);
    }
  });
}

const els = getElements();
const ui = createUI(els, state);
const mapModule = createMapModule(els, state, ui);
const changesManager = createChangesManager();
const editor = createEditorModule(els, state, ui, mapModule, changesManager);
assertModuleApi("ui", ui, [
  "setSidebarRenderers",
  "setChangeRecorder",
  "setPalette",
  "togglePalettePopover",
  "setPanelEditable",
  "setModeWord",
  "togglePanel",
  "renderTimeline",
  "openTimelineMode",
  "openArchiveMode",
  "openMapMode",
  "savePanelToCurrentMarker",
  "updatePanelFromMarker",
]);
assertModuleApi("mapModule", mapModule, ["applyMapTransform", "setupMapNavigation", "getMapPercentFromClient"]);
assertModuleApi("editor", editor, ["renderGroups", "renderMarkers", "setupEditorInteractions"]);
ui.setSidebarRenderers({ mapButtonsRenderer: editor.renderGroups });
ui.setChangeRecorder((entity, id, value) => changesManager.upsert(entity, id, value));
const panelEditableFields = [els.panelTitle, els.panelSubtitle, els.panelText, els.fact1, els.fact2, els.fact3];

/**
 * Регистрирует пользовательские взаимодействия верхнего уровня (без привязки к конкретному режиму карты).
 * Здесь живут только "сквозные" обработчики: панель, палитра, переключение режимов и inline-редактирование панели.
 */
function setupTopLevelInteractions() {
  els.panelHandle.addEventListener("click", () => ui.togglePanel());
  els.closePanel.addEventListener("click", () => ui.togglePanel(false));

  els.paletteToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    ui.togglePalettePopover();
  });

  els.palettePopover.addEventListener("click", (event) => {
    const button = event.target.closest(".palette-option");
    if (!button) return;
    const palette = button.dataset.paletteValue;
    if (!palette) return;
    ui.setPalette(palette);
    ui.togglePalettePopover(false);
  });

  document.addEventListener("click", (event) => {
    if (els.paletteWidget.contains(event.target)) return;
    ui.togglePalettePopover(false);
  });

  els.timelineOpenButton.addEventListener("click", () => {
    if (state.archiveMode) {
      ui.openMapMode();
      return;
    }
    if (!state.timelineMode) ui.openTimelineMode();
  });
  els.archiveOpenButton.addEventListener("click", () => {
    if (!state.timelineMode) ui.openArchiveMode();
  });
  els.mapReturnButton.addEventListener("click", () => ui.openMapMode());

  els.timelineContainer.addEventListener("wheel", (event) => {
    const horizontalDelta = event.shiftKey ? event.deltaY + event.deltaX : event.deltaY;
    if (Math.abs(horizontalDelta) > Math.abs(event.deltaX) || event.shiftKey) {
      els.timelineContainer.scrollBy({
        left: horizontalDelta * 1.15,
        behavior: "smooth",
      });
      event.preventDefault();
    }
  }, { passive: false });

  panelEditableFields.forEach((el) => el.addEventListener("input", ui.savePanelToCurrentMarker));
}

async function init() {
  try {
    // Централизованная загрузка всех JSON-источников до первого рендера исключает
    // частичные состояния UI и "мигание" при асинхронной подгрузке блоков по отдельности.
    const data = await loadData();
    state.groupsData = data.groupsData;
    state.markersData = data.markersData;
    state.eventsData = data.eventsData;
    state.archiveData = data.archiveData;
    state.editorGroupId = state.groupsData[0]?.id || null;

    changesManager.setBaseVersion(data.loadedChanges?.meta?.baseVersion || "base-local-json");
    if (data.loadedChanges) {
      changesManager.loadPayload(data.loadedChanges);
    }

    editor.renderGroups();
    editor.renderMarkers();
    ui.renderTimeline();
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
    els.panelTitle.textContent = "Ошибка";
    els.panelSubtitle.textContent = "Не удалось загрузить JSON";
    els.panelText.textContent = "Проверь пути к файлам data/markers.json, data/timeline.json и data/archive.json.";
    els.fact1.textContent = "Папка data должна существовать";
    els.fact2.textContent = "JSON должен быть валидным";
    els.fact3.textContent = "Смотри консоль браузера";
    ui.togglePanel(true);
  }
}

ui.setPalette(state.currentPalette);
ui.togglePalettePopover(false);
ui.setPanelEditable(false);
ui.setModeWord("Map", true);
ui.togglePanel(true);
mapModule.applyMapTransform();

setupTopLevelInteractions();
mapModule.setupMapNavigation();
editor.setupEditorInteractions();

init();
