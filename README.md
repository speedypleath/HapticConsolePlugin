# Haptic Console

Standalone macOS app for the Haptic Console v1.0 — a physical performance instrument with
7 sensor modules routed through a Teensy 4.1 via USB MIDI. Visualises live parameter data,
remaps CCs on the fly, and forwards remapped values to your DAW via a virtual MIDI port and
optionally to any OSC-capable software.

**Stack:** Tauri v2 (Rust) + Preact/TypeScript (Vite). No audio processing, no DAW plugin.

---

## Contents

- [Hardware overview](#hardware-overview)
- [Features](#features)
- [Signal flow](#signal-flow)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Building a release](#building-a-release)
- [UI reference](#ui-reference)
- [Settings](#settings)
- [Parameter reference](#parameter-reference)
- [Default CC map](#default-cc-map)
- [OSC address map](#osc-address-map)
- [Architecture](#architecture)
- [Testing](#testing)
- [VS Code integration](#vs-code-integration)

---

## Hardware overview

| Module | Description | Parameters |
|---|---|---|
| Flywheel | Spinning mass sensor | `flywheel_velocity`, `flywheel_direction` |
| Pneumatic cylinder | Air pressure actuator | `pneumatic_pressure` |
| Acoustic spring | Tension/resonance sensor | `spring_tension`, `spring_acoustic` |
| MPE matrix | Pressure-sensitive pad grid | `matrix_centroid_x`, `matrix_centroid_y`, `matrix_pressure` |
| Isometric leaning bar | Two-axis lean sensor (bipolar) | `lean_total`, `lean_balance` |
| Control unit | Dual joystick module | `joystick_1_x`, `joystick_1_y`, `joystick_2_x`, `joystick_2_y` |
| Hybrid bridge | Interconnect / Teensy host | (no direct params) |

All modules report via a Teensy 4.1 as standard USB MIDI CC messages on channel 1.

---

## Features

- Live visualisation of all 14 parameters with per-module display components
- CC remapping: reassign any CC to any parameter at runtime
- MIDI learn: click LEARN, move a physical CC — the mapping updates instantly
- Virtual MIDI output port `"Haptic Console"` — point your DAW to it to receive remapped CCs
- OSC output: send any parameter to any host:port via editable OSC addresses
- Settings UI with MIDI, OSC, and DAW tabs
- 29 unit + integration tests covering the full MIDI→UI pipeline

---

## Signal flow

```
Teensy 4.1
    │  USB MIDI (CC messages)
    ▼
midir input thread
    │
    ├─► MidiMapper ──────────────────────────────► Virtual MIDI port
    │       │                                       "Haptic Console"
    │       ▼                                           (DAW)
    │   param-change event
    │       │
    │       ▼
    │   Tauri WebView
    │       │
    │       ▼
    │   Preact signals ──► UI components
    │
    └─► OSC UDP ──────────────────────────────────► OSC host:port
            (host / port / address configurable per param)
```

MIDI learn: JS calls `start_midi_learn(paramId)` → Rust stores `learn_target` → next CC
received clears the target, updates the map, and emits `midi-learn-complete` back to the UI.

---

## Requirements

- macOS 12 Monterey or later (virtual MIDI port requires CoreMIDI on Unix)
- [Rust stable](https://rustup.rs/) 1.77.2 or later
- Tauri CLI 2.x — `cargo install tauri-cli --version "^2"`
- Node 18 or later (for the frontend build)
- A Teensy 4.1 running the Haptic Console firmware, or any USB MIDI device sending CCs

---

## Quick start

```bash
# Clone and install frontend dependencies
git clone <repo-url>
cd HapticConsolePlugin
npm install

# Start dev mode (Vite + Tauri hot reload)
cargo tauri dev
```

The Vite dev server runs at `http://localhost:5173`. Frontend edits hot-reload without
restarting Tauri. Rust changes require a recompile (Tauri handles this automatically on save).

---

## Building a release

```bash
cargo tauri build
```

Output: `src-tauri/target/release/bundle/macos/Haptic Console.app`

The bundle is self-contained — no separate Vite build step required.

---

## UI reference

### Header bar

Displays `HAPTIC CONSOLE` wordmark and an online indicator dot (lights up gold when the
first MIDI CC arrives from the Teensy).

### Flywheel module

Animated ring showing velocity and direction of the flywheel sensor. The ring rotates to
reflect `flywheel_direction` and its opacity/size reflects `flywheel_velocity`.

### Joystick modules

Two joystick displays (left = J1, right = J2). Each shows a thumb position within a square
aperture, driven by the respective X/Y parameters.

### CC strip

A vertical strip of labelled bars for the remaining 10 parameters:
`pneumatic_pressure`, `spring_tension`, `spring_acoustic`, `lean_total`, `lean_balance`,
`matrix_centroid_x`, `matrix_centroid_y`, `matrix_pressure` (plus J1/J2 echoes in compact form).

Bipolar parameters (`lean_total`, `lean_balance`) are centred at 0 — bar extends left or right.

### Settings button

Opens/closes the settings panel overlaid on the right side.

---

## Settings

### MIDI tab

| Control | What it does |
|---|---|
| MIDI INPUT dropdown | Lists all available USB MIDI input ports; selecting one switches the active port immediately |
| MIDI OUTPUT status | Shows `"Haptic Console"` in gold when the virtual port is open, or `unavailable` on non-Unix systems |
| CC mapping table | One row per parameter: current CC number (editable), LEARN button |

**MIDI learn workflow:**
1. Click `LEARN` on the target row — button turns gold and shows `WAIT…`
2. Move a physical CC on the Teensy (or any MIDI device)
3. The CC number updates automatically; the learn mode cancels

### OSC tab

| Control | What it does |
|---|---|
| HOST | IP address of the OSC target (default `127.0.0.1`); saved on blur |
| PORT | UDP port (default `8000`); saved on blur |
| OSC address table | One row per parameter; address editable, saved on blur |

Default addresses follow the pattern `/haptic/<param_id>` (e.g. `/haptic/flywheel_velocity`).
Every incoming CC that maps to a known parameter sends an OSC float message to the configured target.

### DAW tab

Read-only summary showing which CC each parameter is currently assigned to, plus its value
range (`0 → 1` or `−1 → +1`). Use this to configure automation lanes in your DAW.

The virtual output port `"Haptic Console"` carries the remapped CCs — connect your DAW's
MIDI input to this port.

---

## Parameter reference

| Parameter ID | CC | Description | Bipolar | UI location |
|---|---|---|---|---|
| `flywheel_velocity` | 1 | Flywheel spin speed | No | Flywheel ring |
| `flywheel_direction` | 2 | Flywheel spin direction | No | Flywheel ring |
| `pneumatic_pressure` | 3 | Pneumatic cylinder pressure | No | CC strip |
| `spring_tension` | 4 | Acoustic spring tension | No | CC strip |
| `spring_acoustic` | 5 | Acoustic spring resonance | No | CC strip |
| `lean_total` | 6 | Full-body lean amount | Yes | CC strip |
| `lean_balance` | 7 | Lean left/right balance | Yes | CC strip |
| `matrix_centroid_x` | 8 | MPE matrix centroid X | No | CC strip |
| `matrix_centroid_y` | 9 | MPE matrix centroid Y | No | CC strip |
| `matrix_pressure` | 10 | MPE matrix pressure | No | CC strip |
| `joystick_1_x` | 11 | Left joystick X axis | No | Left joystick |
| `joystick_1_y` | 12 | Left joystick Y axis | No | Left joystick |
| `joystick_2_x` | 13 | Right joystick X axis | No | Right joystick |
| `joystick_2_y` | 14 | Right joystick Y axis | No | Right joystick |

All values normalised: MIDI 0–127 → float 0–1 (bipolar params: 0–1 displayed in UI, but
the OSC float and DAW CC carry the full 0–127 range).

---

## Default CC map

| CC | Parameter |
|---|---|
| 1 | `flywheel_velocity` |
| 2 | `flywheel_direction` |
| 3 | `pneumatic_pressure` |
| 4 | `spring_tension` |
| 5 | `spring_acoustic` |
| 6 | `lean_total` |
| 7 | `lean_balance` |
| 8 | `matrix_centroid_x` |
| 9 | `matrix_centroid_y` |
| 10 | `matrix_pressure` |
| 11 | `joystick_1_x` |
| 12 | `joystick_1_y` |
| 13 | `joystick_2_x` |
| 14 | `joystick_2_y` |

Remapping via the MIDI tab is in-memory only — defaults restore on next launch.

---

## OSC address map

| Parameter | Default OSC address |
|---|---|
| `flywheel_velocity` | `/haptic/flywheel_velocity` |
| `flywheel_direction` | `/haptic/flywheel_direction` |
| `pneumatic_pressure` | `/haptic/pneumatic_pressure` |
| `spring_tension` | `/haptic/spring_tension` |
| `spring_acoustic` | `/haptic/spring_acoustic` |
| `lean_total` | `/haptic/lean_total` |
| `lean_balance` | `/haptic/lean_balance` |
| `matrix_centroid_x` | `/haptic/matrix_centroid_x` |
| `matrix_centroid_y` | `/haptic/matrix_centroid_y` |
| `matrix_pressure` | `/haptic/matrix_pressure` |
| `joystick_1_x` | `/haptic/joystick_1_x` |
| `joystick_1_y` | `/haptic/joystick_1_y` |
| `joystick_2_x` | `/haptic/joystick_2_x` |
| `joystick_2_y` | `/haptic/joystick_2_y` |

Addresses are editable per-param in the OSC tab and take effect immediately.

---

## Architecture

### Project structure

```
HapticConsolePlugin/
├── src/                        # TypeScript/Preact frontend
│   ├── bridge.ts               # Tauri invoke/listen wrappers
│   ├── params.ts               # PARAM_META + Preact signals
│   ├── settings.ts             # ccMap, learnTarget signals
│   ├── main.tsx                # App entry point
│   ├── style.css               # Global styles
│   └── components/
│       ├── App.tsx             # Root layout
│       ├── Settings.tsx        # Settings panel (MIDI / OSC / DAW tabs)
│       ├── Flywheel.tsx        # Flywheel ring visualiser
│       ├── Joystick.tsx        # Joystick XY display
│       └── CCStrip.tsx         # Parameter bar strip
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── lib.rs              # App setup, command registration
│       ├── midi.rs             # AppState, MIDI thread, process_message
│       ├── mapping.rs          # MidiMapper — CC↔param_id map
│       ├── osc.rs              # OscConfig, send_param, build_osc_float
│       └── tests/
│           ├── mod.rs
│           ├── midi.rs         # parse_cc unit tests
│           ├── mapping.rs      # MidiMapper unit tests
│           └── integration.rs  # Full pipeline tests
├── vite.config.ts
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

### Rust backend

**Shared state** — `Arc<Mutex<AppState>>` passed to every Tauri command and cloned into the
MIDI thread:

```rust
pub struct AppState {
    pub mapper:              MidiMapper,         // CC ↔ param_id
    pub learn_target:        Option<String>,     // set by start_midi_learn
    pub port_names:          Vec<String>,
    pub active_port:         usize,
    pub virtual_port_active: bool,
    pub osc:                 OscConfig,
    stop_flag:               Option<Arc<AtomicBool>>,
    midi_thread:             Option<std::thread::Thread>,
}
```

**MIDI thread lifecycle** — `start_midi_thread` signals the old thread to stop
(`flag.store(true, Release)` + `thread.unpark()`) before spawning a new one. This prevents
multiple virtual MIDI ports from accumulating in the system MIDI server when switching inputs.

**Pure message processing** — `process_message(msg, &mut AppState) -> Vec<MidiEvent>` is
fully testable without a `AppHandle`. It returns events; the caller emits them to the WebView
and OSC.

```rust
pub(crate) enum MidiEvent {
    ParamChange   { param_id: String, value: f64 },
    LearnComplete { param_id: String, cc: u8 },
}
```

**OSC wire format** — built without an external crate. `build_osc_float(address, value)`
produces a minimal OSC 1.0 message: null-padded address + `,f\0\0` type tag + big-endian f32.

### TypeScript frontend

| Signal | Type | Source |
|---|---|---|
| `paramValues` | `Record<ParamId, Signal<number>>` | `param-change` Tauri event |
| `isOnline` | `Signal<boolean>` | Set true on first `param-change` |
| `ccMap` | `Signal<Record<string, number>>` | `get_mappings` + `midi-learn-complete` |
| `learnTarget` | `Signal<string \| null>` | Set by LEARN button click |
| `oscConfig` | `Signal<OscConfig>` | `get_osc_config` |

The UI renders immediately on startup; `setupBridge()` runs in the background and is
non-blocking — a bridge failure never prevents the UI from displaying.

### Rust ↔ JS bridge

**Rust → JS events** (push, no acknowledgement):

| Event | Payload | When |
|---|---|---|
| `param-change` | `{ paramId, value }` | Every incoming mapped CC |
| `midi-learn-complete` | `{ paramId, cc }` | After MIDI learn binds a CC |

**JS → Rust commands** (request/response via `invoke`):

| Command | Arguments | Returns |
|---|---|---|
| `get_mappings` | — | `Record<string, number>` |
| `set_mapping` | `cc, paramId` | — |
| `start_midi_learn` | `paramId` | — |
| `list_midi_ports` | — | `string[]` |
| `select_midi_port` | `index` | — |
| `virtual_output_name` | — | `string \| null` |
| `get_osc_config` | — | `OscConfig` |
| `set_osc_host` | `host` | — |
| `set_osc_port` | `port` | — |
| `set_osc_address` | `paramId, address` | — |

---

## Testing

```bash
# Run all tests
cargo test

# Run a specific suite
cargo test --test integration
```

| File | Tests | What is covered |
|---|---|---|
| `src-tauri/src/tests/midi.rs` | 8 | `parse_cc`: channel-agnostic, note-on/pitch-bend rejected, short messages, value normalisation at 0/64/127 |
| `src-tauri/src/tests/mapping.rs` | 8 | Default count, default assignments, unknown CC → None, set/overwrite, old-CC eviction, param→CC inversion |
| `src-tauri/src/tests/integration.rs` | 8 | CC1 routes to `flywheel_velocity`, value normalisation, unmapped CC, non-CC, MIDI learn bind + both events, eviction on remap, learn consumed after one message, all 14 defaults route |
| `src-tauri/src/osc.rs` (inline) | 5 | Address null-padding, type tag, big-endian value, default address, custom address override |

All tests are pure — no Tauri AppHandle, no OS MIDI, no network. `process_message` is the
single testable seam between the raw MIDI bytes and the rest of the app.

---

## VS Code integration

### Tasks (`Ctrl+Shift+B` / `Terminal → Run Task`)

| Task | Description |
|---|---|
| `cargo: build (debug)` | Default build — compiles the Rust backend |
| `cargo: test` | Default test — runs all Rust tests |
| `tauri: dev` | Full app in dev mode (background, Vite + Tauri) |
| `vite: dev server` | Frontend only at `http://localhost:5173` (background) |

### Launch configs (`F5`)

| Config | Description |
|---|---|
| `Tauri: Dev` | Starts the Vite dev server then attaches CodeLLDB to the Tauri process |
| `Tauri: Attach` | Attach CodeLLDB to an already-running Tauri process by PID |

### Running tests in the UI

Open the **Testing** panel (flask icon in the Activity Bar). The Rust Language Server
exposes each `#[test]` as a runnable — click the play button next to any test or suite.
