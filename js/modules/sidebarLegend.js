function getButtonLegendLabel(button) {
  return (
    button.dataset.label
    || button.title
    || button.getAttribute("aria-label")
    || button.textContent?.trim()
    || "Кнопка"
  ).trim();
}

function getButtonLegendBadge(button) {
  return (button.dataset.badge || button.textContent || "?").trim().slice(0, 16) || "?";
}

function getButtonLegendColor(button) {
  return button.dataset.color || "";
}

// The legend mirrors whatever buttons are currently rendered in the left
// sidebar, so it derives its content from button metadata instead of owning a
// separate source of truth.
function createLegendItem(button, options = {}) {
  const {
    editMode = false,
    editLabel = "Редактировать",
    onEditGroup = null,
  } = options;
  const item = document.createElement("button");
  item.className = "sidebar-legend-item";
  item.type = "button";

  const badge = document.createElement("span");
  badge.className = "sidebar-legend-badge";
  badge.textContent = getButtonLegendBadge(button);

  const color = getButtonLegendColor(button);
  if (color) badge.style.setProperty("--legend-badge-color", color);

  const textWrap = document.createElement("span");
  textWrap.className = "sidebar-legend-copy";

  const title = document.createElement("strong");
  title.textContent = getButtonLegendLabel(button);

  const hint = document.createElement("em");
  hint.textContent = button.classList.contains("active")
    ? "Сейчас включено"
    : "Кликни по соответствующей кнопке слева";

  textWrap.append(title, hint);
  item.append(badge, textWrap);

  const editableGroupId = String(button.dataset.groupId || "").trim();
  if (editMode && editableGroupId && typeof onEditGroup === "function") {
    const editButton = document.createElement("button");
    editButton.className = "sidebar-legend-item-edit";
    editButton.type = "button";
    editButton.textContent = editLabel;
    editButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onEditGroup(editableGroupId);
    });
    item.appendChild(editButton);
  }

  item.addEventListener("click", () => button.click());
  return item;
}

export function createSidebarLegendController(options) {
  const {
    els,
    state,
    getUiText = null,
    onEditGroup = null,
  } = options;
  let observer = null;

  // A MutationObserver keeps the legend synchronized with sidebar buttons even
  // when another module re-renders them completely.
  const resolveUiText = (key, fallback) => (typeof getUiText === "function" ? getUiText(key) : fallback);

  function close() {
    els.sidebarLegendPanel.hidden = true;
    els.sidebarLegendToggle.classList.remove("active");
    els.sidebarLegendToggle.textContent = "›";
  }

  function render() {
    els.sidebarLegendTitle.textContent = els.sidebarTitle.textContent?.trim() || resolveUiText("sidebar_layers", "Легенда");
    els.sidebarLegendList.innerHTML = "";
    if (els.sidebarLegendEditButton) {
      els.sidebarLegendEditButton.hidden = !state.editMode;
    }

    const buttons = [...els.toolButtonsContainer.querySelectorAll(".tool-btn")];
    if (!buttons.length) {
      const empty = document.createElement("div");
      empty.className = "sidebar-legend-empty";
      empty.textContent = "Здесь появятся расшифровки боковых кнопок, когда выбран режим с собственной панелью.";
      els.sidebarLegendList.appendChild(empty);
      return;
    }

    buttons.forEach((button) => {
      els.sidebarLegendList.appendChild(createLegendItem(button, {
        editMode: state.editMode,
        editLabel: resolveUiText("rename_world_button", "Редактировать"),
        onEditGroup,
      }));
    });
  }

  function open() {
    render();
    els.sidebarLegendPanel.hidden = false;
    els.sidebarLegendToggle.classList.add("active");
    els.sidebarLegendToggle.textContent = "‹";
  }

  function toggle(force) {
    const shouldOpen = typeof force === "boolean" ? force : els.sidebarLegendPanel.hidden;
    if (shouldOpen) open();
    else close();
  }

  function setup() {
    els.sidebarLegendToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      toggle();
    });

    els.sidebarLegendPanel.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    els.sidebarLegendEditButton?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const firstEditableButton = els.toolButtonsContainer.querySelector(".tool-btn[data-group-id]");
      const groupId = firstEditableButton?.dataset?.groupId;
      if (groupId && typeof onEditGroup === "function") onEditGroup(groupId);
    });

    observer = new MutationObserver(() => {
      if (!els.sidebarLegendPanel.hidden) render();
    });

    observer.observe(els.toolButtonsContainer, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["title", "class", "data-label", "data-color", "data-badge", "data-group-id"],
    });
  }

  return {
    close,
    open,
    render,
    setup,
    toggle,
  };
}
