const Verbosity = Object.freeze({ QUIET: 0, NORMAL: 1, VERBOSE: 2 });

const log = (() => {
    let verbosity = Verbosity.NORMAL;
    let startTime = null;
    let sink = (line) => console.log(line);

    const elapsed = () => (startTime === null ? 0 : (performance.now() - startTime) / 1000);
    const stamp = () => `[${elapsed().toFixed(3).padStart(7)}s]`;

    return {
        setVerbosity(level) { verbosity = level; },
        getVerbosity() { return verbosity; },
        setSink(fn) { sink = fn; },
        start() { startTime = performance.now(); },
        elapsed,
        info(msg) {
            if (verbosity >= Verbosity.NORMAL) sink(`${stamp()} ${msg}`, "info");
        },
        verbose(msg) {
            if (verbosity >= Verbosity.VERBOSE) sink(`${stamp()} ${msg}`, "verbose");
        },
        error(msg) {
            sink(`${stamp()} ERROR: ${msg}`, "error");
        },
    };
})();
