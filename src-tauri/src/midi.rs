use midir::{MidiInput, MidiOutput, MidiOutputConnection};
#[cfg(unix)]
use midir::os::unix::VirtualOutput;
use parking_lot::Mutex;
use serde::Serialize;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

use crate::mapping::MidiMapper;

pub struct AppState {
    pub mapper:       MidiMapper,
    pub learn_target: Option<String>,
    pub port_names:   Vec<String>,
    pub active_port:  usize,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            mapper:       MidiMapper::new(),
            learn_target: None,
            port_names:   Vec::new(),
            active_port:  0,
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ParamChangePayload {
    param_id: String,
    value:    f64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LearnCompletePayload {
    param_id: String,
    cc:       u8,
}

pub fn list_input_ports() -> Vec<String> {
    let Ok(input) = MidiInput::new("haptic-list") else { return vec![] };
    (0..input.port_count())
        .filter_map(|i| input.port_name(&input.ports()[i]).ok())
        .collect()
}

pub fn start_midi_thread(app: AppHandle, state: Arc<Mutex<AppState>>, port_index: usize) {
    std::thread::spawn(move || {
        if let Err(e) = run_midi(app, state, port_index) {
            log::error!("MIDI thread error: {e}");
        }
    });
}

fn open_virtual_output() -> Option<MidiOutputConnection> {
    let output = MidiOutput::new("haptic-out").ok()?;
    #[cfg(unix)]
    return output.create_virtual("Haptic Console").ok();
    #[cfg(not(unix))]
    return None;
}

fn run_midi(app: AppHandle, state: Arc<Mutex<AppState>>, port_index: usize) -> Result<(), String> {
    let input = MidiInput::new("haptic-in").map_err(|e| e.to_string())?;
    let ports  = input.ports();
    let port   = ports.get(port_index).ok_or("port index out of range")?;

    let mut vout = open_virtual_output();

    let _conn = input
        .connect(
            port,
            "haptic-conn",
            move |_stamp, msg, _| {
                handle_message(msg, &app, &state, &mut vout);
            },
            (),
        )
        .map_err(|e| e.to_string())?;

    // Keep thread alive until process exits.
    std::thread::park();
    Ok(())
}

fn handle_message(
    msg:   &[u8],
    app:   &AppHandle,
    state: &Arc<Mutex<AppState>>,
    vout:  &mut Option<MidiOutputConnection>,
) {
    // Only handle CC messages (status byte 0xB0–0xBF)
    if msg.len() < 3 || (msg[0] & 0xF0) != 0xB0 {
        return;
    }
    let cc    = msg[1];
    let raw   = msg[2];
    let value = raw as f64 / 127.0;

    let mut st = state.lock();

    // MIDI learn
    if let Some(param_id) = st.learn_target.take() {
        st.mapper.set_mapping(cc, param_id.clone());
        let _ = app.emit("midi-learn-complete", LearnCompletePayload { param_id, cc });
    }

    // Normal routing
    let Some(param_id) = st.mapper.param_for_cc(cc).map(str::to_owned) else {
        return;
    };

    let _ = app.emit("param-change", ParamChangePayload { param_id, value });

    // Forward remapped CC on virtual output (same channel, same value)
    if let Some(out) = vout {
        let _ = out.send(msg);
    }
}
