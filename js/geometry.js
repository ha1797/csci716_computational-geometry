function intersectionPoint(seg1, seg2) {
    const [[x1, y1], [x2, y2]] = seg1;
    const [[x3, y3], [x4, y4]] = seg2;

    const dx1 = x2 - x1;
    const dy1 = y2 - y1;
    const dx2 = x4 - x3;
    const dy2 = y4 - y3;

    const denom = dx1 * dy2 - dy1 * dx2;
    if (denom === 0) return null; // Parallel or colinear segments

    const t = ((x3 - x1) * dy2 - (y3 - y1) * dx2) / denom;
    const u = ((x3 - x1) * dy1 - (y3 - y1) * dx1) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return [x1 + t * dx1, y1 + t * dy1];
    }
    return null; // No intersection within the segments
}
