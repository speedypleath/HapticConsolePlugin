#[cfg(unix)]
use midir::os::unix::VirtualOutput;
use midir::{MidiInput, MidiOutput, MidiOutputConnection};
use parking_lot::Mutex;
use serde::Serialize;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tauri::{AppHandle, Emitter};

use crate::mapping::MidiMapper;
use crate::osc::OscConfig;

pub struct AppState {
    pub mapper: MidiMapper,
    pub learn_target: Option<String>,
    pub port_names: Vec<String>,
    pub active_port: usize,
    pub virtual_port_active: bool,
    pub osc: OscConfig,
    stop_flag: Option<Arc<AtomicBool>>,
    midi_thread: Option<std::thread::Thread>,
}

impl AppState {
    pub fn new() -> Self {
        let mapper = MidiMapper::new();
        let osc = OscConfig::new(mapper.param_to_cc().into_keys());
        Self {
            mapper,
            osc,
            learn_target: None,
            port_names: Vec::new(),
            active_port: 0,
            virtual_port_active: false,
            stop_flag: None,
            midi_thread: None,
        }
    }
}

// ── Event types ───────────────────────────────────────────────────────────────

#[derive(Debug, PartialEq)]
pub(crate) enum MidiEvent {
    ParamChange { param_id: String, value: f64 },
    LearnComplete { param_id: String, cc: u8 },
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ParamChangePayload {
    param_id: String,
    value: f64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LearnCompletePayload {
    param_id: String,
    cc: u8,
}

// ── Public helpers ────────────────────────────────────────────────────────────

pub fn list_input_ports() -> Vec<String> {
    let Ok(input) = MidiInput::new("haptic-list") else {
        return vec![];
    };
    (0..input.port_count())
        .filter_map(|i| input.port_name(&input.ports()[i]).ok())
        .collect()
}

pub fn start_midi_thread(app: AppHandle, state: Arc<Mutex<AppState>>, port_index: usize) {
    // Stop the previous thread before spawning a new one so we don't
    // accumulate virtual output ports in the system MIDI server.
    let (old_flag, old_thread) = {
        let mut st = state.lock();
        (st.stop_flag.take(), st.midi_thread.take())
    };
    if let (Some(flag), Some(thread)) = (old_flag, old_thread) {
        flag.store(true, Ordering::Release);
        thread.unpark();
    }

    let stop = Arc::new(AtomicBool::new(false));
    let stop_cl = stop.clone();
    let state_ref = state.clone();

    let handle = std::thread::spawn(move || {
        if let Err(e) = run_midi(app, state, port_index, stop_cl) {
            log::error!("MIDI thread error: {e}");
        }
    });

    let mut st = state_ref.lock();
    st.stop_flag = Some(stop);
    st.midi_thread = Some(handle.thread().clone());
}

// ── Core processing (pure — no AppHandle) ────────────────────────────────────

// Extracts (cc, normalised_value) from a raw MIDI message.
// Returns None for anything that isn't a CC message (status 0xB0–0xBF).
pub(crate) fn parse_cc(msg: &[u8]) -> Option<(u8, f64)> {
    if msg.len() < 3 || (msg[0] & 0xF0) != 0xB0 {
        return None;
    }
    Some((msg[1], msg[2] as f64 / 127.0))
}

// Processes one CC message against the current mapper and learn state.
// Returns the events that should be emitted; mutates state accordingly.
// Pure: no I/O, no AppHandle — fully testable.
pub(crate) fn process_message(msg: &[u8], state: &mut AppState) -> Vec<MidiEvent> {
    let Some((cc, value)) = parse_cc(msg) else {
        return vec![];
    };

    let mut events = Vec::new();

    if let Some(param_id) = state.learn_target.take() {
        state.mapper.set_mapping(cc, param_id.clone());
        events.push(MidiEvent::LearnComplete { param_id, cc });
    }

    if let Some(param_id) = state.mapper.param_for_cc(cc).map(str::to_owned) {
        events.push(MidiEvent::ParamChange { param_id, value });
    }

    events
}

// ── Internal ──────────────────────────────────────────────────────────────────

fn open_virtual_output() -> Option<MidiOutputConnection> {
    let output = MidiOutput::new("haptic-out").ok()?;
    #[cfg(unix)]
    return output.create_virtual("Haptic Console").ok();
    #[cfg(not(unix))]
    return None;
}

fn run_midi(
    app: AppHandle,
    state: Arc<Mutex<AppState>>,
    port_index: usize,
    stop: Arc<AtomicBool>,
) -> Result<(), String> {
    let input = MidiInput::new("haptic-in").map_err(|e| e.to_string())?;
    let ports = input.ports();
    let port = ports.get(port_index).ok_or("port index out of range")?;

    let mut vout = open_virtual_output();
    state.lock().virtual_port_active = vout.is_some();

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

    // Park until told to stop. Loop guards against spurious wakeups.
    while !stop.load(Ordering::Acquire) {
        std::thread::park();
    }
    // _conn drops here: closes MIDI input and virtual output port.
    Ok(())
}

fn handle_message(
    msg: &[u8],
    app: &AppHandle,
    state: &Arc<Mutex<AppState>>,
    vout: &mut Option<MidiOutputConnection>,
) {
    let mut st = state.lock();
    let events = process_message(msg, &mut st);

    // Collect OSC sends while the lock is still held.
    let osc_sends: Vec<(String, u16, String, f64)> = events
        .iter()
        .filter_map(|e| match e {
            MidiEvent::ParamChange { param_id, value } => {
                let addr = st.osc.address_for(param_id);
                Some((st.osc.host.clone(), st.osc.port, addr, *value))
            }
            _ => None,
        })
        .collect();

    drop(st);

    let forward = events
        .iter()
        .any(|e| matches!(e, MidiEvent::ParamChange { .. }));

    for event in events {
        match event {
            MidiEvent::ParamChange { param_id, value } => {
                let _ = app.emit("param-change", ParamChangePayload { param_id, value });
            }
            MidiEvent::LearnComplete { param_id, cc } => {
                let _ = app.emit("midi-learn-complete", LearnCompletePayload { param_id, cc });
            }
        }
    }

    for (host, port, addr, value) in osc_sends {
        crate::osc::send_param(&host, port, &addr, value);
    }

    if forward {
        if let Some(out) = vout {
            let _ = out.send(msg);
        }
    }
}
