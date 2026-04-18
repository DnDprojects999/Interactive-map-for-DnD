// The range slider is a secondary navigator for wide timelines. It mirrors
// scrollLeft and can preview the nearest timeline date under the thumb.
export function setupTimelineScrollControls(els) {
  let previewActive = false;
  let sliderDragging = false;

  const getMaxScrollLeft = () => Math.max(0, els.timelineContainer.scrollWidth - els.timelineContainer.clientWidth);

  function getNearestTimelineDate(scrollLeftValue) {
    const eventItems = Array.from(els.timelineContainer.querySelectorAll(".timeline-event-item"));
    if (eventItems.length === 0) return "";

    const viewportCenter = scrollLeftValue + (els.timelineContainer.clientWidth / 2);
    let nearestLabel = "";
    let nearestDistance = Number.POSITIVE_INFINITY;

    eventItems.forEach((item) => {
      const itemCenter = item.offsetLeft + (item.offsetWidth / 2);
      const distance = Math.abs(itemCenter - viewportCenter);
      if (distance >= nearestDistance) return;
      nearestDistance = distance;
      nearestLabel = item.querySelector(".event-timeline-date")?.textContent?.trim?.() || "";
    });

    return nearestLabel;
  }

  function updatePreview(scrollLeftValue) {
    if (!previewActive) return;

    const maxScrollLeft = getMaxScrollLeft();
    const ratio = maxScrollLeft > 0 ? scrollLeftValue / maxScrollLeft : 0;
    const rangeRect = els.timelineScrollRange.getBoundingClientRect();
    const stripRect = els.timelineScrollRange.parentElement.getBoundingClientRect();
    const thumbSize = 22;
    const usableTrackWidth = Math.max(0, rangeRect.width - thumbSize);
    const labelLeft = (rangeRect.left - stripRect.left) + (thumbSize / 2) + (usableTrackWidth * ratio);

    els.timelineScrollLabel.textContent = getNearestTimelineDate(scrollLeftValue) || "NOW";
    els.timelineScrollLabel.style.left = `${labelLeft}px`;
    els.timelineScrollLabel.hidden = false;
  }

  function hidePreview() {
    previewActive = false;
    sliderDragging = false;
    els.timelineScrollLabel.hidden = true;
  }

  function scrollTimelineTo(scrollLeftValue) {
    const maxScrollLeft = getMaxScrollLeft();
    const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, scrollLeftValue));
    els.timelineScrollRange.value = String(nextScrollLeft);
    els.timelineContainer.scrollTo({
      left: nextScrollLeft,
      behavior: "auto",
    });
    updatePreview(nextScrollLeft);
  }

  // Pointer dragging bypasses the browser's default range feel and maps the
  // thumb position directly to timeline scroll for smoother horizontal travel.
  function scrollTimelineFromPointer(clientX) {
    const maxScrollLeft = getMaxScrollLeft();
    const rangeRect = els.timelineScrollRange.getBoundingClientRect();
    if (rangeRect.width <= 0 || maxScrollLeft <= 0) {
      scrollTimelineTo(0);
      return;
    }

    const ratio = Math.min(1, Math.max(0, (clientX - rangeRect.left) / rangeRect.width));
    scrollTimelineTo(maxScrollLeft * ratio);
  }

  function syncRange() {
    const maxScrollLeft = getMaxScrollLeft();
    const currentScrollLeft = Math.min(maxScrollLeft, Math.max(0, els.timelineContainer.scrollLeft));

    els.timelineScrollRange.max = String(maxScrollLeft);
    els.timelineScrollRange.value = String(currentScrollLeft);
    els.timelineScrollRange.disabled = maxScrollLeft <= 0;
    updatePreview(currentScrollLeft);
  }

  els.timelineContainer.addEventListener("wheel", (event) => {
    const horizontalDelta = event.shiftKey ? event.deltaY + event.deltaX : event.deltaY;
    if (Math.abs(horizontalDelta) <= Math.abs(event.deltaX) && !event.shiftKey) return;

    els.timelineContainer.scrollBy({
      left: horizontalDelta * 1.15,
      behavior: "smooth",
    });
    event.preventDefault();
  }, { passive: false });

  els.timelineContainer.addEventListener("scroll", syncRange, { passive: true });
  els.timelineContainer.addEventListener("timeline-layout", syncRange);
  els.timelineScrollRange.addEventListener("input", () => {
    scrollTimelineTo(Number(els.timelineScrollRange.value || 0));
  });
  els.timelineScrollRange.addEventListener("pointerdown", (event) => {
    previewActive = true;
    sliderDragging = true;
    els.timelineScrollRange.setPointerCapture?.(event.pointerId);
    scrollTimelineFromPointer(event.clientX);
  });
  els.timelineScrollRange.addEventListener("pointermove", (event) => {
    if (!sliderDragging) return;
    event.preventDefault();
    scrollTimelineFromPointer(event.clientX);
  });
  els.timelineScrollRange.addEventListener("focus", () => {
    previewActive = true;
    updatePreview(Number(els.timelineScrollRange.value || 0));
  });
  els.timelineScrollRange.addEventListener("blur", hidePreview);
  els.timelineScrollRange.addEventListener("pointerup", hidePreview);
  els.timelineScrollRange.addEventListener("pointercancel", hidePreview);
  window.addEventListener("pointerup", hidePreview);
  window.addEventListener("resize", syncRange);

  syncRange();

  return { syncRange };
}
