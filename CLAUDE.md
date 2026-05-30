# Haptic Console

## What this is

Standalone macOS app for the Haptic Console v1.0 — a physical performance
instrument with 7 sensor modules (flywheel, pneumatic cylinder, acoustic spring,
MPE matrix, isometric leaning bar, control unit, hybrid bridge), all routed
through a Teensy 4.1 that outputs USB MIDI.

The app's job:

1. Receive MIDI CCs from the Teensy
2. Map them to named parameters and push updates to the UI
3. Re-emit remapped CCs on a virtual MIDI port `"Haptic Console"` for DAW use
4. Host a Preact/TypeScript UI for live visualisation and CC remapping

**Stack:** Tauri v2 (Rust backend) + Preact/TypeScript frontend (Vite).
No JUCE, no DAW plugin, no audio processing.

## Dev

```bash
cargo tauri dev          # starts Vite dev server + Tauri window
```

Run from the project root. Tauri calls `npm run dev` automatically (configured
in `src-tauri/tauri.conf.json`). Hot-reloads on frontend file changes.

## Build (release)

```bash
cargo tauri build        # produces .app bundle in src-tauri/target/release/bundle/
```

## Key files

| File | Purpose |
|---|---|
| `src-tauri/src/lib.rs` | Tauri app setup, command registration |
| `src-tauri/src/midi.rs` | MIDI input thread, virtual output port, event emission |
| `src-tauri/src/mapping.rs` | CC → parameter ID map + defaults |
| `src/bridge.ts` | Tauri `invoke`/`listen` wrappers |
| `src/params.ts` | PARAM_META array + Preact signals |
| `src/settings.ts` | Settings signals (ccMap, learnTarget) |
| `src/components/` | Flywheel, Joystick, CCStrip, Settings |

## Parameter IDs

```
flywheel_velocity     flywheel_direction
pneumatic_pressure
spring_tension        spring_acoustic
lean_total            lean_balance          ← bipolar −1→+1
matrix_centroid_x     matrix_centroid_y     matrix_pressure
joystick_1_x          joystick_1_y
joystick_2_x          joystick_2_y
```

Defined in `src/params.ts` (PARAM_META) and mirrored in
`src-tauri/src/mapping.rs` (default CC map). Keep them in sync.

## Default CC map

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

## Rust ↔ JS bridge

**Rust → JS** (push param update to UI):
```rust
app.emit("param-change", ParamChangePayload { param_id, value })?;
```

**JS → Rust** (remap a CC):
```ts
invoke('set_mapping', { cc, paramId });
```

**JS → Rust** (MIDI learn):
```ts
invoke('start_midi_learn', { paramId });
// Rust emits 'midi-learn-complete' when next CC arrives
```

## Conventions

- Parameter IDs: `snake_case`, must match between `params.ts` and `mapping.rs`
- Tauri commands: `snake_case` Rust names map to `camelCase` via serde
- UI: Preact + `@preact/signals` for reactivity; no other UI framework
- Comments: only when the WHY is non-obvious

## Do not

- Add audio processing
- Define parameter IDs in more than two places (params.ts + mapping.rs)
- Add screen-heavy UI — design philosophy is minimal visual noise
- Install npm packages in `Source/UI/` without asking
- Add Rust dependencies without asking
