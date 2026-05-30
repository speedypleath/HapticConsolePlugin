# Haptic Console Plugin

JUCE MIDI Effect plugin for the Haptic Console v1.0 — a physical performance instrument with 7 sensor modules routed through a Teensy 4.1 via USB MIDI.

The plugin parses incoming MIDI CCs, maps them to named APVTS parameters (DAW automation lanes), and hosts a WebView UI for live visualisation and CC remapping.

## Build

```bash
# First time
cmake -B build -DCMAKE_BUILD_TYPE=Debug -DJUCE_BUILD_EXTRAS=ON

# Plugin (VST3 + AU)
cmake --build build --config Debug --target HapticConsolePlugin_VST3 -j$(nproc)

# JUCE AudioPluginHost (debug host)
cmake --build build --config Debug --target AudioPluginHost -j$(nproc)
```

Output: `build/HapticConsolePlugin_artefacts/`

## UI development (hot reload)

```bash
cd Source/UI
npm install
npm run dev   # → http://localhost:5173
```

In debug builds the editor loads `http://localhost:5173` instead of the bundled files — no recompile needed for UI changes.

## Testing

### With AudioPluginHost (no hardware)

1. Press `F5` in VSCode (runs the `debug: prepare` task — builds plugin + starts Vite dev server in parallel, then launches AudioPluginHost).
2. Load the VST3 from `build/HapticConsolePlugin_artefacts/Debug/VST3/`.
3. For a MIDI source without hardware, open **Audio MIDI Setup → MIDI Studio** and create an IAC Driver bus, then route any MIDI app to it.

### With a DAW

Load the plugin as a MIDI effect on a MIDI track. Incoming CCs update parameters visible as DAW automation lanes.

### Smoke test (no hardware)

| What to send | Expected result |
|---|---|
| CC 1 value 64 | Flywheel velocity ~50% |
| CC 11 value 127 + CC 12 value 0 | Left joystick thumb → bottom-right |
| CC 6 value 0 | `lean_total` → -1 (full left) |
| CC 6 value 127 | `lean_total` → +1 (full right) |

## Default CC map

| CC | Parameter | UI location | Notes |
|---|---|---|---|
| 1 | `flywheel_velocity` | Flywheel module | |
| 2 | `flywheel_direction` | Flywheel module | |
| 3 | `pneumatic_pressure` | CC strip | |
| 4 | `spring_tension` | CC strip | |
| 5 | `spring_acoustic` | CC strip | |
| 6 | `lean_total` | CC strip | Bipolar −1→+1 |
| 7 | `lean_balance` | CC strip | Bipolar −1→+1 |
| 8 | `matrix_centroid_x` | CC strip | |
| 9 | `matrix_centroid_y` | CC strip | |
| 10 | `matrix_pressure` | CC strip | |
| 11 | `joystick_1_x` | Left joystick | |
| 12 | `joystick_1_y` | Left joystick | |
| 13 | `joystick_2_x` | Right joystick | |
| 14 | `joystick_2_y` | Right joystick | |

All CC values are normalized: `value / 127.0 → float 0–1`. APVTS remaps bipolar params to −1→+1 for automation.

CC assignments can be changed at runtime from the UI (JS→C++ bridge calls `setMapping`).

## Key files

| File | Purpose |
|---|---|
| `Source/Parameters.h` | All parameter IDs and APVTS layout |
| `Source/MidiMapper.h/.cpp` | CC → parameter ID map + runtime remapping |
| `Source/PluginProcessor.h/.cpp` | MIDI parse + parameter write |
| `Source/PluginEditor.h/.cpp` | WebBrowserComponent host + JS bridge |
| `Source/UI/` | Preact + TypeScript WebView UI |
