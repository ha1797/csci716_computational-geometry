# Plane Sweep Algorithm Pedagogical Aid

An interactive, browser-based visualization of the plane-sweep algorithm for finding all intersections among a set of line segments. Built for CSCI 716 - Computational Geometry.

**Live site:** https://ha1797.github.io/csci716_computational-geometry/

The site is plain HTML, CSS, and JavaScript. There is no build step, framework, or server, and everything runs in the browser.

## Pages

| Page | Description |
|---|---|
| `index.html` | Project background: problem description, algorithm and pseudo-code, timeline, references |
| `demo.html` | The interactive visualizer |

## Running Locally

Open `demo.html` directly in a browser. No server is needed.

## Using the Visualizer

1. **Provide input:** use the pre-loaded sample, paste segments into the text box, or click **Upload .txt**.
2. Click **Run Sweep**. The input is parsed and validated, and the sweep runs.
3. Step through events with **First / Prev / Play / Next / Last**, or drag the event slider. **Delay** controls playback speed.
4. Click **Download Intersections** to save the results as `<name>_intersection.txt`.

### What You See

- **Plane (left):** all segments in gray, segments currently in the sweep-line status in blue, the sweep line in red, intersections found so far as red dots, and the event currently being processed (start, end, or intersection) circled in orange.
- **Sweep-Line Status (right, top):** segments crossing the sweep line, ordered top to bottom.
- **Event Queue (right, bottom):** pending events in the order they will be processed.
- **Output:** a log of each run, the list of intersections, and any parse or validation errors.

The sweep line moves from **right to left**.

## Input Format

The first line is the number of segments. Each following line is one segment as `x1 y1 x2 y2`:

```
3
10 57 79 46
12 32 95 19
44 8 14 70
```

Input is rejected if:

- the segment count doesn't match the number of segment lines,
- any segment is vertical or horizontal,
- any two segments are colinear, or
- three or more segments meet at the same point.

## Output Format

The downloaded file has the number of intersections on the first line, then one `x y` point per line in the order they were found:

```
2
82.52166118912459 45.542575440693156
70.93519968676586 22.769185591229444
```

## Project Structure

```
├── index.html          Background page
├── demo.html           Visualizer page
├── styles.css          Shared styles
└── js/
    ├── log.js          Timestamped logging to the on-page console
    ├── models.js       Event types, SweepEvent, EventQueue (binary heap)
    ├── geometry.js     Segment intersection point
    ├── sweep-status.js Sweep-line status (skip list ordered by y at the sweep line)
    ├── parser.js       Input parsing
    ├── checker.js      Input validation
    ├── output.js       Intersection file formatting
    ├── driver.js       The plane-sweep algorithm
    └── visualize.js    Canvas rendering, panels, and playback controls
```

Scripts are loaded as classic `<script>` tags in dependency order (not ES modules), so the page also works when opened from the file system.

## Complexity

With *n* segments and *I* intersections, the sweep processes 2*n* endpoint events and *I* intersection events, each in O(log *n*) (expected, for the skip list). Total: **O((n + I) log n)** time.

## References

- Mount, D. M. (2012). *CMSC 754 Computational Geometry Lecture Notes: Line Segment Intersection*. University of Maryland.
- Pless, R. (n.d.). *Computational Geometry Course Materials*. Washington University in St. Louis.
- de Berg, M., Cheong, O., van Kreveld, M., & Overmars, M. (2008). *Computational Geometry: Algorithms and Applications* (3rd ed.). Springer.

## Author

Hoja Arzanesh (ha1797@rit.edu)
