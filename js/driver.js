function buildEventQueue(planeSegments) {
    const eq = new EventQueue();

    for (const seg of planeSegments.segs) {
        const [[x1, y1], [x2, y2]] = seg;
        let rightPt;
        let leftPt;
        if (x1 > x2) {
            rightPt = [x1, y1];
            leftPt = [x2, y2];
        } else {
            rightPt = [x2, y2];
            leftPt = [x1, y1];
        }

        eq.push(new SweepEvent(rightPt, EventType.RIGHT, [seg]));
        eq.push(new SweepEvent(leftPt, EventType.LEFT, [seg]));
    }

    return eq;
}

function scheduleIntersection(eventQueue, seg1, seg2, sweepX) {
    const pt = intersectionPoint(seg1, seg2);
    if (pt === null) return;
    if (pt[0] > sweepX) return;
    eventQueue.push(new SweepEvent(pt, EventType.INTERSECTION, [seg1, seg2]));
}

// Sweeps right to left; onEvent(event, sweepX, statusSegs, intersections, queue) fires after each event.
function planeSweep(planeSegments, onEvent = null) {
    const eventQueue = buildEventQueue(planeSegments);
    const status = new SweepStatus();
    const intersections = [];

    const totalEvents = eventQueue.length;
    let processed = 0;
    const progressStep = Math.max(1, Math.floor(totalEvents / 20));

    log.verbose(`event queue initialized with ${totalEvents} events`);
    log.info("running plane sweep");

    while (!eventQueue.isEmpty()) {
        const event = eventQueue.pop();
        processed++;
        const sweepX = event.point[0];
        status.setSweepX(sweepX);

        if (log.getVerbosity() >= Verbosity.VERBOSE && processed % progressStep === 0) {
            log.verbose(
                `  ${processed}/${totalEvents} events, ` +
                `status size ${status.length}, ` +
                `${intersections.length} intersections so far`
            );
        }

        if (event.etype === EventType.RIGHT) {
            const seg = event.segs[0];
            status.insert(seg);
            const below = status.predecessor(seg);
            const above = status.successor(seg);
            if (below !== null) scheduleIntersection(eventQueue, below, seg, sweepX);
            if (above !== null) scheduleIntersection(eventQueue, above, seg, sweepX);

        } else if (event.etype === EventType.LEFT) {
            const seg = event.segs[0];
            const below = status.predecessor(seg);
            const above = status.successor(seg);
            status.delete(seg);
            if (below !== null && above !== null) {
                scheduleIntersection(eventQueue, below, above, sweepX);
            }

        } else if (event.etype === EventType.INTERSECTION) {
            const [seg1, seg2] = event.segs;

            const eps = 1e-9;
            status.setSweepX(sweepX + eps);
            if (status.find(seg1) && status.find(seg2)) {
                intersections.push(event.point);

                // Swap across the crossing: remove the pair while the pre-crossing
                // order is still valid, then reinsert on the far side.
                status.delete(seg1);
                status.delete(seg2);
                status.setSweepX(sweepX - eps);
                status.insert(seg1);
                status.insert(seg2);

                let lower;
                let upper;
                if (status.successor(seg1) === seg2) {
                    lower = seg1;
                    upper = seg2;
                } else {
                    lower = seg2;
                    upper = seg1;
                }

                const below = status.predecessor(lower);
                const above = status.successor(upper);
                if (below !== null) scheduleIntersection(eventQueue, below, lower, sweepX);
                if (above !== null) scheduleIntersection(eventQueue, above, upper, sweepX);
            }
        }

        if (onEvent !== null) {
            status.setSweepX(sweepX);
            onEvent(event, sweepX, status.toList(), intersections, eventQueue.snapshot());
        }
    }

    log.verbose(
        `sweep complete: processed ${processed} events, ` +
        `found ${intersections.length} intersections`
    );

    return intersections;
}
