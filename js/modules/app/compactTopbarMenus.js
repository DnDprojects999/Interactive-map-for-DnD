export function createCompactTopbarMenusController({ els, state }) {
  let mapConfigMenu;
  let mapConfigMenuButton;
  let mapConfigMenuPopover;
  let dataToolsMenu;
  let dataToolsMenuButton;
  let dataToolsMenuPopover;

  // These compact menus exist purely to stop edit-mode tools from stretching
  // the topbar height. They wrap existing buttons instead of inventing new ones.
  function setMenuOpen(menuName, isOpen) {
    const isMapMenu = menuName === "map";
    const button = isMapMenu ? mapConfigMenuButton : dataToolsMenuButton;
    const popover = isMapMenu ? mapConfigMenuPopover : dataToolsMenuPopover;
    if (!button || !popover) return;

    popover.hidden = !isOpen;
    button.setAttribute("aria-expanded", String(isOpen));
  }

  function close() {
    setMenuOpen("map", false);
    setMenuOpen("data", false);
  }

  function ensure() {
    // Menus are created lazily because most sessions never enter edit mode.
    if (mapConfigMenu && dataToolsMenu) return;

    mapConfigMenu = document.createElement("div");
    mapConfigMenu.className = "topbar-mini-menu";
    mapConfigMenu.id = "mapConfigMenu";
    mapConfigMenu.hidden = true;

    mapConfigMenuButton = document.createElement("button");
    mapConfigMenuButton.className = "topbar-mini-trigger";
    mapConfigMenuButton.id = "mapConfigMenuButton";
    mapConfigMenuButton.type = "button";
    mapConfigMenuButton.title = "Map tools";
    mapConfigMenuButton.textContent = "\u25eb";
    mapConfigMenuButton.setAttribute("aria-haspopup", "true");
    mapConfigMenuButton.setAttribute("aria-expanded", "false");

    mapConfigMenuPopover = document.createElement("div");
    mapConfigMenuPopover.className = "topbar-mini-popover";
    mapConfigMenuPopover.id = "mapConfigMenuPopover";
    mapConfigMenuPopover.hidden = true;

    mapConfigMenu.append(mapConfigMenuButton, mapConfigMenuPopover);
    els.topbar.querySelector(".topbar-right")?.insertBefore(mapConfigMenu, els.activeMapToggleButton);
    if (els.mapViewEditorTools) {
      mapConfigMenuPopover.appendChild(els.mapViewEditorTools);
    }

    dataToolsMenu = document.createElement("div");
    dataToolsMenu.className = "topbar-mini-menu";
    dataToolsMenu.id = "dataToolsMenu";
    dataToolsMenu.hidden = true;

    dataToolsMenuButton = document.createElement("button");
    dataToolsMenuButton.className = "topbar-mini-trigger";
    dataToolsMenuButton.id = "dataToolsMenuButton";
    dataToolsMenuButton.type = "button";
    dataToolsMenuButton.title = "Data tools";
    dataToolsMenuButton.textContent = "\u21c5";
    dataToolsMenuButton.setAttribute("aria-haspopup", "true");
    dataToolsMenuButton.setAttribute("aria-expanded", "false");

    dataToolsMenuPopover = document.createElement("div");
    dataToolsMenuPopover.className = "topbar-mini-popover";
    dataToolsMenuPopover.id = "dataToolsMenuPopover";
    dataToolsMenuPopover.hidden = true;

    dataToolsMenu.append(dataToolsMenuButton, dataToolsMenuPopover);
    els.topbar.querySelector(".topbar-right")?.appendChild(dataToolsMenu);
    [els.uploadMapTextureButton, els.exportDataButton, els.importDataButton, els.exportActiveMapButton]
      .filter(Boolean)
      .forEach((element) => {
        element.classList.add("topbar-menu-action");
        dataToolsMenuPopover.appendChild(element);
      });
  }

  function sync() {
    // Visibility depends on both edit mode and the currently active fullscreen
    // mode, because some tools make sense only on the base map.
    ensure();
    const showMapConfigMenu = Boolean(
      state.editMode && !state.timelineMode && !state.archiveMode && !state.homebrewMode && !state.heroesMode && !state.activeMapMode,
    );
    if (mapConfigMenu) mapConfigMenu.hidden = !showMapConfigMenu;

    const showDataToolsMenu = Boolean(
      state.editMode
      && (
        !els.uploadMapTextureButton.hidden
        || !els.exportDataButton.hidden
        || !els.importDataButton.hidden
        || !els.exportActiveMapButton.hidden
      ),
    );
    if (dataToolsMenu) dataToolsMenu.hidden = !showDataToolsMenu;

    if (!showMapConfigMenu) setMenuOpen("map", false);
    if (!showDataToolsMenu) setMenuOpen("data", false);
  }

  function setup() {
    ensure();

    mapConfigMenuButton?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextState = mapConfigMenuPopover?.hidden !== false;
      setMenuOpen("data", false);
      setMenuOpen("map", nextState);
    });

    dataToolsMenuButton?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextState = dataToolsMenuPopover?.hidden !== false;
      setMenuOpen("map", false);
      setMenuOpen("data", nextState);
    });

    mapConfigMenuPopover?.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    dataToolsMenuPopover?.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.addEventListener("click", (event) => {
      if (!mapConfigMenu?.contains(event.target) && !dataToolsMenu?.contains(event.target)) {
        close();
      }
    });
  }

  return {
    ensure,
    sync,
    close,
    setup,
  };
}
