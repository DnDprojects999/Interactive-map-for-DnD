import assert from "node:assert/strict";
import { applyChanges, validateChangesPayload } from "../js/modules/changes.js";

const baseData = {
  groupsData: [],
  markersData: [{ id: "m1", title: "Old" }],
  eventsData: [{ id: "e1", title: "Event" }],
  archiveData: [{ id: "g1", items: [{ id: "i1", title: "Item" }] }],
  heroesData: [{ id: "h-group-1", items: [{ id: "h1", title: "Hero" }] }],
  mapTexturesData: { author: "", interactive: "" },
};

const payload = {
  meta: { schemaVersion: 1, baseVersion: "test" },
  changes: [
    { entity: "marker", op: "upsert", id: "m1", value: { id: "m1", title: "New" } },
    { entity: "timelineEvent", op: "remove", id: "e1" },
    { entity: "archiveItem", op: "upsert", id: "i2", groupId: "g1", value: { id: "i2", title: "Item 2" } },
    { entity: "heroItem", op: "upsert", id: "h2", groupId: "h-group-1", value: { id: "h2", title: "Hero 2" } },
  ],
};

validateChangesPayload(payload);

const result = applyChanges(baseData, payload);
assert.equal(result.markersData.find((entry) => entry.id === "m1")?.title, "New");
assert.equal(result.eventsData.length, 0);
assert.equal(result.archiveData[0].items.length, 2);
assert.equal(result.heroesData[0].items.length, 2);

const movedArchiveItemPayload = {
  meta: { schemaVersion: 1, baseVersion: "test" },
  changes: [
    { entity: "archiveItem", op: "remove", id: "i1", groupId: "g1" },
    { entity: "archiveGroup", op: "upsert", id: "g2", value: { id: "g2", items: [] } },
    { entity: "archiveItem", op: "upsert", id: "i1", groupId: "g2", value: { id: "i1", title: "Moved" } },
    { entity: "heroItem", op: "remove", id: "h1", groupId: "h-group-1" },
    { entity: "heroGroup", op: "upsert", id: "h-group-2", value: { id: "h-group-2", items: [] } },
    { entity: "heroItem", op: "upsert", id: "h1", groupId: "h-group-2", value: { id: "h1", title: "Moved Hero" } },
    { entity: "mapTexture", op: "upsert", id: "interactive", value: "data:image/png;base64,AAAA" },
  ],
};

validateChangesPayload(movedArchiveItemPayload);

const movedResult = applyChanges(baseData, movedArchiveItemPayload);
assert.equal(movedResult.archiveData[0].items.length, 0);
assert.equal(movedResult.archiveData[1].items[0].title, "Moved");
assert.equal(movedResult.heroesData[0].items.length, 0);
assert.equal(movedResult.heroesData[1].items[0].title, "Moved Hero");
assert.equal(movedResult.mapTexturesData.interactive, "data:image/png;base64,AAAA");

console.log("Smoke tests passed.");
