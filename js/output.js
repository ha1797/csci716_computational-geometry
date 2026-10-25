// Python prints whole floats as "45.0"; match it so output equals the CLI's file.
function formatCoord(v) {
    return Number.isInteger(v) ? v.toFixed(1) : String(v);
}

function formatIntersections(intersections) {
    const lines = intersections.map(([x, y]) => `${formatCoord(x)} ${formatCoord(y)}\n`);
    return `${intersections.length}\n${lines.join("")}`;
}
