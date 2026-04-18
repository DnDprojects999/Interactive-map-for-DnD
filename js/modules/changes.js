const CHANGE_SCHEMA_VERSION = 1;
const GROUP_SCOPED_ENTITIES = new Set(["archiveItem", "heroItem"]);

// Only these entity types can be serialized into changes.json. Keeping the list
// explicit protects the overlay format from ad-hoc writes.
const SUPPORTED_ENTITIES = new Set([
  "markerGroup",
  "marker",
  "timelineAct",
  "timelineEvent",
  "archiveGroup",
  "archiveItem",
  "heroGroup",
  "heroItem",
  "homebrewCategory",
  "homebrewArticle",
  "player",
  "worldInfo",
  "regionLabel",
  "drawLayer",
  "mapTexture",
]);

const LIST_ENTITY_CONFIG = Object.freeze({
  markerGroup: { collection: "groupsData" },
  marker: { collection: "markersData" },
  timelineAct: { collection: "timelineActsData" },
  timelineEvent: { collection: "eventsData" },
  archiveGroup: { collection: "archiveData" },
  archiveItem: { collection: "archiveData", groupScoped: true },
  heroGroup: { collection: "heroesData" },
  heroItem: { collection: "heroesData", groupScoped: true },
  homebrewCategory: { collection: "homebrewCategoriesData" },
  homebrewArticle: { collection: "homebrewArticlesData" },
  player: { collection: "playersData" },
  regionLabel: { collection: "regionLabelsData" },
  drawLayer: { collection: "drawLayersData" },
});

function deepClone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

// Changes are validated both on import and before they enter the in-memory
// recorder. That way export/import and live editing follow the same rules.
function assertValidChange(change, index = 0) {
  if (!change || typeof change !== "object") {
    throw new Error(`Invalid change at index ${index}: expected object.`);
  }

  if (!SUPPORTED_ENTITIES.has(change.entity)) {
    throw new Error(`Invalid change at index ${index}: unsupported entity "${change.entity}".`);
  }

  if (!["upsert", "remove"].includes(change.op)) {
    throw new Error(`Invalid change at index ${index}: unsupported op "${change.op}".`);
  }

  if (typeof change.id !== "string" || !change.id.trim()) {
    throw new Error(`Invalid change at index ${index}: id is required.`);
  }

  if (GROUP_SCOPED_ENTITIES.has(change.entity) && (!change.groupId || typeof change.groupId !== "string")) {
    throw new Error(`Invalid change at index ${index}: ${change.entity} requires groupId.`);
  }

  if (change.op === "upsert" && (change.value === undefined || change.value === null)) {
    throw new Error(`Invalid change at index ${index}: upsert requires value.`);
  }
}

function setById(list, id, nextValue) {
  const index = list.findIndex((item) => item.id === id);
  if (index >= 0) {
    list[index] = nextValue;
    return;
  }
  list.push(nextValue);
}

function removeById(list, id) {
  return list.filter((item) => item.id !== id);
}

/**
 * The overlay file patches already-loaded base JSON. We normalize the expected
 * collections up front so applying changes never has to defend against
 * partially missing arrays from older snapshots.
 */
function ensureApplyTargetShape(result) {
  [
    "groupsData",
    "markersData",
    "timelineActsData",
    "eventsData",
    "archiveData",
    "heroesData",
    "homebrewCategoriesData",
    "homebrewArticlesData",
    "playersData",
    "regionLabelsData",
    "drawLayersData",
  ].forEach((key) => {
    result[key] = Array.isArray(result[key]) ? result[key] : [];
  });

  result.worldData = result.worldData && typeof result.worldData === "object"
    ? result.worldData
    : {};

  result.mapTexturesData = result.mapTexturesData && typeof result.mapTexturesData === "object"
    ? result.mapTexturesData
    : {};
}

// Group-scoped entities (archive items and hero items) live inside parent
// collections, so they need a different target resolver than flat lists.
function resolveListTarget(result, change) {
  const config = LIST_ENTITY_CONFIG[change.entity];
  if (!config) return null;

  if (!config.groupScoped) {
    return {
      list: result[config.collection],
      replace(nextValue) {
        result[config.collection] = nextValue;
      },
    };
  }

  const group = result[config.collection].find((entry) => entry.id === change.groupId);
  if (!group) return null;
  group.items = Array.isArray(group.items) ? group.items : [];

  return {
    list: group.items,
    replace(nextValue) {
      group.items = nextValue;
    },
  };
}

function applyListChange(result, change) {
  const target = resolveListTarget(result, change);
  if (!target) return false;

  if (change.op === "upsert") {
    setById(target.list, change.id, deepClone(change.value));
  } else {
    target.replace(removeById(target.list, change.id));
  }
  return true;
}

function applyMapTextureChange(result, change) {
  if (change.op === "upsert") {
    result.mapTexturesData[change.id] = typeof change.value === "string"
      ? change.value
      : String(change.value?.source || "");
    return;
  }

  result.mapTexturesData[change.id] = "";
}

function applyWorldInfoChange(result, change) {
  result.worldData = change.op === "upsert" ? deepClone(change.value) : {};
}

function describeChange(change) {
  const entity = change?.entity || "entity";
  const id = change?.id || "?";
  const groupId = change?.groupId ? ` in group "${change.groupId}"` : "";
  return `${entity} "${id}"${groupId}`;
}

export function validateChangesPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Changes payload must be an object.");
  }

  const schemaVersion = payload.meta?.schemaVersion;
  if (schemaVersion !== CHANGE_SCHEMA_VERSION) {
    throw new Error(`Unsupported changes schema version: ${schemaVersion}.`);
  }

  if (!Array.isArray(payload.changes)) {
    throw new Error("Changes payload must contain an array field: changes.");
  }

  payload.changes.forEach((change, index) => assertValidChange(change, index));
  return true;
}

export function applyChanges(baseData, payload) {
  if (!payload) return deepClone(baseData);
  validateChangesPayload(payload);

  const result = deepClone(baseData);
  ensureApplyTargetShape(result);
  // Group-scoped edits are replayed after top-level groups exist. This allows
  // an imported payload to create a group and its items in one pass.
  const deferredGroupedChanges = [];

  payload.changes.forEach((change) => {
    if (change.entity === "mapTexture") {
      applyMapTextureChange(result, change);
      return;
    }

    if (change.entity === "worldInfo") {
      applyWorldInfoChange(result, change);
      return;
    }

    if (LIST_ENTITY_CONFIG[change.entity]?.groupScoped) {
      deferredGroupedChanges.push(change);
      return;
    }

    if (!applyListChange(result, change)) {
      throw new Error(`Unable to apply change for ${describeChange(change)}.`);
    }
  });

  deferredGroupedChanges.forEach((change) => {
    if (!applyListChange(result, change)) {
      throw new Error(`Unable to apply grouped change for ${describeChange(change)} because the target group is missing.`);
    }
  });

  return result;
}

export function createChangesManager(options = {}) {
  let baseVersion = options.baseVersion || "unversioned";
  const changesIndex = new Map();

  // A composed key turns repeated edits of the same entity into "last write
  // wins", which keeps exported changes compact instead of append-only.
  function composeKey(change) {
    return `${change.entity}:${change.groupId || "-"}:${change.id}`;
  }

  function ingestChange(change) {
    assertValidChange(change);
    changesIndex.set(composeKey(change), deepClone(change));
  }

  function upsert(entity, id, value, extra = {}) {
    ingestChange({ entity, id, op: "upsert", value: deepClone(value), ...extra });
  }

  function remove(entity, id, extra = {}) {
    ingestChange({ entity, id, op: "remove", ...extra });
  }

  function clear() {
    changesIndex.clear();
  }

  function list() {
    return Array.from(changesIndex.values());
  }

  function hasChanges() {
    return changesIndex.size > 0;
  }

  function setBaseVersion(nextVersion) {
    if (typeof nextVersion === "string" && nextVersion.trim()) {
      baseVersion = nextVersion;
    }
  }

  function toPayload() {
    return {
      meta: {
        schemaVersion: CHANGE_SCHEMA_VERSION,
        baseVersion,
        generatedAt: new Date().toISOString(),
      },
      changes: list(),
    };
  }

  function loadPayload(payload) {
    validateChangesPayload(payload);
    clear();
    payload.changes.forEach((change) => ingestChange(change));
    setBaseVersion(payload.meta?.baseVersion || baseVersion);
  }

  function download(filename = "changes.json") {
    const blob = new Blob([JSON.stringify(toPayload(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return {
    upsert,
    remove,
    clear,
    list,
    hasChanges,
    setBaseVersion,
    toPayload,
    loadPayload,
    download,
  };
}
