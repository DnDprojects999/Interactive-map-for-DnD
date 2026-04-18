import { isFactionArchiveGroup, getArchiveItemSymbolUrl } from "./factionSymbols.js";

// The data-quality report is intentionally heuristic. It is meant to catch
// suspicious placeholders, missing media, and broken references before export,
// not to act as a strict schema validator.
const PLACEHOLDER_PATTERNS = [
  "новый поворот хроники",
  "новая глава",
  "новая запись",
  "новая фракция",
  "новый город",
  "новый орган власти",
  "новая партия",
  "новый герой",
  "добавь портрет героя",
  "описание пока",
  "короткое описание",
  "подробное описание",
  "роль в хронике",
  "факт 1",
  "факт 2",
  "факт 3",
  "что именно произошло",
];

const TITLE_LIMIT = 90;
const LABEL_LIMIT = 24;
const IMAGE_LABEL_LIMIT = 56;
const DATA_URL_WARN_LENGTH = 300000;

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function isBlankOrPlaceholder(value) {
  const text = normalize(value);
  if (!text) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => text.includes(pattern));
}

function isTooLong(value, limit) {
  return String(value || "").trim().length > limit;
}

function addIssue(issues, scope, title, message, target = null) {
  issues.push({ scope, title, message, target });
}

function addIssueIf(condition, issues, scope, title, message, target = null) {
  if (!condition) return;
  addIssue(issues, scope, title, message, target);
}

function reportBlankField(issues, scope, title, value, fallback, target) {
  addIssueIf(isBlankOrPlaceholder(value), issues, scope, title, fallback, target);
}

function reportLengthField(issues, scope, title, value, fallback, target, limit) {
  addIssueIf(isTooLong(value, limit), issues, scope, title, fallback, target);
}

function checkPossibleUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (raw === "http:" || raw === "https:" || raw === "http://" || raw === "https://") {
    return "Ссылка выглядит незаконченной.";
  }

  if (/\s/.test(raw)) {
    return "В ссылке есть пробелы.";
  }

  if (raw.startsWith("data:")) {
    return /^data:image\/[a-z0-9.+-]+;base64,/i.test(raw) ? null : "Data URL выглядит подозрительно.";
  }

  if (/^(https?:)?\/\//i.test(raw)) {
    try {
      const url = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
      return ["http:", "https:"].includes(url.protocol) ? null : "Неподдерживаемый протокол ссылки.";
    } catch {
      return "Ссылка не похожа на валидный URL.";
    }
  }

  if (/^(assets\/|\.\/|\.\.\/|\/)/.test(raw)) return null;
  if (/^[\w./-]+\.(png|jpg|jpeg|webp|gif|svg|avif)$/i.test(raw)) return null;
  return "Ссылка не похожа на URL или путь к файлу.";
}

function registerEntityId(registry, namespace, scopeLabel, id, target) {
  const key = String(id || "").trim();
  if (!key) return;

  const registryKey = `${namespace}:${key}`;
  if (!registry.has(registryKey)) registry.set(registryKey, []);
  registry.get(registryKey).push({
    scopeLabel,
    idLabel: key,
    target,
  });
}

// Duplicate ids are reported by logical namespace, not globally, so archive
// items and heroes can each own an "id" without colliding across subsystems.
function reportDuplicateIds(issues, registry) {
  registry.forEach((entries) => {
    if (entries.length < 2) return;
    const [first] = entries;

    addIssue(
      issues,
      "ID",
      "Дубликат id",
      `Идентификатор "${first.idLabel}" повторяется в ${entries.length} местах внутри ${first.scopeLabel}. Лучше сделать его уникальным.`,
      first.target,
    );
  });
}

function reportImageUrlIssues(issues, scope, ownerTitle, imageUrl, target) {
  const linkProblem = checkPossibleUrl(imageUrl);
  if (linkProblem) {
    addIssue(issues, scope, "Подозрительная ссылка на изображение", `${ownerTitle}: ${linkProblem}`, target);
  }

  if (String(imageUrl || "").startsWith("data:") && String(imageUrl).length > DATA_URL_WARN_LENGTH) {
    addIssue(
      issues,
      scope,
      "Слишком тяжёлый data URL",
      `${ownerTitle}: это изображение лучше вынести в assets, чтобы сайт не пух.`,
      target,
    );
  }
}

function auditMapMarker(issues, registry, marker) {
  const target = { type: "marker", id: marker.id };
  registerEntityId(registry, "marker", "карты", marker.id, target);

  reportBlankField(issues, "Карта", "Метка без нормального названия", marker.title, marker.title || marker.id, target);
  reportBlankField(issues, "Карта", "У метки нет описания", marker.description, marker.title || marker.id, target);
  reportLengthField(issues, "Карта", "Слишком длинный заголовок", marker.title, marker.title, target, TITLE_LIMIT);
  addIssueIf(Boolean(marker.imageText && !marker.imageUrl), issues, "Карта", "Есть подпись, но нет картинки", marker.title || marker.id, target);

  const facts = Array.isArray(marker.facts) ? marker.facts : [];
  addIssueIf(
    facts.length < 3 || facts.some(isBlankOrPlaceholder),
    issues,
    "Карта",
    "У метки не заполнены факты",
    marker.title || marker.id,
    target,
  );

  reportImageUrlIssues(issues, "Карта", marker.title || marker.id, marker.imageUrl, target);
  reportLengthField(
    issues,
    "Карта",
    "Слишком длинная подпись изображения",
    marker.imageText,
    marker.title || marker.id,
    target,
    IMAGE_LABEL_LIMIT,
  );
}

function auditActiveMarker(issues, registry, marker) {
  const target = { type: "activeMarker", id: marker.id };
  registerEntityId(registry, "activeMarker", "Active Map", marker.id, target);

  reportBlankField(issues, "Active Map", "Событие без названия", marker.title, marker.title || marker.id, target);
  reportBlankField(issues, "Active Map", "У активного события нет описания", marker.description, marker.title || marker.id, target);
  reportLengthField(issues, "Active Map", "Слишком длинный заголовок", marker.title, marker.title, target, TITLE_LIMIT);
  reportImageUrlIssues(issues, "Active Map", marker.title || marker.id, marker.imageUrl, target);
}

function auditTimelineEvent(issues, registry, event) {
  const target = { type: "timeline", id: event.id };
  registerEntityId(registry, "timelineEvent", "Timeline", event.id, target);

  reportBlankField(issues, "Timeline", "Событие без названия", event.title, event.year || event.id, target);
  reportBlankField(issues, "Timeline", "Событие без описания", event.description, event.title || event.id, target);
  reportLengthField(issues, "Timeline", "Слишком длинный заголовок", event.title, event.title, target, TITLE_LIMIT);
  addIssueIf(
    Boolean(event.sidebarShortcut && isTooLong(event.sidebarShortcutLabel, LABEL_LIMIT)),
    issues,
    "Timeline",
    "Слишком длинная подпись боковой кнопки",
    event.title || event.id,
    target,
  );
}

function auditArchiveGroup(issues, registry, group) {
  const target = { type: "archiveGroup", id: group.id };
  registerEntityId(registry, "archiveGroup", "глав архива", group.id, target);

  reportBlankField(issues, "Archive", "Глава архива без названия", group.title, group.id, target);
  reportLengthField(issues, "Archive", "Слишком длинный заголовок главы", group.title, group.title, target, TITLE_LIMIT);
}

function auditArchiveItem(issues, registry, group, item) {
  const target = { type: "archiveItem", id: item.id, groupId: group.id };
  registerEntityId(
    registry,
    `archiveItem:${group.id}`,
    `карточек архива в главе "${group.title || group.id}"`,
    item.id,
    target,
  );

  reportBlankField(issues, "Archive", "Карточка без названия", item.title, group.title || group.id, target);
  reportBlankField(issues, "Archive", "Карточка без короткого описания", item.description, item.title || item.id, target);
  reportBlankField(issues, "Archive", "Карточка без полного описания", item.fullDescription, item.title || item.id, target);
  addIssueIf(!String(item.imageUrl || "").trim(), issues, "Archive", "У карточки нет превью-изображения", item.title || item.id, target);
  addIssueIf(
    Boolean(isFactionArchiveGroup(group) && !getArchiveItemSymbolUrl(item)),
    issues,
    "Archive",
    "У фракции нет символа или герба",
    item.title || item.id,
    target,
  );
  reportLengthField(issues, "Archive", "Слишком длинный заголовок карточки", item.title, item.title, target, TITLE_LIMIT);
  addIssueIf(
    isTooLong(item.imageLabel, IMAGE_LABEL_LIMIT) || isTooLong(item.expandedImageLabel, IMAGE_LABEL_LIMIT),
    issues,
    "Archive",
    "Слишком длинная подпись изображения",
    item.title || item.id,
    target,
  );
  reportImageUrlIssues(issues, "Archive", item.title || item.id, item.imageUrl, target);
  reportImageUrlIssues(issues, "Archive", item.title || item.id, item.expandedImageUrl, target);
}

function auditHeroGroup(issues, registry, group) {
  const target = { type: "heroGroup", id: group.id };
  registerEntityId(registry, "heroGroup", "групп героев", group.id, target);

  reportBlankField(issues, "Hall", "Группа героев без названия", group.title, group.id, target);
  reportBlankField(issues, "Hall", "У группы нет подзаголовка", group.subtitle, group.title || group.id, target);
  reportLengthField(issues, "Hall", "Слишком длинный заголовок группы", group.title, group.title, target, TITLE_LIMIT);
}

function auditHeroItem(issues, registry, group, hero) {
  const target = { type: "heroItem", id: hero.id, groupId: group.id };
  registerEntityId(
    registry,
    `heroItem:${group.id}`,
    `героев в группе "${group.title || group.id}"`,
    hero.id,
    target,
  );

  reportBlankField(issues, "Hall", "Герой без имени", hero.title, group.title || group.id, target);
  reportBlankField(issues, "Hall", "У героя не заполнена роль", hero.role, hero.title || hero.id, target);
  reportBlankField(issues, "Hall", "У героя нет короткого описания", hero.description, hero.title || hero.id, target);
  reportBlankField(issues, "Hall", "У героя нет полного описания", hero.fullDescription, hero.title || hero.id, target);
  addIssueIf(!String(hero.imageUrl || "").trim(), issues, "Hall", "У героя нет портрета", hero.title || hero.id, target);
  reportLengthField(issues, "Hall", "Слишком длинный заголовок героя", hero.title, hero.title, target, TITLE_LIMIT);
  reportLengthField(issues, "Hall", "Слишком длинная подпись портрета", hero.imageLabel, hero.title || hero.id, target, IMAGE_LABEL_LIMIT);
  reportImageUrlIssues(issues, "Hall", hero.title || hero.id, hero.imageUrl, target);
}

function auditActiveMapMeta(issues, registry, state) {
  const baseMarkerIds = new Set(
    state.markersData
      .map((marker) => String(marker?.id || "").trim())
      .filter(Boolean),
  );

  (state.activeMapData?.pinnedMarkerIds || []).forEach((markerId) => {
    if (baseMarkerIds.has(String(markerId || "").trim())) return;
    addIssue(
      issues,
      "Active Map",
      "Закреплена несуществующая базовая метка",
      `Pinned marker id "${markerId}" не найден в основной карте.`,
    );
  });

  (state.activeMapData?.routes || []).forEach((route) => {
    registerEntityId(registry, "activeRoute", "маршрутов Active Map", route?.id, null);

    if (!Array.isArray(route?.points) || route.points.length < 2) {
      addIssue(
        issues,
        "Active Map",
        "Маршрут недорисован",
        route?.title || route?.id || "У маршрута меньше двух точек.",
      );
      return;
    }

    const hasInvalidPoint = route.points.some((point) => {
      const x = Number(point?.x);
      const y = Number(point?.y);
      return !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100;
    });

    addIssueIf(
      hasInvalidPoint,
      issues,
      "Active Map",
      "Маршрут выходит за пределы карты",
      route?.title || route?.id || "У маршрута есть точки вне диапазона 0-100%.",
    );
  });
}

function collectIssues(state) {
  // Aggregate every subsystem into one report so creators can do a last-pass
  // content audit before sharing the project.
  const issues = [];
  const idsRegistry = new Map();

  state.markersData.forEach((marker) => auditMapMarker(issues, idsRegistry, marker));
  (state.activeMapData?.markers || []).forEach((marker) => auditActiveMarker(issues, idsRegistry, marker));
  state.eventsData.forEach((event) => auditTimelineEvent(issues, idsRegistry, event));

  state.archiveData.forEach((group) => {
    auditArchiveGroup(issues, idsRegistry, group);
    (group.items || []).forEach((item) => auditArchiveItem(issues, idsRegistry, group, item));
  });

  state.heroesData.forEach((group) => {
    auditHeroGroup(issues, idsRegistry, group);
    (group.items || []).forEach((hero) => auditHeroItem(issues, idsRegistry, group, hero));
  });

  auditActiveMapMeta(issues, idsRegistry, state);
  reportDuplicateIds(issues, idsRegistry);
  return issues;
}

function renderIssuesList(els, issues, onNavigate, close) {
  els.dataQualityList.innerHTML = "";

  if (!issues.length) {
    const ok = document.createElement("div");
    ok.className = "data-quality-ok";
    ok.textContent = "Красота. Можно спокойно показывать игрокам.";
    els.dataQualityList.appendChild(ok);
    return;
  }

  issues.forEach((issue) => {
    const button = document.createElement("button");
    button.className = "data-quality-item";
    button.type = "button";

    const scope = document.createElement("span");
    scope.textContent = issue.scope;

    const title = document.createElement("strong");
    title.textContent = issue.title;

    const message = document.createElement("em");
    message.textContent = issue.message;

    button.append(scope, title, message);
    button.addEventListener("click", () => {
      close();
      if (issue.target) onNavigate(issue.target);
    });
    els.dataQualityList.appendChild(button);
  });
}

export function createDataQualityController(options) {
  const {
    els,
    state,
    onNavigate,
  } = options;

  function close() {
    els.dataQualityPanel.hidden = true;
  }

  function open() {
    const issues = collectIssues(state);
    els.dataQualityPanel.hidden = false;
    els.dataQualitySummary.textContent = issues.length
      ? `Нашёл ${issues.length} мест, которые стоит проверить перед публикацией или показом игрокам.`
      : "Выглядит чисто: явных заглушек, дублей и тяжёлых ссылок не найдено.";

    renderIssuesList(els, issues, onNavigate, close);
  }

  function setup() {
    els.dataQualityCloseButton.addEventListener("click", close);
    els.dataQualityPanel.addEventListener("click", (event) => {
      if (event.target === els.dataQualityPanel) close();
    });
  }

  return {
    close,
    open,
    setup,
  };
}
