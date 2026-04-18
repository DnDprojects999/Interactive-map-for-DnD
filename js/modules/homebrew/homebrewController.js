import {
  getLanguages,
  getLocalizedText,
  getUserFacingLanguages,
  setLocalizedValue,
} from "../localization.js";
import {
  createHomebrewArticleTemplate,
  createHomebrewCategoryTemplate,
} from "../entityTemplates.js";
import { getUiText } from "../uiLocale.js";

const HOME_BREW_TYPES = ["change", "new", "rule"];

// Homebrew keeps a very small controlled vocabulary for article type so the
// UI, filters, and localization keys always stay in sync.
function normalizeHomebrewType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return HOME_BREW_TYPES.includes(normalized) ? normalized : "change";
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function stopEvent(event) {
  event.preventDefault();
  event.stopPropagation();
}

function parseDelimitedRow(value) {
  return String(value || "")
    .split("|")
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

export function createHomebrewController(options) {
  const {
    els,
    state,
    generateEntityId,
    getChangeRecorder,
    openMapMode,
    onLanguageChange,
  } = options;

  const getRecorder = () => getChangeRecorder?.() || { upsert: () => {}, remove: () => {} };

  // Editors can see every configured language. Players only see the languages
  // explicitly marked as user-facing in world settings.
  function getAvailableLanguages() {
    const languages = state.editMode ? getLanguages(state.worldData) : getUserFacingLanguages(state.worldData);
    return languages.length ? languages : getLanguages(state.worldData);
  }

  function getTypeLabel(type) {
    return getUiText(state, `homebrew_type_${normalizeHomebrewType(type)}`);
  }

  function getLocalizedCategoryTitle(category) {
    return getLocalizedText(category, "title", state, getUiText(state, "homebrew_all_categories"));
  }

  function getLocalizedArticleText(article, field, fallback = "") {
    return getLocalizedText(article, field, state, fallback);
  }

  function getSortedCategories() {
    return [...(state.homebrewCategoriesData || [])].sort((a, b) => {
      const orderDiff = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
      if (orderDiff !== 0) return orderDiff;
      return getLocalizedCategoryTitle(a).localeCompare(getLocalizedCategoryTitle(b), state.currentLanguage);
    });
  }

  function getSortedArticles() {
    return [...(state.homebrewArticlesData || [])].sort((a, b) => {
      const orderDiff = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
      if (orderDiff !== 0) return orderDiff;
      return getLocalizedArticleText(a, "title", "").localeCompare(
        getLocalizedArticleText(b, "title", ""),
        state.currentLanguage,
      );
    });
  }

  function getVisibleArticles() {
    // Filtering is layered in a predictable order: type, category, then search.
    // That makes the section behave more like a library than a raw text dump.
    const type = normalizeHomebrewType(state.currentHomebrewType);
    const activeCategoryId = String(state.currentHomebrewCategoryId || "all");
    const query = String(state.homebrewSearchQuery || "").trim().toLowerCase();

    return getSortedArticles().filter((article) => {
      if (normalizeHomebrewType(article.type) !== type) return false;
      if (activeCategoryId !== "all" && !Array.isArray(article.categoryIds)) return false;
      if (activeCategoryId !== "all" && !article.categoryIds.includes(activeCategoryId)) return false;
      if (!query) return true;

      const haystacks = [
        getLocalizedArticleText(article, "title", ""),
        getLocalizedArticleText(article, "summary", ""),
        getLocalizedArticleText(article, "content", ""),
      ].map((entry) => String(entry || "").toLowerCase());

      return haystacks.some((entry) => entry.includes(query));
    });
  }

  function persistCategory(category) {
    getRecorder().upsert("homebrewCategory", category.id, category);
  }

  function persistArticle(article) {
    getRecorder().upsert("homebrewArticle", article.id, article);
  }

  function isArticleEditing(articleId) {
    return Boolean(state.editMode && state.currentHomebrewEditingArticleId === articleId);
  }

  function isCategoryEditing(categoryId) {
    return Boolean(state.editMode && state.currentHomebrewEditingCategoryId === categoryId);
  }

  function isCategoryPickerOpen(articleId) {
    return Boolean(state.editMode && state.currentHomebrewCategoryPickerArticleId === articleId);
  }

  function toggleLanguagePopover(forceState) {
    const nextState = typeof forceState === "boolean"
      ? forceState
      : Boolean(els.homebrewLanguagePopover.hidden);
    els.homebrewLanguagePopover.hidden = !nextState;
    els.homebrewLanguageButton.setAttribute("aria-expanded", nextState ? "true" : "false");
  }

  function renderLanguageOptions() {
    els.homebrewLanguageOptions.innerHTML = "";

    getAvailableLanguages().forEach((language) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "homebrew-language-option";
      button.textContent = `${language.label} ${String(language.code || "").toUpperCase()}`;
      button.classList.toggle("active", language.code === state.currentLanguage);
      button.addEventListener("click", () => {
        state.currentLanguage = language.code;
        toggleLanguagePopover(false);
        onLanguageChange?.(language.code);
      });
      els.homebrewLanguageOptions.appendChild(button);
    });
  }

  function createCategory() {
    if (!state.editMode) return;

    const category = {
      ...createHomebrewCategoryTemplate(state.homebrewCategoriesData.length),
      id: generateEntityId("homebrew-category"),
    };
    state.homebrewCategoriesData.push(category);
    state.currentHomebrewCategoryId = category.id;
    state.currentHomebrewEditingCategoryId = category.id;
    persistCategory(category);
    render();
  }

  // Category editing is inline on purpose: it matches the "chip" UI and avoids
  // small prompt windows for labels the editor often tweaks repeatedly.
  function editCategory(categoryId) {
    if (!state.editMode) return;
    state.currentHomebrewEditingCategoryId = categoryId;
    render();
  }

  function updateCategoryTitle(category, value) {
    const fallbackTitle = getUiText(state, "prompt_homebrew_category_title");
    setLocalizedValue(category, "title", String(value || "").trim() || fallbackTitle, state);
    persistCategory(category);
  }

  function closeCategoryEditor() {
    state.currentHomebrewEditingCategoryId = null;
    render();
  }

  function toggleArticleCategoryPicker(articleId) {
    state.currentHomebrewCategoryPickerArticleId = state.currentHomebrewCategoryPickerArticleId === articleId
      ? null
      : articleId;
    render();
  }

  function deleteCategory(categoryId) {
    if (!state.editMode) return;
    const category = (state.homebrewCategoriesData || []).find((entry) => entry.id === categoryId);
    if (!category) return;

    const label = getLocalizedCategoryTitle(category);
    if (!window.confirm(getUiText(state, "confirm_homebrew_delete_category", { label }))) return;

    state.homebrewCategoriesData = (state.homebrewCategoriesData || []).filter((entry) => entry.id !== categoryId);
    getRecorder().remove("homebrewCategory", categoryId);

    (state.homebrewArticlesData || []).forEach((article) => {
      if (!Array.isArray(article.categoryIds) || !article.categoryIds.includes(categoryId)) return;
      article.categoryIds = article.categoryIds.filter((entry) => entry !== categoryId);
      persistArticle(article);
    });

    if (state.currentHomebrewCategoryId === categoryId) {
      state.currentHomebrewCategoryId = "all";
    }
    if (state.currentHomebrewEditingCategoryId === categoryId) {
      state.currentHomebrewEditingCategoryId = null;
    }
    render();
  }

  function createArticle() {
    if (!state.editMode) return;

    const article = {
      ...createHomebrewArticleTemplate(state.homebrewArticlesData.length, state.currentHomebrewType),
      id: generateEntityId("homebrew-article"),
      type: normalizeHomebrewType(state.currentHomebrewType),
      categoryIds: state.currentHomebrewCategoryId !== "all" ? [state.currentHomebrewCategoryId] : [],
    };

    state.homebrewArticlesData.push(article);
    state.currentHomebrewType = article.type;
    state.currentHomebrewArticleId = article.id;
    state.currentHomebrewEditingArticleId = article.id;
    persistArticle(article);
    render();
  }

  // Article editing happens inside the same card the player reads. This keeps
  // long-form homebrew closer to archive/timeline editing and avoids modal fatigue.
  function openArticleEditor(articleId) {
    if (!state.editMode) return;
    state.currentHomebrewArticleId = articleId;
    state.currentHomebrewEditingArticleId = articleId;
    render();
  }

  function closeArticleEditor() {
    state.currentHomebrewEditingArticleId = null;
    render();
  }

  function deleteArticle(articleId) {
    if (!state.editMode) return;
    const article = (state.homebrewArticlesData || []).find((entry) => entry.id === articleId);
    if (!article) return;

    const label = getLocalizedArticleText(article, "title", "Article");
    if (!window.confirm(getUiText(state, "confirm_homebrew_delete_article", { label }))) return;

    state.homebrewArticlesData = (state.homebrewArticlesData || []).filter((entry) => entry.id !== articleId);
    getRecorder().remove("homebrewArticle", articleId);
    if (state.currentHomebrewArticleId === articleId) state.currentHomebrewArticleId = null;
    if (state.currentHomebrewEditingArticleId === articleId) state.currentHomebrewEditingArticleId = null;
    render();
  }

  function updateArticleLocalizedField(article, field, value) {
    setLocalizedValue(article, field, String(value || ""), state);
    persistArticle(article);
  }

  function appendArticleContentSnippet(article, snippet) {
    const currentValue = getLocalizedArticleText(article, "content", "");
    const nextValue = currentValue.trim()
      ? `${currentValue.replace(/\s*$/, "")}\n\n${snippet}`
      : snippet;
    updateArticleLocalizedField(article, "content", nextValue);
    render();
  }

  function updateArticleSource(article, value) {
    article.sourceUrl = String(value || "");
    persistArticle(article);
  }

  function updateArticleType(article, nextType) {
    article.type = normalizeHomebrewType(nextType);
    state.currentHomebrewType = article.type;
    persistArticle(article);
    render();
  }

  // Articles can belong to multiple categories. This allows one piece of
  // content to surface in several filtered views without duplicating the text.
  function toggleArticleCategory(article, categoryId) {
    const currentIds = Array.isArray(article.categoryIds) ? article.categoryIds : [];
    article.categoryIds = currentIds.includes(categoryId)
      ? currentIds.filter((entry) => entry !== categoryId)
      : [...currentIds, categoryId];
    persistArticle(article);
    render();
  }

  function parseArticleBlocks(article) {
    // The article body supports a tiny markup dialect for richer layouts while
    // still staying plain-text friendly in changes.json.
    const rawContent = getLocalizedArticleText(article, "content", "");
    const source = String(rawContent || "");
    const blockPattern = /:::(section|table)\s*(.*?)\n([\s\S]*?)\n:::/g;
    const blocks = [];
    let lastIndex = 0;

    const pushTextBlocks = (text) => {
      const normalized = String(text || "").trim();
      if (!normalized) return;
      normalized
        .split(/\n{2,}/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .forEach((entry) => {
          blocks.push({ type: "text", body: entry });
        });
    };

    let match;
    while ((match = blockPattern.exec(source))) {
      pushTextBlocks(source.slice(lastIndex, match.index));
      const [, type, rawTitle, rawBody] = match;
      const body = String(rawBody || "").trim();
      if (type === "section") {
        blocks.push({
          type: "section",
          title: String(rawTitle || "").trim() || getUiText(state, "homebrew_section_fallback_title"),
          body,
        });
      } else if (type === "table") {
        const rows = body
          .split(/\r?\n/)
          .map((entry) => parseDelimitedRow(entry))
          .filter((entry) => entry.length);
        const [columns, ...tableRows] = rows;
        blocks.push({
          type: "table",
          title: String(rawTitle || "").trim() || getUiText(state, "homebrew_table_fallback_title"),
          columns: columns || [],
          rows: tableRows,
        });
      }
      lastIndex = blockPattern.lastIndex;
    }
    pushTextBlocks(source.slice(lastIndex));
    return blocks;
  }

  function buildCategoryMeta(article) {
    const categories = (article.categoryIds || [])
      .map((categoryId) => (state.homebrewCategoriesData || []).find((entry) => entry.id === categoryId))
      .filter(Boolean)
      .map((category) => getLocalizedCategoryTitle(category));
    return categories.join(" · ");
  }

  // Editor fields are assembled programmatically so the same card can switch
  // between read mode and edit mode without replacing the whole component type.
  function appendEditorField(body, labelText, control) {
    const field = document.createElement("label");
    field.className = "homebrew-editor-field";

    const label = document.createElement("span");
    label.className = "homebrew-editor-label";
    label.textContent = labelText;
    field.appendChild(label);

    field.appendChild(control);
    body.appendChild(field);
  }

  function renderArticleEditor(article, body) {
    // The editor is intentionally "live": every input writes directly into the
    // current article so the card always mirrors the saved local state.
    const typeSelect = document.createElement("select");
    typeSelect.className = "homebrew-editor-select";
    HOME_BREW_TYPES.forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = getTypeLabel(type);
      option.selected = normalizeHomebrewType(article.type) === type;
      typeSelect.appendChild(option);
    });
    typeSelect.addEventListener("change", (event) => {
      updateArticleType(article, event.target.value);
    });
    appendEditorField(body, getUiText(state, "homebrew_field_type"), typeSelect);

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "homebrew-editor-input";
    titleInput.value = getLocalizedArticleText(article, "title", "");
    titleInput.placeholder = getUiText(state, "homebrew_field_title");
    titleInput.addEventListener("input", (event) => {
      updateArticleLocalizedField(article, "title", event.target.value);
    });
    appendEditorField(body, getUiText(state, "homebrew_field_title"), titleInput);

    const summaryInput = document.createElement("textarea");
    summaryInput.className = "homebrew-editor-textarea homebrew-editor-textarea-summary";
    summaryInput.value = getLocalizedArticleText(article, "summary", "");
    summaryInput.placeholder = getUiText(state, "homebrew_field_summary");
    summaryInput.addEventListener("input", (event) => {
      updateArticleLocalizedField(article, "summary", event.target.value);
    });
    appendEditorField(body, getUiText(state, "homebrew_field_summary"), summaryInput);

    const contentInput = document.createElement("textarea");
    contentInput.className = "homebrew-editor-textarea homebrew-editor-textarea-content";
    contentInput.value = getLocalizedArticleText(article, "content", "");
    contentInput.placeholder = getUiText(state, "homebrew_field_content");
    contentInput.addEventListener("input", (event) => {
      updateArticleLocalizedField(article, "content", event.target.value);
    });
    appendEditorField(body, getUiText(state, "homebrew_field_content"), contentInput);

    const contentHelpers = document.createElement("div");
    contentHelpers.className = "homebrew-content-helper-actions";

    const addSectionButton = document.createElement("button");
    addSectionButton.type = "button";
    addSectionButton.className = "ghost-btn homebrew-action-btn";
    addSectionButton.textContent = getUiText(state, "homebrew_add_section");
    addSectionButton.addEventListener("click", () => {
      appendArticleContentSnippet(article, ":::section Новый раздел\nОпиши этот подраздел здесь.\n:::");
    });
    contentHelpers.appendChild(addSectionButton);

    const addTableButton = document.createElement("button");
    addTableButton.type = "button";
    addTableButton.className = "ghost-btn homebrew-action-btn";
    addTableButton.textContent = getUiText(state, "homebrew_add_table");
    addTableButton.addEventListener("click", () => {
      appendArticleContentSnippet(article, ":::table Новая таблица\nСтолбец 1 | Столбец 2 | Столбец 3\nЗначение | Значение | Значение\n:::");
    });
    contentHelpers.appendChild(addTableButton);

    body.appendChild(contentHelpers);

    const sourceInput = document.createElement("input");
    sourceInput.type = "url";
    sourceInput.className = "homebrew-editor-input";
    sourceInput.value = article.sourceUrl || "";
    sourceInput.placeholder = "https://";
    sourceInput.addEventListener("input", (event) => {
      updateArticleSource(article, event.target.value);
    });
    appendEditorField(body, getUiText(state, "homebrew_field_source"), sourceInput);

    const categoriesField = document.createElement("div");
    categoriesField.className = "homebrew-editor-field";

    const categoriesLabel = document.createElement("span");
    categoriesLabel.className = "homebrew-editor-label";
    categoriesLabel.textContent = getUiText(state, "homebrew_field_categories");
    categoriesField.appendChild(categoriesLabel);

    const selectedRow = document.createElement("div");
    selectedRow.className = "homebrew-editor-category-list homebrew-editor-category-list-selected";

    const selectedIds = Array.isArray(article.categoryIds) ? article.categoryIds : [];
    selectedIds
      .map((categoryId) => (state.homebrewCategoriesData || []).find((entry) => entry.id === categoryId))
      .filter(Boolean)
      .forEach((category) => {
        const chip = document.createElement("div");
        chip.className = "homebrew-chip-wrap";

        const chipLabel = document.createElement("button");
        chipLabel.type = "button";
        chipLabel.className = "homebrew-chip active";
        chipLabel.textContent = getLocalizedCategoryTitle(category);
        chipLabel.addEventListener("click", () => {
          toggleArticleCategory(article, category.id);
        });
        chip.appendChild(chipLabel);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "homebrew-chip-icon";
        removeButton.textContent = "×";
        removeButton.title = getUiText(state, "homebrew_remove_category_inline");
        removeButton.addEventListener("click", () => {
          toggleArticleCategory(article, category.id);
        });
        chip.appendChild(removeButton);
        selectedRow.appendChild(chip);
      });

    const addCategoryButton = document.createElement("button");
    addCategoryButton.type = "button";
    addCategoryButton.className = "homebrew-chip-icon";
    addCategoryButton.textContent = getUiText(state, "homebrew_add_category_inline");
    addCategoryButton.title = getUiText(state, "homebrew_add_category");
    addCategoryButton.addEventListener("click", () => {
      toggleArticleCategoryPicker(article.id);
    });
    selectedRow.appendChild(addCategoryButton);
    categoriesField.appendChild(selectedRow);

    if (isCategoryPickerOpen(article.id)) {
      const availableRow = document.createElement("div");
      availableRow.className = "homebrew-editor-category-list homebrew-editor-category-list-available";
      getSortedCategories()
        .filter((category) => !selectedIds.includes(category.id))
        .forEach((category) => {
          const categoryButton = document.createElement("button");
          categoryButton.type = "button";
          categoryButton.className = "homebrew-chip";
          categoryButton.textContent = getLocalizedCategoryTitle(category);
          categoryButton.addEventListener("click", () => {
            toggleArticleCategory(article, category.id);
          });
          availableRow.appendChild(categoryButton);
        });
      categoriesField.appendChild(availableRow);
    }
    body.appendChild(categoriesField);
  }

  function renderCategories() {
    els.homebrewCategories.innerHTML = "";

    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = "homebrew-chip";
    allButton.textContent = getUiText(state, "homebrew_all_categories");
    allButton.classList.toggle("active", String(state.currentHomebrewCategoryId || "all") === "all");
    allButton.addEventListener("click", () => {
      state.currentHomebrewCategoryId = "all";
      render();
    });
    els.homebrewCategories.appendChild(allButton);

    getSortedCategories().forEach((category) => {
      // Categories stay as chips even in edit mode so filtering and editing use
      // the same visual language instead of swapping to a separate panel.
      const chip = document.createElement("div");
      chip.className = "homebrew-chip-wrap";

      if (isCategoryEditing(category.id)) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "homebrew-chip-input";
        input.value = getLocalizedCategoryTitle(category);
        input.placeholder = getUiText(state, "prompt_homebrew_category_title");
        input.addEventListener("input", (event) => {
          updateCategoryTitle(category, event.target.value);
        });
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            stopEvent(event);
            closeCategoryEditor();
            return;
          }
          if (event.key === "Escape") {
            stopEvent(event);
            closeCategoryEditor();
          }
        });
        input.addEventListener("blur", () => {
          closeCategoryEditor();
        });
        chip.appendChild(input);

        requestAnimationFrame(() => {
          input.focus();
          input.select();
        });
      } else {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "homebrew-chip";
        button.textContent = getLocalizedCategoryTitle(category);
        button.classList.toggle("active", state.currentHomebrewCategoryId === category.id);
        button.addEventListener("click", () => {
          state.currentHomebrewCategoryId = category.id;
          render();
        });
        chip.appendChild(button);
      }

      if (state.editMode) {
        if (isCategoryEditing(category.id)) {
          const doneButton = document.createElement("button");
          doneButton.type = "button";
          doneButton.className = "homebrew-chip-icon";
          doneButton.textContent = "OK";
          doneButton.title = getUiText(state, "homebrew_edit_done");
          doneButton.addEventListener("mousedown", (event) => {
            stopEvent(event);
            closeCategoryEditor();
          });
          chip.appendChild(doneButton);
        } else {
          const editButton = document.createElement("button");
          editButton.type = "button";
          editButton.className = "homebrew-chip-icon";
          editButton.textContent = "E";
          editButton.title = getUiText(state, "homebrew_edit");
          editButton.addEventListener("click", (event) => {
            stopEvent(event);
            editCategory(category.id);
          });
          chip.appendChild(editButton);
        }

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "homebrew-chip-icon";
        deleteButton.textContent = "X";
        deleteButton.title = getUiText(state, "homebrew_delete");
        deleteButton.addEventListener("click", (event) => {
          stopEvent(event);
          deleteCategory(category.id);
        });
        chip.appendChild(deleteButton);
      }

      els.homebrewCategories.appendChild(chip);
    });
  }

  function renderArticles() {
    // Only one article is "expanded" at a time. That keeps the homebrew list
    // readable even when articles contain long text, tables, or sections.
    const visibleArticles = getVisibleArticles();
    if (!visibleArticles.some((entry) => entry.id === state.currentHomebrewArticleId)) {
      state.currentHomebrewArticleId = null;
    }
    if (!visibleArticles.some((entry) => entry.id === state.currentHomebrewEditingArticleId)) {
      state.currentHomebrewEditingArticleId = null;
    }

    els.homebrewArticles.innerHTML = "";

    if (!visibleArticles.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "homebrew-empty";

      const title = document.createElement("h2");
      title.textContent = getUiText(state, "homebrew_empty_title");
      emptyState.appendChild(title);

      const text = document.createElement("p");
      text.textContent = getUiText(state, "homebrew_empty_text");
      emptyState.appendChild(text);

      els.homebrewArticles.appendChild(emptyState);
      return;
    }

    visibleArticles.forEach((article) => {
      const expanded = article.id === state.currentHomebrewArticleId;
      const editing = isArticleEditing(article.id);

      const card = document.createElement("article");
      card.className = "homebrew-article-card";
      if (expanded) card.classList.add("expanded");

      const header = document.createElement(editing ? "div" : "button");
      header.className = "homebrew-article-header";
      if (!editing) {
        header.type = "button";
        header.addEventListener("click", () => {
          state.currentHomebrewArticleId = expanded ? null : article.id;
          render();
        });
      }

      const meta = document.createElement("div");
      meta.className = "homebrew-article-meta";
      meta.textContent = [getTypeLabel(article.type), buildCategoryMeta(article)].filter(Boolean).join(" · ");
      header.appendChild(meta);

      const title = document.createElement("h2");
      title.className = "homebrew-article-title";
      title.textContent = getLocalizedArticleText(article, "title", "Homebrew");
      header.appendChild(title);

      const summary = document.createElement("p");
      summary.className = "homebrew-article-summary";
      summary.textContent = getLocalizedArticleText(article, "summary", "");
      header.appendChild(summary);

      if (state.editMode) {
        const actions = document.createElement("div");
        actions.className = "homebrew-article-actions";

        const primaryButton = document.createElement("button");
        primaryButton.type = "button";
        primaryButton.className = "ghost-btn homebrew-action-btn";
        primaryButton.textContent = editing
          ? getUiText(state, "homebrew_edit_done")
          : getUiText(state, "homebrew_edit");
        primaryButton.addEventListener("click", (event) => {
          stopEvent(event);
          if (editing) {
            closeArticleEditor();
            return;
          }
          openArticleEditor(article.id);
        });
        actions.appendChild(primaryButton);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "ghost-btn homebrew-action-btn";
        deleteButton.textContent = getUiText(state, "homebrew_delete");
        deleteButton.addEventListener("click", (event) => {
          stopEvent(event);
          deleteArticle(article.id);
        });
        actions.appendChild(deleteButton);

        header.appendChild(actions);
      }

      card.appendChild(header);

      const body = document.createElement("div");
      body.className = "homebrew-article-body";
      if (!expanded) body.hidden = true;

      if (editing) {
        renderArticleEditor(article, body);
      } else {
        parseArticleBlocks(article).forEach((block) => {
          if (block.type === "text") {
            const content = document.createElement("div");
            content.className = "homebrew-article-content";
            content.textContent = block.body;
            body.appendChild(content);
            return;
          }

          if (block.type === "section") {
            const section = document.createElement("details");
            section.className = "homebrew-article-section";

            const summary = document.createElement("summary");
            summary.className = "homebrew-article-section-summary";
            summary.textContent = block.title;
            section.appendChild(summary);

            const sectionBody = document.createElement("div");
            sectionBody.className = "homebrew-article-section-body";
            sectionBody.textContent = block.body;
            section.appendChild(sectionBody);
            body.appendChild(section);
            return;
          }

          if (block.type === "table" && block.columns.length) {
            const tableWrap = document.createElement("details");
            tableWrap.className = "homebrew-article-table";

            const tableTitle = document.createElement("summary");
            tableTitle.className = "homebrew-article-table-title";
            tableTitle.textContent = block.title;
            tableWrap.appendChild(tableTitle);

            const tableInner = document.createElement("div");
            tableInner.className = "homebrew-article-table-body";

            const table = document.createElement("table");
            table.className = "homebrew-article-table-grid";

            const thead = document.createElement("thead");
            const headRow = document.createElement("tr");
            block.columns.forEach((column) => {
              const cell = document.createElement("th");
              cell.textContent = column;
              headRow.appendChild(cell);
            });
            thead.appendChild(headRow);
            table.appendChild(thead);

            const tbody = document.createElement("tbody");
            block.rows.forEach((row) => {
              const rowElement = document.createElement("tr");
              block.columns.forEach((_, index) => {
                const cell = document.createElement("td");
                cell.textContent = row[index] || "";
                rowElement.appendChild(cell);
              });
              tbody.appendChild(rowElement);
            });
            table.appendChild(tbody);
            tableInner.appendChild(table);
            tableWrap.appendChild(tableInner);
            body.appendChild(tableWrap);
          }
        });

        const normalizedUrl = normalizeUrl(article.sourceUrl);
        if (normalizedUrl) {
          const source = document.createElement("div");
          source.className = "homebrew-article-source";

          const sourceLabel = document.createElement("span");
          sourceLabel.className = "homebrew-article-source-label";
          sourceLabel.textContent = getUiText(state, "homebrew_source_label");
          source.appendChild(sourceLabel);

          const sourceLink = document.createElement("a");
          sourceLink.className = "homebrew-article-source-link";
          sourceLink.href = normalizedUrl;
          sourceLink.target = "_blank";
          sourceLink.rel = "noreferrer noopener";
          sourceLink.textContent = getUiText(state, "homebrew_source_open");
          source.appendChild(sourceLink);
          body.appendChild(source);
        }
      }

      card.appendChild(body);
      els.homebrewArticles.appendChild(card);
    });
  }

  function render() {
    toggleLanguagePopover(false);
    if (!state.editMode) {
      state.currentHomebrewEditingArticleId = null;
      state.currentHomebrewEditingCategoryId = null;
      state.currentHomebrewCategoryPickerArticleId = null;
    }

    if (els.homebrewSearchInput) {
      els.homebrewSearchInput.placeholder = getUiText(state, "homebrew_search_placeholder");
      if (els.homebrewSearchInput.value !== String(state.homebrewSearchQuery || "")) {
        els.homebrewSearchInput.value = String(state.homebrewSearchQuery || "");
      }
    }

    els.homebrewMapButton.textContent = getUiText(state, "mode_map");
    els.homebrewLanguageLabel.textContent = String(state.currentLanguage || "ru").toUpperCase();
    els.addHomebrewCategoryButton.textContent = getUiText(state, "homebrew_add_category");
    els.addHomebrewArticleButton.textContent = getUiText(state, "homebrew_add_article");
    els.homebrewEditorTools.hidden = !state.editMode;

    const typeButtons = els.homebrewTypeSwitch?.querySelectorAll("[data-homebrew-type]") || [];
    typeButtons.forEach((button) => {
      const type = normalizeHomebrewType(button.dataset.homebrewType);
      button.textContent = getTypeLabel(type);
      button.classList.toggle("active", type === normalizeHomebrewType(state.currentHomebrewType));
    });

    renderLanguageOptions();
    renderCategories();
    renderArticles();
  }

  function focusArticle(articleId) {
    const article = (state.homebrewArticlesData || []).find((entry) => entry.id === articleId);
    if (article) {
      state.currentHomebrewType = normalizeHomebrewType(article.type);
    }
    state.currentHomebrewArticleId = articleId;
    render();
    requestAnimationFrame(() => {
      els.homebrewArticles.querySelector(".homebrew-article-card.expanded")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function setup() {
    els.homebrewMapButton.addEventListener("click", () => openMapMode?.());
    els.homebrewLanguageButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleLanguagePopover();
    });
    els.homebrewSearchInput.addEventListener("input", (event) => {
      state.homebrewSearchQuery = String(event.target.value || "");
      render();
    });
    els.homebrewTypeSwitch.addEventListener("click", (event) => {
      const button = event.target.closest("[data-homebrew-type]");
      if (!button) return;
      state.currentHomebrewType = normalizeHomebrewType(button.dataset.homebrewType);
      state.currentHomebrewArticleId = null;
      state.currentHomebrewEditingArticleId = null;
      render();
    });
    els.addHomebrewCategoryButton.addEventListener("click", createCategory);
    els.addHomebrewArticleButton.addEventListener("click", createArticle);

    document.addEventListener("click", (event) => {
      if (
        els.homebrewLanguagePopover.hidden
        || els.homebrewLanguagePopover.contains(event.target)
        || els.homebrewLanguageButton.contains(event.target)
      ) {
        return;
      }
      toggleLanguagePopover(false);
    });
  }

  return {
    setup,
    render,
    focusArticle,
  };
}
