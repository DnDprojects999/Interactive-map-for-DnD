import assert from "node:assert/strict";
import { applyChanges, validateChangesPayload } from "../js/modules/changes.js";

const baseData = {
  groupsData: [],
  markersData: [{ id: "m1", title: "Old" }],
  eventsData: [{ id: "e1", title: "Event" }],
  archiveData: [{ id: "g1", items: [{ id: "i1", title: "Item" }] }],
};

const payload = {
  meta: { schemaVersion: 1, baseVersion: "test" },
  changes: [
    { entity: "marker", op: "upsert", id: "m1", value: { id: "m1", title: "New" } },
    { entity: "timelineEvent", op: "remove", id: "e1" },
    { entity: "archiveItem", op: "upsert", id: "i2", groupId: "g1", value: { id: "i2", title: "Item 2" } },
  ],
};

validateChangesPayload(payload);

const result = applyChanges(baseData, payload);
assert.equal(result.markersData.find((entry) => entry.id === "m1")?.title, "New");
assert.equal(result.eventsData.length, 0);
assert.equal(result.archiveData[0].items.length, 2);

console.log("Smoke tests passed.");
