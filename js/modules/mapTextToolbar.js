import { MAP_TEXT_FONTS } from "./uiConfig.js";

export function createMapTextToolbarController(options) {
  const {
    els,
    state,
    getCallbacks,
  } = options;

  const callbacks = () => getCallbacks?.() || {};

  // The text toolbar is a floating inspector for the currently selected region
  // label, plus a shared place for draw-brush controls.
  function open(label, rect) {
    if (!state.editMode || !label) return;
    ensureFontOptions();

    els.mapTextFontSelect.value = label.fontFamily || "Cinzel";
    els.mapTextSizeInput.value = String(label.fontSize || 36);
    els.mapTextColorInput.value = label.color || "#dbeafe";
    els.mapTextRotateInput.value = String(label.rotation || 0);
    els.mapTextXInput.value = String(label.x ?? 50);
    els.mapTextYInput.value = String(label.y ?? 50);
    els.mapTextBoldButton.classList.toggle("active", Boolean(label.bold));
    els.mapTextItalicButton.classList.toggle("active", Boolean(label.italic));

    els.mapTextToolbar.hidden = false;
    placeToolbar(rect);
  }

  function close() {
    els.mapTextToolbar.hidden = true;
  }

  function setup() {
    // Style changes are forwarded immediately so labels update live while the
    // editor tweaks font, color, rotation, or position.
    els.mapTextFontSelect.addEventListener("change", () => {
      callbacks().onTextStyleChange?.({ fontFamily: els.mapTextFontSelect.value });
    });
    els.mapTextSizeInput.addEventListener("input", () => {
      callbacks().onTextStyleChange?.({ fontSize: Number(els.mapTextSizeInput.value) || 36 });
    });
    els.mapTextColorInput.addEventListener("input", () => {
      callbacks().onTextStyleChange?.({ color: els.mapTextColorInput.value });
    });
    els.mapTextRotateInput.addEventListener("input", () => {
      callbacks().onTextStyleChange?.({ rotation: Number(els.mapTextRotateInput.value) || 0 });
    });
    els.mapTextXInput.addEventListener("input", () => {
      callbacks().onTextStyleChange?.({ x: Number(els.mapTextXInput.value) || 0 });
    });
    els.mapTextYInput.addEventListener("input", () => {
      callbacks().onTextStyleChange?.({ y: Number(els.mapTextYInput.value) || 0 });
    });
    els.mapTextBoldButton.addEventListener("click", () => {
      const next = !els.mapTextBoldButton.classList.contains("active");
      els.mapTextBoldButton.classList.toggle("active", next);
      callbacks().onTextStyleChange?.({ bold: next });
    });
    els.mapTextItalicButton.addEventListener("click", () => {
      const next = !els.mapTextItalicButton.classList.contains("active");
      els.mapTextItalicButton.classList.toggle("active", next);
      callbacks().onTextStyleChange?.({ italic: next });
    });

    els.drawBrushColorSelect.addEventListener("change", () => {
      callbacks().onBrushChange?.({ color: els.drawBrushColorSelect.value });
    });
    els.drawBrushSizeInput.addEventListener("input", () => {
      callbacks().onBrushChange?.({ size: Number(els.drawBrushSizeInput.value) || 2 });
    });

    document.addEventListener("click", (event) => {
      if (els.mapTextToolbar.hidden) return;
      if (els.mapTextToolbar.contains(event.target)) return;
      if (event.target.closest(".region-label")) return;
      close();
    });
  }

  function ensureFontOptions() {
    if (els.mapTextFontSelect.options.length > 0) return;
    MAP_TEXT_FONTS.forEach((fontName) => {
      const option = document.createElement("option");
      option.value = fontName;
      option.textContent = fontName;
      option.style.fontFamily = fontName;
      els.mapTextFontSelect.appendChild(option);
    });
  }

  // Keep the toolbar close to the edited label, but still clamped inside the
  // viewport so it never renders half off-screen.
  function placeToolbar(rect) {
    const fallbackTop = 180;
    const fallbackLeft = 120;
    const margin = 24;
    const desiredTop = (rect?.top || fallbackTop) - 68;
    const desiredLeft = rect?.left || fallbackLeft;
    const toolbarWidth = els.mapTextToolbar.offsetWidth || 340;
    const toolbarHeight = els.mapTextToolbar.offsetHeight || 44;
    const maxTop = Math.max(margin, window.innerHeight - toolbarHeight - margin);
    const maxLeft = Math.max(margin, window.innerWidth - toolbarWidth - margin);

    els.mapTextToolbar.style.top = `${Math.min(maxTop, Math.max(margin, desiredTop))}px`;
    els.mapTextToolbar.style.left = `${Math.min(maxLeft, Math.max(margin, desiredLeft))}px`;
  }

  return { open, close, setup };
}
