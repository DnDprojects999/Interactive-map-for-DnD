import { getLocalizedText } from "./localization.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const ACTIVE_TOOL_MARKER = "marker";
const ACTIVE_TOOL_ROUTE = "route";
const MAP_INTERACTIVE_TARGETS = ".marker, .active-map-marker, .region-label, .active-route-hit, .active-route-line";

// Active map is a session-style overlay on top of the base map: extra markers,
// temporary routes, and pinned base markers can all change without touching the
// original world map data.
function createEmptyActiveMapData() {
  return {
    meta: {},
    pinnedMarkerIds: [],
    markers: [],
    routes: [],
  };
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function createActiveMapController(options) {
  const {
    els,
    state,
    mapModule,
    openMarkerInPanel,
    renderBaseMarkers,
    refreshEditorButtons,
  } = options;

  let drawingRoute = null;

  // This extra context check prevents active-map tools from reacting when
  // another fullscreen mode is visually covering the map.
  function isActiveMapEditingContext() {
    return Boolean(
      state.activeMapMode
      && document.body.classList.contains("active-map-mode")
      && !state.timelineMode
      && !state.archiveMode
      && !state.heroesMode
    );
  }

  function cancelDrawingRoute() {
    if (!drawingRoute?.id) {
      drawingRoute = null;
      return;
    }

    const data = getData();
    const hadRoute = data.routes.some((entry) => entry.id === drawingRoute.id);
    data.routes = data.routes.filter((entry) => entry.id !== drawingRoute.id);
    drawingRoute = null;

    if (hadRoute) {
      touchData();
      render();
    }
  }

  function getData() {
    // Keep the structure normalized on every access so imported or partially
    // missing active-map files do not break the live editor.
    if (!state.activeMapData || typeof state.activeMapData !== "object") {
      state.activeMapData = createEmptyActiveMapData();
    }

    state.activeMapData.meta = state.activeMapData.meta && typeof state.activeMapData.meta === "object"
      ? state.activeMapData.meta
      : {};
    state.activeMapData.pinnedMarkerIds = Array.isArray(state.activeMapData.pinnedMarkerIds)
      ? state.activeMapData.pinnedMarkerIds
      : [];
    state.activeMapData.markers = Array.isArray(state.activeMapData.markers)
      ? state.activeMapData.markers
      : [];
    state.activeMapData.routes = Array.isArray(state.activeMapData.routes)
      ? state.activeMapData.routes
      : [];

    return state.activeMapData;
  }

  function touchData() {
    getData().meta.updatedAt = new Date().toISOString();
  }

  function createEntityId(prefix) {
    return `active-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function isPinnedMarker(markerId) {
    return getData().pinnedMarkerIds.includes(markerId);
  }

  function shouldShowBaseMarker(markerId) {
    if (!state.activeMapMode) return true;
    return state.activeMapShowAllMarkers || isPinnedMarker(markerId);
  }

  function togglePinnedMarker(markerId, force) {
    if (!markerId) return;
    const data = getData();
    const pinned = new Set(data.pinnedMarkerIds);
    const shouldPin = typeof force === "boolean" ? force : !pinned.has(markerId);
    if (shouldPin) pinned.add(markerId);
    else pinned.delete(markerId);
    data.pinnedMarkerIds = Array.from(pinned);
    touchData();
    renderBaseMarkers?.();
    renderButtons();
    refreshEditorButtons?.();
  }

  function setTool(tool) {
    state.activeMapTool = tool === ACTIVE_TOOL_ROUTE ? ACTIVE_TOOL_ROUTE : ACTIVE_TOOL_MARKER;
    renderButtons();
    refreshEditorButtons?.();
  }

  function togglePinnedPreview(force) {
    state.activeMapShowAllMarkers = typeof force === "boolean" ? force : !state.activeMapShowAllMarkers;
    renderBaseMarkers?.();
    renderButtons();
    refreshEditorButtons?.();
  }

  function exportActiveMap() {
    const data = getData();
    touchData();
    downloadJson("active-map.json", data);
  }

  function createSidebarButton({ label, title, active, onClick, extraClass = "" }) {
    const button = document.createElement("button");
    button.className = `tool-btn ${extraClass}`.trim();
    button.textContent = label;
    button.title = title;
    button.dataset.label = title;
    button.type = "button";
    button.classList.toggle("active", Boolean(active));
    button.addEventListener("click", onClick);
    return button;
  }

  // The active map reuses the same sidebar slot as base map layers, so its
  // buttons are rendered manually when this mode is active.
  function renderButtons() {
    els.toolButtonsContainer.innerHTML = "";
    els.toolButtonsContainer.appendChild(createSidebarButton({
      label: "С",
      title: "Активные события",
      active: state.activeMapTool === ACTIVE_TOOL_MARKER,
      onClick: () => setTool(ACTIVE_TOOL_MARKER),
    }));
    els.toolButtonsContainer.appendChild(createSidebarButton({
      label: "П",
      title: "Маршруты и следы партии",
      active: state.activeMapTool === ACTIVE_TOOL_ROUTE,
      onClick: () => setTool(ACTIVE_TOOL_ROUTE),
    }));
    els.toolButtonsContainer.appendChild(createSidebarButton({
      label: "Б",
      title: state.activeMapShowAllMarkers ? "Скрыть все базовые метки" : "Показать все базовые метки",
      active: state.activeMapShowAllMarkers,
      onClick: () => togglePinnedPreview(),
    }));
  }

  function removeActiveMarker(markerId) {
    const data = getData();
    data.markers = data.markers.filter((entry) => entry.id !== markerId);
    if (state.currentPanelEntity?.entity === "activeMarker" && state.currentMarker?.id === markerId) {
      state.currentMarker = null;
      state.currentPanelEntity = { entity: "marker" };
    }
    touchData();
    render();
  }

  function removeRoute(routeId) {
    const data = getData();
    data.routes = data.routes.filter((entry) => entry.id !== routeId);
    touchData();
    render();
  }

  function createRouteDefs() {
    const defs = document.createElementNS(SVG_NS, "defs");
    const marker = document.createElementNS(SVG_NS, "marker");
    marker.setAttribute("id", "active-route-arrow");
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "8.6");
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "3.4");
    marker.setAttribute("markerHeight", "3.4");
    marker.setAttribute("orient", "auto-start-reverse");

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    path.setAttribute("fill", "currentColor");
    marker.appendChild(path);
    defs.appendChild(marker);
    return defs;
  }

  function renderRoutes() {
    // Routes are drawn in SVG because arrows, hit areas, and scalable line
    // widths are much easier to manage there than with plain divs.
    const data = getData();
    els.activeMapSvg.innerHTML = "";
    els.activeMapSvg.appendChild(createRouteDefs());

    data.routes.forEach((route) => {
      if (!Array.isArray(route.points) || route.points.length < 2) return;
      const points = route.points.map((point) => `${point.x},${point.y}`).join(" ");

      const line = document.createElementNS(SVG_NS, "polyline");
      line.setAttribute("points", points);
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", route.color || "#f59e0b");
      line.setAttribute("stroke-width", String(route.width || 2.8));
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("stroke-linejoin", "round");
      line.setAttribute("marker-end", "url(#active-route-arrow)");
      line.setAttribute("class", "active-route-line");
      line.style.color = route.color || "#f59e0b";

      const hitArea = document.createElementNS(SVG_NS, "polyline");
      hitArea.setAttribute("points", points);
      hitArea.setAttribute("fill", "none");
      hitArea.setAttribute("stroke", "rgba(255,255,255,0.001)");
      hitArea.setAttribute("stroke-width", String(Math.max((route.width || 2.8) + 2, 8)));
      hitArea.setAttribute("stroke-linecap", "round");
      hitArea.setAttribute("stroke-linejoin", "round");
      hitArea.setAttribute("class", "active-route-hit");
      hitArea.dataset.routeId = route.id;
      hitArea.addEventListener("click", (event) => {
        if (!isActiveMapEditingContext()) return;
        event.stopPropagation();
        if (!state.editMode) return;
        if (event.altKey) {
          removeRoute(route.id);
          return;
        }
        const nextTitle = window.prompt("Название маршрута", route.title || "Маршрут сессии");
        if (nextTitle === null) return;
        route.title = nextTitle.trim() || "Маршрут сессии";
        touchData();
        render();
      });

      els.activeMapSvg.append(line, hitArea);
    });
  }

  function createActiveMarkerElement(marker) {
    // Active markers can be opened like regular markers, but in edit mode they
    // are also directly draggable on the map surface.
    const markerEl = document.createElement("button");
    markerEl.className = "active-map-marker";
    markerEl.type = "button";
    markerEl.dataset.activeMarkerId = marker.id;
    markerEl.style.left = `${marker.x}%`;
    markerEl.style.top = `${marker.y}%`;
    markerEl.style.setProperty("--active-marker-color", marker.color || "#f59e0b");

    const label = document.createElement("span");
    label.className = "active-map-marker-label";
    label.textContent = getLocalizedText(marker, "title", state, "Событие");
    markerEl.appendChild(label);

    markerEl.addEventListener("click", (event) => {
      event.stopPropagation();
      if (state.editMode && event.altKey) {
        removeActiveMarker(marker.id);
        return;
      }
      openMarkerInPanel?.(marker);
    });

    markerEl.addEventListener("pointerdown", (event) => {
      if (!state.editMode) return;
      event.stopPropagation();
      markerEl.setPointerCapture(event.pointerId);

      const onMove = (moveEvent) => {
        const point = mapModule.getMapPercentFromClient(moveEvent.clientX, moveEvent.clientY);
        marker.x = point.x;
        marker.y = point.y;
        markerEl.style.left = `${marker.x}%`;
        markerEl.style.top = `${marker.y}%`;
      };

      const onEnd = () => {
        markerEl.removeEventListener("pointermove", onMove);
        markerEl.removeEventListener("pointerup", onEnd);
        markerEl.removeEventListener("pointercancel", onEnd);
        touchData();
      };

      markerEl.addEventListener("pointermove", onMove);
      markerEl.addEventListener("pointerup", onEnd);
      markerEl.addEventListener("pointercancel", onEnd);
    });

    return markerEl;
  }

  function render() {
    const data = getData();
    els.activeMarkersContainer.innerHTML = "";
    renderRoutes();
    data.markers.forEach((marker) => {
      els.activeMarkersContainer.appendChild(createActiveMarkerElement(marker));
    });
  }

  function createDefaultActiveMarker(clientX, clientY) {
    const point = mapModule.getMapPercentFromClient(clientX, clientY);
    return {
      id: createEntityId("marker"),
      title: "Новое событие",
      type: "Активное событие",
      x: point.x,
      y: point.y,
      description: "Опиши, что произошло в этой точке после последней сессии.",
      facts: [
        "Что здесь произошло",
        "Кто участвовал",
        "Куда это ведет дальше",
      ],
      imageUrl: "",
      imageText: "Добавь иллюстрацию эпизода или схему.",
      color: "#f59e0b",
    };
  }

  function addActiveMarkerAt(clientX, clientY) {
    const data = getData();
    const marker = createDefaultActiveMarker(clientX, clientY);
    data.markers.push(marker);
    touchData();
    render();
    openMarkerInPanel?.(marker);
  }

  function beginRoute(clientX, clientY) {
    const data = getData();
    const startPoint = mapModule.getMapPercentFromClient(clientX, clientY);
    drawingRoute = {
      id: createEntityId("route"),
      title: "Маршрут сессии",
      color: state.drawBrushColor || "#f59e0b",
      width: Math.max(2, Number(state.drawBrushSize || 3)),
      points: [startPoint],
    };
    data.routes.push(drawingRoute);
    render();
  }

  function extendRoute(clientX, clientY) {
    if (!drawingRoute) return;
    drawingRoute.points.push(mapModule.getMapPercentFromClient(clientX, clientY));
    render();
  }

  function finishRoute() {
    if (!drawingRoute) return;
    if (!Array.isArray(drawingRoute.points) || drawingRoute.points.length < 2) {
      cancelDrawingRoute();
      return;
    }
    touchData();
    drawingRoute = null;
    render();
  }

  function focusMarker(markerId) {
    const marker = getData().markers.find((entry) => entry.id === markerId);
    if (marker) openMarkerInPanel?.(marker);
    return els.activeMarkersContainer.querySelector(`[data-active-marker-id="${markerId}"]`);
  }

  function setup() {
    els.addActiveMarkerButton.addEventListener("click", () => setTool(ACTIVE_TOOL_MARKER));
    els.addActiveRouteButton.addEventListener("click", () => setTool(ACTIVE_TOOL_ROUTE));
    els.toggleActivePinsButton.addEventListener("click", () => togglePinnedPreview());
    els.exportActiveMapButton.addEventListener("click", exportActiveMap);

    els.mapStage.addEventListener("click", (event) => {
      if (!isActiveMapEditingContext() || !state.editMode) return;
      if (state.activeMapTool !== ACTIVE_TOOL_MARKER) return;
      if (event.target.closest(MAP_INTERACTIVE_TARGETS)) return;
      addActiveMarkerAt(event.clientX, event.clientY);
    });

    els.mapStage.addEventListener("pointerdown", (event) => {
      if (!isActiveMapEditingContext() || !state.editMode) return;
      if (state.activeMapTool !== ACTIVE_TOOL_ROUTE) return;
      if (event.target.closest(MAP_INTERACTIVE_TARGETS)) return;
      beginRoute(event.clientX, event.clientY);
    });

    els.mapStage.addEventListener("pointermove", (event) => {
      if (!isActiveMapEditingContext() || !state.editMode || state.activeMapTool !== ACTIVE_TOOL_ROUTE) return;
      if (!drawingRoute) return;
      extendRoute(event.clientX, event.clientY);
    });

    window.addEventListener("pointerup", finishRoute);
    window.addEventListener("pointercancel", finishRoute);
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") cancelDrawingRoute();
    });
  }

  return {
    cancelDrawingRoute,
    exportActiveMap,
    focusMarker,
    isPinnedMarker,
    render,
    renderButtons,
    setTool,
    setup,
    shouldShowBaseMarker,
    togglePinnedMarker,
    togglePinnedPreview,
  };
}
