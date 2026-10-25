const MAX_LEVEL = 32;
const PROMOTE_P = 0.5;

class SkipNode {
    constructor(seg, level) {
        this.seg = seg;
        this.forward = new Array(level + 1).fill(null);
    }
}

function yAt(seg, x) {
    const [[x1, y1], [x2, y2]] = seg;
    if (x1 === x2) return y1;
    const t = (x - x1) / (x2 - x1);
    return y1 + t * (y2 - y1);
}

function slope(seg) {
    const [[x1, y1], [x2, y2]] = seg;
    if (x1 === x2) return Infinity;
    return (y2 - y1) / (x2 - x1);
}

// Skip list ordered by (y at the sweep line, slope).
class SweepStatus {
    constructor() {
        this.head = new SkipNode(null, MAX_LEVEL);
        this.level = 0;
        this.size = 0;
        this.sweepX = null;
    }

    setSweepX(x) {
        this.sweepX = x;
    }

    less(a, b) {
        const ya = yAt(a, this.sweepX);
        const yb = yAt(b, this.sweepX);
        if (ya !== yb) return ya < yb;
        return slope(a) < slope(b);
    }

    get length() {
        return this.size;
    }

    isEmpty() {
        return this.size === 0;
    }

    find(seg) {
        return this.findNode(seg) !== null;
    }

    findNode(seg) {
        let current = this.head;
        for (let level = this.level; level >= 0; level--) {
            while (current.forward[level] !== null && this.less(current.forward[level].seg, seg)) {
                current = current.forward[level];
            }
        }
        const candidate = current.forward[0];
        if (candidate !== null && candidate.seg === seg) return candidate;
        return null;
    }

    insert(seg) {
        const update = new Array(MAX_LEVEL + 1).fill(this.head);

        let current = this.head;
        for (let level = this.level; level >= 0; level--) {
            while (current.forward[level] !== null && this.less(current.forward[level].seg, seg)) {
                current = current.forward[level];
            }
            update[level] = current;
        }

        const candidate = current.forward[0];
        if (candidate !== null && candidate.seg === seg) return;

        const newLevel = SweepStatus.randomLevel();
        if (newLevel > this.level) {
            for (let level = this.level + 1; level <= newLevel; level++) {
                update[level] = this.head;
            }
            this.level = newLevel;
        }

        const node = new SkipNode(seg, newLevel);
        for (let level = 0; level <= newLevel; level++) {
            node.forward[level] = update[level].forward[level];
            update[level].forward[level] = node;
        }
        this.size++;
    }

    delete(seg) {
        const update = new Array(MAX_LEVEL + 1).fill(this.head);
        let current = this.head;

        for (let level = this.level; level >= 0; level--) {
            while (current.forward[level] !== null && this.less(current.forward[level].seg, seg)) {
                current = current.forward[level];
            }
            update[level] = current;
        }

        const target = current.forward[0];
        if (target === null || target.seg !== seg) return false;

        for (let level = 0; level <= this.level; level++) {
            if (update[level].forward[level] !== target) break;
            update[level].forward[level] = target.forward[level];
        }

        while (this.level > 0 && this.head.forward[this.level] === null) {
            this.level--;
        }

        this.size--;
        return true;
    }

    predecessor(seg) {
        return this.neighbor(seg, false);
    }

    successor(seg) {
        return this.neighbor(seg, true);
    }

    neighbor(seg, above) {
        if (this.findNode(seg) === null) {
            throw new Error(`Segment not in status: ${formatSegment(seg)}`);
        }

        let current = this.head;
        for (let level = this.level; level >= 0; level--) {
            while (current.forward[level] !== null && this.less(current.forward[level].seg, seg)) {
                current = current.forward[level];
            }
        }

        const below = current !== this.head ? current : null;
        let aboveNode = current.forward[0];
        if (aboveNode !== null && aboveNode.seg === seg) {
            aboveNode = aboveNode.forward[0];
        }

        if (above) return aboveNode !== null ? aboveNode.seg : null;
        return below !== null ? below.seg : null;
    }

    toList() {
        const out = [];
        let current = this.head.forward[0];
        while (current !== null) {
            out.push(current.seg);
            current = current.forward[0];
        }
        return out;
    }

    static randomLevel() {
        let level = 0;
        while (Math.random() < PROMOTE_P && level < MAX_LEVEL) level++;
        return level;
    }
}
