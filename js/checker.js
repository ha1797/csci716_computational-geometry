function check(planeSegments) {
    const segments = planeSegments.segs;

    checkNoVerticalOrHorizontal(segments);
    checkNoColinear(segments);
    checkNoTripleIntersections(segments);
}

function* combinations2(items) {
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            yield [items[i], items[j]];
        }
    }
}

function checkNoVerticalOrHorizontal(segments) {
    for (const seg of segments) {
        const [[x1, y1], [x2, y2]] = seg;
        if (x1 === x2) {
            throw new Error(
                `Vertical segment not allowed: ${formatSegment(seg)}. ` +
                `Endpoints must have distinct x-coordinates.`
            );
        }
        if (y1 === y2) {
            throw new Error(
                `Horizontal segment not allowed: ${formatSegment(seg)}. ` +
                `Endpoints must have distinct y-coordinates.`
            );
        }
    }
}

function orientation(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function checkNoColinear(segments) {
    for (const [seg1, seg2] of combinations2(segments)) {
        if (orientation(seg1[0], seg1[1], seg2[0]) === 0 &&
            orientation(seg1[0], seg1[1], seg2[1]) === 0) {
            throw new Error(
                `Colinear segments found: ${formatSegment(seg1)} and ${formatSegment(seg2)}. ` +
                `Colinear segments are not allowed.`
            );
        }
    }
}

function checkerIntersectionPoint(seg1, seg2) {
    const [[x1, y1], [x2, y2]] = seg1;
    const [[x3, y3], [x4, y4]] = seg2;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return null; // Parallel or colinear segments

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
    }
    return null; // No intersection within the segments
}

function checkNoTripleIntersections(segments) {
    const intersections = [];

    for (const [seg1, seg2] of combinations2(segments)) {
        const pt = checkerIntersectionPoint(seg1, seg2);
        if (pt !== null) intersections.push([pt, seg1, seg2]);
    }

    for (let i = 0; i < intersections.length; i++) {
        const [pt1, s1a, s1b] = intersections[i];
        const involved = new Set([s1a, s1b]);
        for (const [pt2, s2a, s2b] of intersections.slice(i + 1)) {
            if (pointsEqual(pt1, pt2)) {
                involved.add(s2a);
                involved.add(s2b);
            }
            if (involved.size >= 3) {
                const segs = [...involved].map(formatSegment).join(", ");
                throw new Error(
                    `Three or more segments intersect at ${formatPoint(pt1)}: {${segs}}. ` +
                    `No three segments may share an intersection point.`
                );
            }
        }
    }
}

function pointsEqual(p, q, tol = 1e-9) {
    return Math.abs(p[0] - q[0]) <= tol && Math.abs(p[1] - q[1]) <= tol;
}
