// The visual axis line is drawn after cards are laid out, because its geometry
// depends on the rendered position of each event dot.
export function syncTimelineTrackAlignment(timelineContainer) {
  const axisSvg = timelineContainer.querySelector(".timeline-axis-svg");
  const dotNodes = Array.from(timelineContainer.querySelectorAll(".event-dot"));
  const futureEndNode = timelineContainer.querySelector(".timeline-future-line-end");
  if (!axisSvg || dotNodes.length === 0) {
    timelineContainer.dispatchEvent(new CustomEvent("timeline-layout"));
    return;
  }

  const containerRect = timelineContainer.getBoundingClientRect();
  const points = dotNodes.map((dot) => {
    const rect = dot.getBoundingClientRect();
    return {
      x: rect.left - containerRect.left + timelineContainer.scrollLeft + (rect.width / 2),
      y: rect.top - containerRect.top + (rect.height / 2),
    };
  });
  const lastPoint = points[points.length - 1];
  const futurePoint = futureEndNode
    ? (() => {
      const rect = futureEndNode.getBoundingClientRect();
      return {
        x: rect.left - containerRect.left + timelineContainer.scrollLeft + (rect.width / 2),
        y: lastPoint.y,
      };
    })()
    : null;

  const width = Math.max(
    timelineContainer.scrollWidth,
    Math.ceil((futurePoint?.x || lastPoint.x) + 120),
  );
  const height = Math.max(timelineContainer.clientHeight, 1);
  const pathData = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  axisSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  axisSvg.setAttribute("width", String(width));
  axisSvg.setAttribute("height", String(height));
  axisSvg.innerHTML = "";

  const axisPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  axisPath.setAttribute("class", "timeline-axis-line");
  axisPath.setAttribute("d", pathData);
  axisSvg.appendChild(axisPath);

  appendFutureFadeLine(axisSvg, lastPoint, futurePoint);
  timelineContainer.dispatchEvent(new CustomEvent("timeline-layout"));
}

function appendFutureFadeLine(axisSvg, lastPoint, futurePoint) {
  // The fade line visually says "the story continues" without pretending there
  // is a concrete future event card yet.
  if (!futurePoint || futurePoint.x <= lastPoint.x + 20) return;

  const gradientId = "timelineFutureFade";
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  gradient.setAttribute("id", gradientId);
  gradient.setAttribute("gradientUnits", "userSpaceOnUse");
  gradient.setAttribute("x1", String(lastPoint.x));
  gradient.setAttribute("y1", String(lastPoint.y));
  gradient.setAttribute("x2", String(futurePoint.x));
  gradient.setAttribute("y2", String(futurePoint.y));

  [
    ["0%", ".32"],
    ["58%", ".2"],
    ["100%", "0"],
  ].forEach(([offset, opacity]) => {
    const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop.setAttribute("offset", offset);
    stop.setAttribute("stop-color", "#fff");
    stop.setAttribute("stop-opacity", opacity);
    gradient.appendChild(stop);
  });

  defs.appendChild(gradient);
  axisSvg.appendChild(defs);

  const futurePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  futurePath.setAttribute("class", "timeline-axis-fade-line");
  futurePath.setAttribute("d", `M ${lastPoint.x} ${lastPoint.y} L ${futurePoint.x} ${futurePoint.y}`);
  futurePath.setAttribute("stroke", `url(#${gradientId})`);
  axisSvg.appendChild(futurePath);
}
