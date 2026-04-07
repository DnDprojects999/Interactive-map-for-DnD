export async function loadData() {
  const [markersResponse, timelineResponse, archiveResponse] = await Promise.all([
    fetch("data/markers.json"),
    fetch("data/timeline.json"),
    fetch("data/archive.json"),
  ]);

  const [markersJson, timelineJson, archiveJson] = await Promise.all([
    markersResponse.json(),
    timelineResponse.json(),
    archiveResponse.json(),
  ]);

  return {
    groupsData: markersJson.groups || [],
    markersData: markersJson.markers || [],
    eventsData: timelineJson.events || [],
    archiveData: archiveJson.groups || [],
  };
}
