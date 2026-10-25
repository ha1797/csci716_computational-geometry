// Points are [x, y]; segments are [[x1, y1], [x2, y2]] and compared by reference.

const EventType = Object.freeze({ RIGHT: 0, INTERSECTION: 1, LEFT: 2 });

function formatPoint([x, y]) {
    return `(${x}, ${y})`;
}

function formatSegment([p, q]) {
    return `(${formatPoint(p)}, ${formatPoint(q)})`;
}

// Named SweepEvent because `Event` would shadow the browser's global Event.
class SweepEvent {
    constructor(point, etype, segs) {
        this.point = point;
        this.etype = etype;
        this.segs = segs;
    }

    lessThan(other) {
        if (this.point[0] !== other.point[0]) return this.point[0] > other.point[0];
        if (this.point[1] !== other.point[1]) return this.point[1] > other.point[1];
        return this.etype < other.etype;
    }
}

class EventQueue {
    constructor() {
        this.heap = [];
        this.counter = 0;
    }

    static less(a, b) {
        if (a.event.lessThan(b.event)) return true;
        if (b.event.lessThan(a.event)) return false;
        return a.order < b.order;
    }

    push(event) {
        const heap = this.heap;
        heap.push({ event, order: this.counter++ });
        let i = heap.length - 1;
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (!EventQueue.less(heap[i], heap[parent])) break;
            [heap[i], heap[parent]] = [heap[parent], heap[i]];
            i = parent;
        }
    }

    pop() {
        const heap = this.heap;
        const top = heap[0];
        const last = heap.pop();
        if (heap.length > 0) {
            heap[0] = last;
            let i = 0;
            for (;;) {
                const l = 2 * i + 1;
                const r = l + 1;
                let smallest = i;
                if (l < heap.length && EventQueue.less(heap[l], heap[smallest])) smallest = l;
                if (r < heap.length && EventQueue.less(heap[r], heap[smallest])) smallest = r;
                if (smallest === i) break;
                [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
                i = smallest;
            }
        }
        return top.event;
    }

    peek() {
        return this.heap[0].event;
    }

    // Pending events in the order they will be popped.
    snapshot() {
        return this.heap
            .slice()
            .sort((a, b) => (EventQueue.less(a, b) ? -1 : 1))
            .map((entry) => entry.event);
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    get length() {
        return this.heap.length;
    }
}
