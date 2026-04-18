import { applyChanges, validateChangesPayload } from "./changes.js";
import { normalizePlayersData } from "./players/playerRoster.js";
import { DEFAULT_WORLD_INFO, normalizeWorldInfo } from "./worldInfo.js";

// These validators are intentionally small and strict: they catch "wrong file
// shape" problems before the UI starts rendering partial data.
function validateMarkersJson(payload) {
  if (!payload || typeof payload !== "object") throw new Error("markers.json: invalid root object.");
  if (!Array.isArray(payload.groups)) throw new Error("markers.json: groups must be an array.");
  if (!Array.isArray(payload.markers)) throw new Error("markers.json: markers must be an array.");
}

function validateTimelineJson(payload) {
  if (!payload || typeof payload !== "object") throw new Error("timeline.json: invalid root object.");
  if (payload.acts !== undefined && !Array.isArray(payload.acts)) throw new Error("timeline.json: acts must be an array.");
  if (!Array.isArray(payload.events)) throw new Error("timeline.json: events must be an array.");
}

function validateArchiveJson(payload) {
  if (!payload || typeof payload !== "object") throw new Error("archive.json: invalid root object.");
  if (!Array.isArray(payload.groups)) throw new Error("archive.json: groups must be an array.");
}

function validateHeroesJson(payload) {
  if (!payload || typeof payload !== "object") throw new Error("heroes.json: invalid root object.");
  if (!Array.isArray(payload.groups)) throw new Error("heroes.json: groups must be an array.");
}

function validateHomebrewJson(payload) {
  if (!payload || typeof payload !== "object") throw new Error("homebrew.json: invalid root object.");
  if (!Array.isArray(payload.categories)) throw new Error("homebrew.json: categories must be an array.");
  if (!Array.isArray(payload.articles)) throw new Error("homebrew.json: articles must be an array.");
}

function validateActiveMapJson(payload) {
  if (!payload || typeof payload !== "object") throw new Error("active-map.json: invalid root object.");
  if (payload.pinnedMarkerIds !== undefined && !Array.isArray(payload.pinnedMarkerIds)) {
    throw new Error("active-map.json: pinnedMarkerIds must be an array.");
  }
  if (payload.markers !== undefined && !Array.isArray(payload.markers)) {
    throw new Error("active-map.json: markers must be an array.");
  }
  if (payload.routes !== undefined && !Array.isArray(payload.routes)) {
    throw new Error("active-map.json: routes must be an array.");
  }
}

function validateWorldJson(payload) {
  if (!payload || typeof payload !== "object") throw new Error("world.json: invalid root object.");
}

function validatePlayersJson(payload) {
  if (!payload || typeof payload !== "object") throw new Error("players.json: invalid root object.");
  if (payload.players !== undefined && !Array.isArray(payload.players)) {
    throw new Error("players.json: players must be an array.");
  }
}

async function tryLoadOptionalChanges() {
  const candidates = ["data/changes.json", "data/world-changes.json"];

  // changes.json is an optional overlay. Missing file means "load the raw
  // project", while invalid JSON is still a real startup error.
  for (const path of candidates) {
    let response;
    try {
      response = await fetch(path, { cache: "no-store" });
    } catch (error) {
      // If the optional overlay is temporarily unavailable in the environment, the base content can still load.
      return null;
    }

    if (!response.ok) {
      if (response.status === 404) continue;
      throw new Error(`РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ ${response.url} (${response.status})`);
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error(`Changes payload in ${response.url} contains invalid JSON.`);
    }

    validateChangesPayload(payload);
    return payload;
  }

  return null;
}

async function tryLoadOptionalActiveMap() {
  let response;
  try {
    response = await fetch("data/active-map.json", { cache: "no-store" });
  } catch (error) {
    return { meta: {}, pinnedMarkerIds: [], markers: [], routes: [] };
  }

  if (!response.ok) {
    if (response.status === 404) return { meta: {}, pinnedMarkerIds: [], markers: [], routes: [] };
    throw new Error(`Failed to load ${response.url} (${response.status})`);
  }

  const payload = await response.json();
  validateActiveMapJson(payload);
  return {
    meta: payload.meta && typeof payload.meta === "object" ? payload.meta : {},
    pinnedMarkerIds: Array.isArray(payload.pinnedMarkerIds) ? payload.pinnedMarkerIds : [],
    markers: Array.isArray(payload.markers) ? payload.markers : [],
    routes: Array.isArray(payload.routes) ? payload.routes : [],
  };
}

async function tryLoadOptionalWorld() {
  let response;
  try {
    response = await fetch("data/world.json", { cache: "no-store" });
  } catch (error) {
    return { ...DEFAULT_WORLD_INFO };
  }

  if (!response.ok) {
    if (response.status === 404) return { ...DEFAULT_WORLD_INFO };
    throw new Error(`Failed to load ${response.url} (${response.status})`);
  }

  const payload = await response.json();
  validateWorldJson(payload);
  return normalizeWorldInfo(payload);
}

// Optional files let creators ship only the parts they actually use. Each
// helper returns a safe default so the rest of the app can stay predictable.
async function tryLoadOptionalPlayers(heroesData) {
  let response;
  try {
    response = await fetch("data/players.json", { cache: "no-store" });
  } catch (error) {
    return [];
  }

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to load ${response.url} (${response.status})`);
  }

  const payload = await response.json();
  validatePlayersJson(payload);
  return normalizePlayersData(payload, heroesData);
}

async function tryLoadOptionalHomebrew() {
  let response;
  try {
    response = await fetch("data/homebrew.json", { cache: "no-store" });
  } catch (error) {
    return { categories: [], articles: [] };
  }

  if (!response.ok) {
    if (response.status === 404) return { categories: [], articles: [] };
    throw new Error(`Failed to load ${response.url} (${response.status})`);
  }

  const payload = await response.json();
  validateHomebrewJson(payload);
  return {
    categories: Array.isArray(payload.categories) ? payload.categories : [],
    articles: Array.isArray(payload.articles) ? payload.articles : [],
  };
}

// Startup consumes a clean base snapshot first and only then applies the
// optional changes overlay, so import/export stays deterministic.
export async function loadData() {
  // Р—Р°РіСЂСѓР¶Р°РµРј РїР°СЂР°Р»Р»РµР»СЊРЅРѕ, С‡С‚РѕР±С‹ РјРёРЅРёРјРёР·РёСЂРѕРІР°С‚СЊ TTFI РїСЂРё СЃС‚Р°СЂС‚Рµ РїСЂРёР»РѕР¶РµРЅРёСЏ.
  const [markersResponse, timelineResponse, archiveResponse, heroesResponse, activeMapData, worldData, homebrewData] = await Promise.all([
    fetch("data/markers.json"),
    fetch("data/timeline.json"),
    fetch("data/archive.json"),
    fetch("data/heroes.json"),
    tryLoadOptionalActiveMap(),
    tryLoadOptionalWorld(),
    tryLoadOptionalHomebrew(),
  ]);

  [markersResponse, timelineResponse, archiveResponse, heroesResponse].forEach((response) => {
    if (!response.ok) {
      throw new Error(`РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ ${response.url} (${response.status})`);
    }
  });

  const [markersJson, timelineJson, archiveJson, heroesJson] = await Promise.all([
    markersResponse.json(),
    timelineResponse.json(),
    archiveResponse.json(),
    heroesResponse.json(),
  ]);

  validateMarkersJson(markersJson);
  validateTimelineJson(timelineJson);
  validateArchiveJson(archiveJson);
  validateHeroesJson(heroesJson);
  const playersData = await tryLoadOptionalPlayers(heroesJson.groups || []);

  const baseData = {
    worldData,
    playersData,
    groupsData: markersJson.groups || [],
    markersData: markersJson.markers || [],
    timelineActsData: timelineJson.acts || [],
    eventsData: timelineJson.events || [],
    archiveData: archiveJson.groups || [],
    heroesData: heroesJson.groups || [],
    homebrewCategoriesData: homebrewData.categories || [],
    homebrewArticlesData: homebrewData.articles || [],
    activeMapData,
    regionLabelsData: markersJson.regionLabels || [],
    drawLayersData: markersJson.drawLayers || [],
    mapTexturesData: markersJson.mapTextures && typeof markersJson.mapTextures === "object"
      ? Object.fromEntries(
          Object.entries(markersJson.mapTextures).map(([key, value]) => [String(key || "").trim(), String(value || "")]),
        )
      : {},
  };

  // Reapply exported edits on top of the repository snapshot.
  const loadedChanges = await tryLoadOptionalChanges();
  const resolvedData = loadedChanges ? applyChanges(baseData, loadedChanges) : baseData;
  const normalizedWorldData = normalizeWorldInfo(resolvedData.worldData);
  const normalizedPlayersData = normalizePlayersData(resolvedData.playersData, resolvedData.heroesData);

  return {
    ...resolvedData,
    baseData,
    worldData: normalizedWorldData,
    playersData: normalizedPlayersData,
    loadedChanges,
  };
}
