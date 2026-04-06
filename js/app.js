const slides = document.getElementById("slides");
const switchHandle = document.getElementById("switchHandle");
const slideSwitch = document.getElementById("slideSwitch");

const styleHandle = document.getElementById("styleHandle");
const styleSwitch = document.getElementById("styleSwitch");
const mapStage = document.getElementById("mapStage");
const mapCaption = document.getElementById("mapCaption");
const content = document.getElementById("content");
const panelButton = document.getElementById("panelButton");
const panelHandle = document.getElementById("panelHandle");
const closePanel = document.getElementById("closePanel");

const panelTitle = document.getElementById("panelTitle");
const panelSubtitle = document.getElementById("panelSubtitle");
const panelText = document.getElementById("panelText");
const fact1 = document.getElementById("fact1");
const fact2 = document.getElementById("fact2");
const fact3 = document.getElementById("fact3");

const toolButtonsContainer = document.getElementById("toolButtonsContainer");
const markersContainer = document.getElementById("markersContainer");
const timelineContainer = document.getElementById("timelineContainer");

let currentSlide = 0;
let currentStyleMode = 0; // 0 = sketch, 1 = art
let dragging = false;
let dragProgress = 0;

let groupsData = [];
let markersData = [];
let eventsData = [];

function getMaxHandleX() {
  return slideSwitch.clientWidth - switchHandle.clientWidth - 8;
}

function setSlide(index) {
  currentSlide = index;
  slides.style.transform = `translateX(-${index * 100}%)`;

  const maxX = getMaxHandleX();
  switchHandle.style.transform = `translateX(${index === 1 ? maxX : 0}px)`;
}
function setStyleMode(index) {
  currentStyleMode = index;

  const maxX = styleSwitch.clientWidth - styleHandle.clientWidth - 8;
  styleHandle.style.transform = `translateX(${index === 1 ? maxX : 0}px)`;

  mapStage.classList.toggle("sketch-mode", index === 0);
  mapStage.classList.toggle("art-mode", index === 1);

  mapCaption.textContent = index === 0
    ? "Сейчас включён режим: скетч"
    : "Сейчас включён режим: арт";
}
function togglePanel(force) {
  const shouldOpen = typeof force === "boolean"
    ? force
    : !content.classList.contains("panel-open");

  content.classList.toggle("panel-open", shouldOpen);
  panelHandle.textContent = shouldOpen ? "▶" : "◀";
}

function updatePanelFromMarker(marker) {
  panelTitle.textContent = marker.title || "Без названия";
  panelSubtitle.textContent = marker.type || "Метка";
  panelText.textContent = marker.description || "Описание пока не добавлено.";

  fact1.textContent = marker.facts?.[0] || "—";
  fact2.textContent = marker.facts?.[1] || "—";
  fact3.textContent = marker.facts?.[2] || "—";

  togglePanel(true);
}

function renderGroups() {
  toolButtonsContainer.innerHTML = "";

  groupsData.forEach((group) => {
    const button = document.createElement("button");
    button.className = `tool-btn ${group.enabled ? "active" : ""}`;
    button.dataset.group = group.id;
    button.dataset.label = group.name;
    button.textContent = group.short || "?";

    button.addEventListener("click", () => {
      group.enabled = !group.enabled;
      button.classList.toggle("active", group.enabled);

      const relatedMarkers = markersContainer.querySelectorAll(`[data-group="${group.id}"]`);
      relatedMarkers.forEach((markerEl) => {
        markerEl.classList.toggle("hidden", !group.enabled);
      });
    });

    toolButtonsContainer.appendChild(button);
  });
}

function renderMarkers() {
  markersContainer.innerHTML = "";

  markersData.forEach((marker) => {
    const markerEl = document.createElement("button");
    markerEl.className = "marker";
    markerEl.dataset.group = marker.group;
    markerEl.style.left = `${marker.x}%`;
    markerEl.style.top = `${marker.y}%`;

    const group = groupsData.find((g) => g.id === marker.group);
    if (group && group.color) {
      markerEl.style.background = group.color;
    }

    if (group && group.enabled === false) {
      markerEl.classList.add("hidden");
    }

    markerEl.addEventListener("click", () => updatePanelFromMarker(marker));
    markersContainer.appendChild(markerEl);
  });
}

function renderTimeline() {
  timelineContainer.innerHTML = "";

  eventsData.forEach((event) => {
    const card = document.createElement("article");
    card.className = `event-card ${event.position || "up"}`;

    card.innerHTML = `
      <div class="event-year">${event.year || ""}</div>
      <h3 class="event-title">${event.title || "Без названия"}</h3>
      <p class="event-text">${event.description || ""}</p>
    `;

    timelineContainer.appendChild(card);
  });
}

async function loadData() {
  try {
    const markersResponse = await fetch("data/markers.json");
    const timelineResponse = await fetch("data/timeline.json");

    const markersJson = await markersResponse.json();
    const timelineJson = await timelineResponse.json();

    groupsData = markersJson.groups || [];
    markersData = markersJson.markers || [];
    eventsData = timelineJson.events || [];

    renderGroups();
    renderMarkers();
    renderTimeline();
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
    panelTitle.textContent = "Ошибка";
    panelSubtitle.textContent = "Не удалось загрузить JSON";
    panelText.textContent = "Проверь пути к файлам data/markers.json и data/timeline.json.";
    fact1.textContent = "Папка data должна существовать";
    fact2.textContent = "JSON должен быть валидным";
    fact3.textContent = "Смотри консоль браузера";
    togglePanel(true);
  }
}

panelButton.addEventListener("click", () => togglePanel());
panelHandle.addEventListener("click", () => togglePanel());
closePanel.addEventListener("click", () => togglePanel(false));

slideSwitch.addEventListener("click", (event) => {
  if (dragging) return;
  const rect = slideSwitch.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  setSlide(clickX > rect.width / 2 ? 1 : 0);
});

styleSwitch.addEventListener("click", (event) => {
  const rect = styleSwitch.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  setStyleMode(clickX > rect.width / 2 ? 1 : 0);
});

switchHandle.addEventListener("pointerdown", (event) => {
  dragging = true;
  switchHandle.classList.add("dragging");
  switchHandle.setPointerCapture(event.pointerId);
});

switchHandle.addEventListener("pointermove", (event) => {
  if (!dragging) return;

  const rect = slideSwitch.getBoundingClientRect();
  const maxX = getMaxHandleX();
  const rawX = event.clientX - rect.left - switchHandle.clientWidth / 2;
  const clamped = Math.max(0, Math.min(rawX - 4, maxX));
  dragProgress = maxX > 0 ? clamped / maxX : 0;
  switchHandle.style.transform = `translateX(${clamped}px)`;
});

function endDrag() {
  if (!dragging) return;
  dragging = false;
  switchHandle.classList.remove("dragging");
  setSlide(dragProgress > 0.5 ? 1 : 0);
}

switchHandle.addEventListener("pointerup", endDrag);
switchHandle.addEventListener("pointercancel", endDrag);
styleHandle.addEventListener("click", (event) => {
  event.stopPropagation();
});
window.addEventListener("resize", () => setSlide(currentSlide));

setSlide(0);
setStyleMode(0);
togglePanel(true);
loadData();
