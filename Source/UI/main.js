// Parameter IDs must match Parameters.h
const PARAM_IDS = [
    "flywheel_velocity", "flywheel_direction",
    "pneumatic_pressure",
    "spring_tension",    "spring_acoustic",
    "lean_total",        "lean_balance",
    "matrix_centroid_x", "matrix_centroid_y", "matrix_pressure",
    "joystick_1_x",      "joystick_1_y",
    "joystick_2_x",      "joystick_2_y",
];

// Bipolar params use -1..+1 range; all others are 0..1
const BIPOLAR = new Set(["lean_total", "lean_balance"]);

// ── DOM setup ────────────────────────────────────────────────────────────────

const container = document.getElementById("params");

const paramEls = {};

for (const id of PARAM_IDS) {
    const row = document.createElement("div");
    row.className = "param";

    const label = document.createElement("span");
    label.className = "param-id";
    label.textContent = id;

    const barWrap = document.createElement("div");
    barWrap.className = "param-bar-wrap";
    const bar = document.createElement("div");
    bar.className = "param-bar";
    barWrap.appendChild(bar);

    const valueEl = document.createElement("span");
    valueEl.className = "param-value";
    valueEl.textContent = "0.000";

    row.appendChild(label);
    row.appendChild(barWrap);
    row.appendChild(valueEl);
    container.appendChild(row);

    paramEls[id] = { bar, valueEl };
}

// ── Bridge: C++ → JS ─────────────────────────────────────────────────────────

window.haptic = {
    onParamChange(paramId, value) {
        const els = paramEls[paramId];
        if (!els) return;

        const bipolar = BIPOLAR.has(paramId);
        // map to 0..1 for the bar width
        const normalised = bipolar ? (value + 1) / 2 : value;

        els.bar.style.width = `${Math.round(normalised * 100)}%`;
        els.valueEl.textContent = value.toFixed(3);
    },
};

// ── Bridge: JS → C++ (CC remapping) ──────────────────────────────────────────
// Requires JUCE native integration. getNativeFunction wraps window.__JUCE__
// and returns a Promise. Guard against running outside the plugin WebView.

let setMapping = () => {};

if (typeof window.__JUCE__ !== "undefined") {
    // Inline the getNativeFunction logic to avoid importing the npm package.
    // See JUCE modules/juce_gui_extra/native/javascript/index.js for the full impl.
    const promiseMap = new Map();
    let nextId = 0;

    window.__JUCE__.backend.addEventListener("__juce__complete", ({ promiseId, result }) => {
        promiseMap.get(promiseId)?.resolve(result);
        promiseMap.delete(promiseId);
    });

    setMapping = (ccNumber, paramId) => {
        const id = nextId++;
        const promise = new Promise((resolve) => promiseMap.set(id, { resolve }));
        window.__JUCE__.backend.emitEvent("__juce__invoke", {
            name: "setMapping",
            params: [ccNumber, paramId],
            resultId: id,
        });
        return promise;
    };
}

export { setMapping };
