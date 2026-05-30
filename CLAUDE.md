# Haptic Console Plugin

## What this is

JUCE MIDI Effect plugin for the Haptic Console v1.0 — a physical performance
instrument with 7 sensor modules (flywheel, pneumatic cylinder, acoustic spring,
MPE matrix, isometric leaning bar, control unit, hybrid bridge), all routed
through a Teensy 4.1 that outputs USB MIDI.

The plugin's only job is:

1. Parse incoming MIDI CCs from the Teensy
2. Map them to named AudioProcessorValueTreeState parameters (→ DAW automation lanes)
3. Host a WebView UI for configuration and live visualisation

**This is not an audio plugin.** `IS_MIDI_EFFECT TRUE` in CMakeLists.txt is
intentional and must not be changed.

## Build

```bash
# Configure (first time)
cmake -B build -DCMAKE_BUILD_TYPE=Debug

# Build
cmake --build build --config Debug -j$(nproc)

# Build release
cmake --build build --config Release -j$(nproc)
```

Plugin output lands in `build/HapticConsolePlugin_artefacts/`.

## WebView UI — hot reload in dev

```bash
# In Source/UI/
npx vite .
# → http://localhost:5173
```

In debug builds the editor loads `http://localhost:5173` instead of the bundled
files (see `PluginEditor.cpp`, `#if JUCE_DEBUG` block). No recompile needed for
UI changes during development.

## Key files

| File | Purpose |
|---|---|
| `Source/Parameters.h` | Single source of truth for all parameter IDs and APVTS layout |
| `Source/MidiMapper.h/.cpp` | CC number → parameter ID lookup table |
| `Source/PluginProcessor.h/.cpp` | AudioProcessor: MIDI parse + parameter write |
| `Source/PluginEditor.h/.cpp` | WebBrowserComponent host + JS bridge |
| `Source/UI/index.html` | WebView entry point |
| `Source/UI/main.js` | Parameter visualisation + bridge calls |

## Parameter IDs (Source/Parameters.h — do not define inline elsewhere)

```
flywheel_velocity     flywheel_direction
pneumatic_pressure
spring_tension        spring_acoustic
lean_total            lean_balance          ← bipolar -1→+1
matrix_centroid_x     matrix_centroid_y     matrix_pressure
joystick_1_x          joystick_1_y
joystick_2_x          joystick_2_y
```

## Default CC map (MidiMapper defaults)

| CC | Parameter |
|---|---|
| 1 | flywheel_velocity |
| 2 | flywheel_direction |
| 3 | pneumatic_pressure |
| 4 | spring_tension |
| 5 | spring_acoustic |
| 6 | lean_total |
| 7 | lean_balance |
| 8 | matrix_centroid_x |
| 9 | matrix_centroid_y |
| 10 | matrix_pressure |
| 11 | joystick_1_x |
| 12 | joystick_1_y |
| 13 | joystick_2_x |
| 14 | joystick_2_y |

## JS ↔ C++ bridge

**C++ → JS** (push parameter update to UI):

```cpp
webView->evaluateJavascript(
    "window.haptic.onParamChange('" + paramId + "', " + juce::String(value) + ")"
);
```

**JS → C++** (user remaps a CC from the UI):

```js
window.__JUCE__.backend.setMapping(ccNumber, paramId);
```

## Conventions

- Parameter IDs: `snake_case` strings, defined only in `Parameters.h`
- Class names: `HapticConsole` prefix (e.g. `HapticConsoleProcessor`)
- UI: plain JS + CSS variables for parameter values; no framework unless explicitly added
- Comments: only when the WHY is non-obvious; no docblocks

## Do not

- Add audio processing or change `IS_MIDI_EFFECT` to false
- Define parameter ID strings outside `Parameters.h`
- Add screen-heavy or visually dominant UI — design philosophy is minimal visual
  noise (see Haptic-Console-Design-Intent in Obsidian vault)
- Install npm packages in `Source/UI/` without asking
- Modify `.clang-format` without asking

## JUCE source

JUCE is at `JUCE/` (git submodule). When in doubt about an API, read the header
directly — e.g. `JUCE/modules/juce_audio_processors/processors/juce_AudioProcessor.h`
