import { applyChanges, validateChangesPayload } from "./changes.js";

function validateMarkersJson(payload) {
  if (!payload || typeof payload !== "object") throw new Error("markers.json: invalid root object.");
  if (!Array.isArray(payload.groups)) throw new Error("markers.json: groups must be an array.");
  if (!Array.isArray(payload.markers)) throw new Error("markers.json: markers must be an array.");
}

function validateTimelineJson(payload) {
  if (!payload || typeof payload !== "object") throw new Error("timeline.json: invalid root object.");
  if (!Array.isArray(payload.events)) throw new Error("timeline.json: events must be an array.");
}

function validateArchiveJson(payload) {
  if (!payload || typeof payload !== "object") throw new Error("archive.json: invalid root object.");
  if (!Array.isArray(payload.groups)) throw new Error("archive.json: groups must be an array.");
}

async function tryLoadOptionalChanges() {
  try {
    const response = await fetch("data/changes.json", { cache: "no-store" });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Не удалось загрузить ${response.url} (${response.status})`);
    }

    const payload = await response.json();
    validateChangesPayload(payload);
    return payload;
  } catch (error) {
    if (error?.message?.includes("Unsupported changes schema version")) throw error;
    if (error?.message?.includes("Changes payload")) throw error;
    // Если файла изменений нет/недоступен, базовый сценарий продолжает работать.
    return null;
  }
}

export async function loadData() {
  // Загружаем параллельно, чтобы минимизировать TTFI при старте приложения.
  const [markersResponse, timelineResponse, archiveResponse] = await Promise.all([
    fetch("data/markers.json"),
    fetch("data/timeline.json"),
    fetch("data/archive.json"),
  ]);

  [markersResponse, timelineResponse, archiveResponse].forEach((response) => {
    if (!response.ok) {
      throw new Error(`Не удалось загрузить ${response.url} (${response.status})`);
    }
  });

  const [markersJson, timelineJson, archiveJson] = await Promise.all([
    markersResponse.json(),
    timelineResponse.json(),
    archiveResponse.json(),
  ]);

  validateMarkersJson(markersJson);
  validateTimelineJson(timelineJson);
  validateArchiveJson(archiveJson);

  const baseData = {
    groupsData: markersJson.groups || [],
    markersData: markersJson.markers || [],
    eventsData: timelineJson.events || [],
    archiveData: archiveJson.groups || [],
  };

  const loadedChanges = await tryLoadOptionalChanges();
  const resolvedData = loadedChanges ? applyChanges(baseData, loadedChanges) : baseData;

  return {
    ...resolvedData,
    loadedChanges,
  };
}
