const CHANGE_SCHEMA_VERSION = 1;

const SUPPORTED_ENTITIES = new Set(["marker", "timelineEvent", "archiveGroup", "archiveItem"]);

function deepClone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function assertValidChange(change, index = 0) {
  if (!change || typeof change !== "object") {
    throw new Error(`Invalid change at index ${index}: expected object.`);
  }

  if (!SUPPORTED_ENTITIES.has(change.entity)) {
    throw new Error(`Invalid change at index ${index}: unsupported entity \"${change.entity}\".`);
  }

  if (!["upsert", "remove"].includes(change.op)) {
    throw new Error(`Invalid change at index ${index}: unsupported op \"${change.op}\".`);
  }

  if (typeof change.id !== "string" || !change.id.trim()) {
    throw new Error(`Invalid change at index ${index}: id is required.`);
  }

  if (change.entity === "archiveItem" && (!change.groupId || typeof change.groupId !== "string")) {
    throw new Error(`Invalid change at index ${index}: archiveItem requires groupId.`);
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

  payload.changes.forEach((change) => {
    if (change.entity === "marker") {
      if (change.op === "upsert") {
        setById(result.markersData, change.id, deepClone(change.value));
      } else {
        result.markersData = removeById(result.markersData, change.id);
      }
      return;
    }

    if (change.entity === "timelineEvent") {
      if (change.op === "upsert") {
        setById(result.eventsData, change.id, deepClone(change.value));
      } else {
        result.eventsData = removeById(result.eventsData, change.id);
      }
      return;
    }

    if (change.entity === "archiveGroup") {
      if (change.op === "upsert") {
        setById(result.archiveData, change.id, deepClone(change.value));
      } else {
        result.archiveData = removeById(result.archiveData, change.id);
      }
      return;
    }

    if (change.entity === "archiveItem") {
      const group = result.archiveData.find((entry) => entry.id === change.groupId);
      if (!group) return;
      group.items = Array.isArray(group.items) ? group.items : [];

      if (change.op === "upsert") {
        setById(group.items, change.id, deepClone(change.value));
      } else {
        group.items = removeById(group.items, change.id);
      }
    }
  });

  return result;
}

export function createChangesManager(options = {}) {
  let baseVersion = options.baseVersion || "unversioned";
  const changesIndex = new Map();

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

  function download(filename = "world-changes.json") {
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
