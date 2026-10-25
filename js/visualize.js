(() => {
    "use strict";

    const SAMPLE_INPUT = [
        "10",
        "10 57 79 46",
        "12 32 95 19",
        "44 8 14 70",
        "97 74 68 17",
        "43 25 14 65",
        "61 11 16 6",
        "26 94 53 31",
        "100 53 25 21",
        "81 99 16 98",
        "35 78 70 93",
    ].join("\n");

    const MAX_LOGGED_INTERSECTIONS = 200;

    const ETYPE_LABEL = {
        [EventType.RIGHT]: "start",
        [EventType.INTERSECTION]: "intersection",
        [EventType.LEFT]: "end",
    };

    const COLORS = {
        background: "#ffffff",
        grid: "#eaeef2",
        frame: "#d0d7de",
        axisText: "#656d76",
        segment: "#afb8c1",
        label: "#656d76",
        active: "#0969da",
        sweep: "#cf222e",
        intersection: "#fa4549",
        intersectionEdge: "#1f2328",
        event: "#f0883e",
    };

    const $ = (id) => document.getElementById(id);
    const els = {
        input: $("segments-input"),
        file: $("segments-file"),
        run: $("run-btn"),
        sample: $("sample-btn"),
        download: $("download-btn"),
        title: $("viz-title"),
        canvas: $("plane-canvas"),
        statusPanel: $("status-panel"),
        queuePanel: $("queue-panel"),
        first: $("first-btn"),
        prev: $("prev-btn"),
        play: $("play-btn"),
        next: $("next-btn"),
        last: $("last-btn"),
        scrubber: $("scrubber"),
        speed: $("speed"),
        speedLabel: $("speed-label"),
        consoleBox: $("console-box"),
        consoleLines: $("console-lines"),
    };
    const ctx = els.canvas.getContext("2d");

    let state = null;
    let index = 0;
    let timer = null;
    let inputStem = "datapoints";
    let inputLabel = "sample (datapoints.txt)";

    // ---------- Text panels (mirrors visualize.py) ----------

    function compareSegments(a, b) {
        const fa = a.flat();
        const fb = b.flat();
        for (let i = 0; i < 4; i++) {
            if (fa[i] !== fb[i]) return fa[i] - fb[i];
        }
        return 0;
    }

    // Stable S1..Sn labels for each segment (sorted for determinism).
    function buildSegmentIds(segs) {
        return new Map([...segs].sort(compareSegments).map((seg, i) => [seg, i + 1]));
    }

    function eventLabel(event, segIds) {
        const x = event.point[0].toFixed(1);
        if (event.etype === EventType.INTERSECTION) {
            const [i, j] = event.segs.map((s) => segIds.get(s)).sort((a, b) => a - b);
            return `cross S${i}\u00d7S${j}  x=${x}`;
        }
        const kind = event.etype === EventType.RIGHT ? "start" : "end";
        return `${kind.padEnd(5)} S${segIds.get(event.segs[0])}  x=${x}`;
    }

    function statusLines(statusSegs, segIds) {
        if (statusSegs.length === 0) return "(empty)";
        return statusSegs.slice().reverse().map((s) => `S${segIds.get(s)}`).join("\n"); // top -> bottom
    }

    function queueLines(queue, segIds) {
        if (queue.length === 0) return "(empty)";
        return queue.map((e) => eventLabel(e, segIds)).join("\n");
    }

    // ---------- Running the sweep ----------

    function captureFrames(planeSegments) {
        const frames = [];
        const final = planeSweep(planeSegments, (event, sweepX, statusSegs, intersections, queue) => {
            frames.push({
                sweepX,
                status: statusSegs,
                intersections: intersections.slice(),
                queue,
                etype: event.etype,
                point: event.point,
            });
        });
        return { frames, final };
    }

    function plotBounds(segs) {
        if (segs.length === 0) return { xlo: 0, xhi: 1, ylo: 0, yhi: 1 };
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const [[x1, y1], [x2, y2]] of segs) {
            minX = Math.min(minX, x1, x2);
            maxX = Math.max(maxX, x1, x2);
            minY = Math.min(minY, y1, y2);
            maxY = Math.max(maxY, y1, y2);
        }
        const padX = (maxX - minX) * 0.05 || 1;
        const padY = (maxY - minY) * 0.05 || 1;
        return { xlo: minX - padX, xhi: maxX + padX, ylo: minY - padY, yhi: maxY + padY };
    }

    function run() {
        pause();
        clearConsole();
        log.setVerbosity(Verbosity.NORMAL);
        log.start();

        log.info(`reading input: ${inputLabel}`);
        let planeSegments;
        try {
            planeSegments = parseSegments(els.input.value);
        } catch (e) {
            log.error(`failed to parse input: ${e.message}`);
            setState(null);
            return;
        }

        log.info(`parsed ${planeSegments.numSegs} segments; validating`);
        try {
            check(planeSegments);
        } catch (e) {
            log.error(`input check failed: ${e.message}`);
            setState(null);
            return;
        }
        log.info("input check passed");

        const initialQueue = buildEventQueue(planeSegments).snapshot();
        const { frames, final } = captureFrames(planeSegments);
        const bounds = plotBounds(planeSegments.segs);

        // Frame 0 is the state before any event is processed.
        frames.unshift({
            sweepX: bounds.xhi,
            status: [],
            intersections: [],
            queue: initialQueue,
            etype: null,
            point: null,
        });

        log.info(`found ${final.length} intersections:`);
        for (const [x, y] of final.slice(0, MAX_LOGGED_INTERSECTIONS)) {
            appendConsole(`${formatCoord(x)} ${formatCoord(y)}`);
        }
        if (final.length > MAX_LOGGED_INTERSECTIONS) {
            appendConsole(`... (+${final.length - MAX_LOGGED_INTERSECTIONS} more, use Download)`);
        }
        log.info("done - press Play or step through the events");

        setState({
            segs: planeSegments.segs,
            segIds: buildSegmentIds(planeSegments.segs),
            frames,
            final,
            bounds,
        });
    }

    function setState(next) {
        state = next;
        index = 0;
        els.scrubber.max = state ? String(state.frames.length - 1) : "0";
        render();
    }

    // ---------- Rendering ----------

    function niceStep(range, target) {
        const raw = range / target;
        const mag = 10 ** Math.floor(Math.log10(raw));
        const norm = raw / mag;
        return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    }

    const formatTick = (v) => String(Number(v.toPrecision(12)));

    function strokeLine(x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    function draw() {
        const w = els.canvas.clientWidth;
        const h = els.canvas.clientHeight;
        ctx.fillStyle = COLORS.background;
        ctx.fillRect(0, 0, w, h);
        if (!state) return;

        const frame = state.frames[index];
        const { xlo, xhi, ylo, yhi } = state.bounds;
        const margin = { left: 40, right: 14, top: 14, bottom: 28 };
        const plotW = w - margin.left - margin.right;
        const plotH = h - margin.top - margin.bottom;
        const scale = Math.min(plotW / (xhi - xlo), plotH / (yhi - ylo));
        const ox = margin.left + (plotW - (xhi - xlo) * scale) / 2;
        const oy = margin.top + (plotH - (yhi - ylo) * scale) / 2;
        const px = (x) => ox + (x - xlo) * scale;
        const py = (y) => oy + (yhi - y) * scale;
        const box = { left: px(xlo), right: px(xhi), top: py(yhi), bottom: py(ylo) };

        // Grid and tick labels
        ctx.lineWidth = 1;
        ctx.strokeStyle = COLORS.grid;
        ctx.fillStyle = COLORS.axisText;
        ctx.font = "10px sans-serif";

        const xStep = niceStep(xhi - xlo, 8);
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        for (let x = Math.ceil(xlo / xStep) * xStep; x <= xhi; x += xStep) {
            const X = Math.round(px(x)) + 0.5;
            strokeLine(X, box.top, X, box.bottom);
            ctx.fillText(formatTick(x), X, box.bottom + 6);
        }

        const yStep = niceStep(yhi - ylo, 8);
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        for (let y = Math.ceil(ylo / yStep) * yStep; y <= yhi; y += yStep) {
            const Y = Math.round(py(y)) + 0.5;
            strokeLine(box.left, Y, box.right, Y);
            ctx.fillText(formatTick(y), box.left - 6, Y);
        }

        ctx.strokeStyle = COLORS.frame;
        ctx.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);

        ctx.save();
        ctx.beginPath();
        ctx.rect(box.left, box.top, box.right - box.left, box.bottom - box.top);
        ctx.clip();

        // All segments
        ctx.strokeStyle = COLORS.segment;
        ctx.lineWidth = 1;
        for (const [[x1, y1], [x2, y2]] of state.segs) {
            strokeLine(px(x1), py(y1), px(x2), py(y2));
        }

        // Segment ids at midpoints
        ctx.fillStyle = COLORS.label;
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const [seg, sid] of state.segIds) {
            const [[x1, y1], [x2, y2]] = seg;
            ctx.fillText(`S${sid}`, px((x1 + x2) / 2), py((y1 + y2) / 2));
        }

        // Segments in the sweep status
        ctx.strokeStyle = COLORS.active;
        ctx.lineWidth = 2.4;
        for (const [[x1, y1], [x2, y2]] of frame.status) {
            strokeLine(px(x1), py(y1), px(x2), py(y2));
        }

        // Sweep line
        ctx.strokeStyle = COLORS.sweep;
        ctx.lineWidth = 1.6;
        strokeLine(px(frame.sweepX), box.top, px(frame.sweepX), box.bottom);

        // Intersections found so far
        ctx.fillStyle = COLORS.intersection;
        ctx.strokeStyle = COLORS.intersectionEdge;
        ctx.lineWidth = 0.8;
        for (const [x, y] of frame.intersections) {
            ctx.beginPath();
            ctx.arc(px(x), py(y), 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Current intersection event
        if (frame.etype === EventType.INTERSECTION) {
            ctx.strokeStyle = COLORS.event;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px(frame.point[0]), py(frame.point[1]), 7, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    function render() {
        const hasState = state !== null;
        const lastIndex = hasState ? state.frames.length - 1 : 0;

        if (hasState) {
            const frame = state.frames[index];
            els.title.textContent = frame.etype === null
                ? `Plane sweep \u2014 ready: ${frame.queue.length} events queued`
                : `Plane sweep \u2014 event ${index}/${lastIndex} ` +
                  `(${ETYPE_LABEL[frame.etype]})   intersections: ${frame.intersections.length}`;
            els.statusPanel.textContent = statusLines(frame.status, state.segIds);
            els.queuePanel.textContent = queueLines(frame.queue, state.segIds);
        } else {
            els.title.textContent = "Plane sweep \u2014 no valid input";
            els.statusPanel.textContent = "(empty)";
            els.queuePanel.textContent = "(empty)";
        }
        els.statusPanel.scrollTop = els.statusPanel.scrollHeight;
        els.queuePanel.scrollTop = 0;

        els.scrubber.value = String(index);
        els.scrubber.disabled = !hasState;
        els.first.disabled = !hasState || index === 0;
        els.prev.disabled = !hasState || index === 0;
        els.next.disabled = !hasState || index === lastIndex;
        els.last.disabled = !hasState || index === lastIndex;
        els.play.disabled = !hasState;
        els.download.disabled = !hasState;

        draw();
    }

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = els.canvas.getBoundingClientRect();
        els.canvas.width = Math.round(width * dpr);
        els.canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
    }

    // ---------- Playback ----------

    function go(i) {
        if (!state) return;
        index = Math.max(0, Math.min(i, state.frames.length - 1));
        render();
    }

    function play() {
        if (!state) return;
        if (index >= state.frames.length - 1) go(0);
        els.play.textContent = "Pause";
        timer = setInterval(() => {
            if (index >= state.frames.length - 1) {
                pause();
                return;
            }
            go(index + 1);
        }, Number(els.speed.value));
    }

    function pause() {
        clearInterval(timer);
        timer = null;
        els.play.textContent = "Play";
    }

    // ---------- Output console ----------

    function appendConsole(text, level) {
        const div = document.createElement("div");
        div.className = level === "error" ? "console-line error" : "console-line";
        div.textContent = text;
        els.consoleLines.appendChild(div);
        els.consoleBox.scrollTop = els.consoleBox.scrollHeight;
    }

    function clearConsole() {
        els.consoleLines.replaceChildren();
    }

    // ---------- Wiring ----------

    log.setSink(appendConsole);

    els.run.addEventListener("click", () => {
        inputLabel = "text box";
        run();
    });

    els.sample.addEventListener("click", () => {
        els.input.value = SAMPLE_INPUT;
        inputStem = "datapoints";
        inputLabel = "sample (datapoints.txt)";
        run();
    });

    els.file.addEventListener("change", async () => {
        const file = els.file.files[0];
        if (!file) return;
        els.input.value = await file.text();
        inputStem = file.name.replace(/\.[^.]*$/, "") || "segments";
        inputLabel = file.name;
        els.file.value = "";
        run();
    });

    els.download.addEventListener("click", () => {
        if (!state) return;
        const blob = new Blob([formatIntersections(state.final)], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${inputStem}_intersection.txt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    });

    els.first.addEventListener("click", () => { pause(); go(0); });
    els.prev.addEventListener("click", () => { pause(); go(index - 1); });
    els.next.addEventListener("click", () => { pause(); go(index + 1); });
    els.last.addEventListener("click", () => { pause(); go(Infinity); });
    els.play.addEventListener("click", () => (timer === null ? play() : pause()));
    els.scrubber.addEventListener("input", () => { pause(); go(Number(els.scrubber.value)); });

    els.speed.addEventListener("input", () => {
        els.speedLabel.textContent = `${els.speed.value} ms`;
        if (timer !== null) {
            pause();
            play();
        }
    });

    new ResizeObserver(resizeCanvas).observe(els.canvas);

    els.input.value = SAMPLE_INPUT;
    run();
})();
