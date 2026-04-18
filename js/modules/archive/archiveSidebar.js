import { getLocalizedText } from "../localization.js";

export function getArchiveShortLabel(groupName) {
  const cleaned = (groupName || "").replace(/\s+/g, "").trim();
  return cleaned.slice(0, 2) || "??";
}

export function createArchiveSidebarController(els, state, options = {}) {
  const { onSelectGroup = () => {} } = options;

  // Sidebar buttons are just a compact mirror of archive groups, so the
  // controller only worries about selection and scrolling, not archive content.
  function setActiveGroup(groupId, behavior = {}) {
    state.activeArchiveGroupId = groupId;
    if (behavior.trackCurrent !== false && groupId) {
      state.currentArchiveItemId = null;
      onSelectGroup({ type: "archiveGroup", id: groupId });
    }
    const buttons = els.toolButtonsContainer.querySelectorAll(".tool-btn");
    buttons.forEach((button) => button.classList.toggle("active", button.dataset.archiveGroup === groupId));
  }

  function renderButtons() {
    // Archive sidebar is rebuilt from scratch so labels stay in sync with
    // localization changes and inline editing.
    els.toolButtonsContainer.innerHTML = "";

    state.archiveData.forEach((group) => {
      const localizedTitle = getLocalizedText(group, "title", state, "Глава архива");
      const button = document.createElement("button");
      button.className = "tool-btn";
      button.dataset.archiveGroup = group.id;
      button.dataset.label = localizedTitle;
      button.textContent = getArchiveShortLabel(localizedTitle);
      button.title = localizedTitle;
      button.addEventListener("click", () => {
        const section = els.archiveGroupsContainer.querySelector(`[data-archive-group="${group.id}"]`);
        if (!section) return;
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveGroup(group.id, { trackCurrent: true });
      });
      els.toolButtonsContainer.appendChild(button);
    });

    if (state.archiveData[0]?.id) {
      setActiveGroup(state.archiveData[0].id, { trackCurrent: false });
    }
  }

  return {
    renderButtons,
    setActiveGroup,
  };
}
