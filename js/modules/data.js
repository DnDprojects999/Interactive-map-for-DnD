export async function loadData() {
  const [markersResponse, timelineResponse] = await Promise.all([
    fetch("data/markers.json"),
    fetch("data/timeline.json"),
  ]);

  const [markersJson, timelineJson] = await Promise.all([
    markersResponse.json(),
    timelineResponse.json(),
  ]);

  return {
    groupsData: markersJson.groups || [],
    markersData: markersJson.markers || [],
    eventsData: timelineJson.events || [],
  };
}
