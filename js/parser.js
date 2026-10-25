const INT_RE = /^[+-]?\d+$/;
const NUMBER_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

function parseNumber(s, lineno, line) {
    if (!NUMBER_RE.test(s)) {
        throw new Error(`line ${lineno}: invalid number ${JSON.stringify(s)} in: ${JSON.stringify(line)}`);
    }
    return Number(s);
}

function parseSegments(text) {
    let numSegments = null;
    const segmentsList = [];
    const lines = text.split(/\r\n|\r|\n/);

    for (let i = 0; i < lines.length; i++) {
        const lineno = i + 1;
        const line = lines[i];
        const ln = line.trim();
        if (!ln) continue;

        if (numSegments === null) {
            if (!INT_RE.test(ln)) {
                throw new Error(`line ${lineno}: expected segment count but got: ${JSON.stringify(line)}`);
            }
            numSegments = parseInt(ln, 10);
            continue;
        }

        const parts = ln.split(/\s+/);
        if (parts.length !== 4) {
            throw new Error(`line ${lineno}: expected 'x1 y1 x2 y2' but got: ${JSON.stringify(line)}`);
        }

        const [x1, y1, x2, y2] = parts.map((p) => parseNumber(p, lineno, line));
        segmentsList.push([[x1, y1], [x2, y2]]);
    }

    if (numSegments === null) {
        throw new Error("Missing first line with segment count");
    }

    if (segmentsList.length !== numSegments) {
        throw new Error(
            `Segment count mismatch: header says ${numSegments}, ` +
            `but parsed ${segmentsList.length} segments`
        );
    }

    // The Python version stores segments in a set, so exact duplicates collapse.
    const unique = new Map();
    for (const seg of segmentsList) {
        const key = seg.flat().join(" ");
        if (!unique.has(key)) unique.set(key, seg);
    }

    return { numSegs: numSegments, segs: [...unique.values()] };
}
