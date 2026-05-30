mod mapping;
mod midi;
#[cfg(test)]
mod tests;

use midi::{list_input_ports, start_midi_thread, AppState};
use parking_lot::Mutex;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;

type SharedState = Arc<Mutex<AppState>>;

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_mappings(state: State<'_, SharedState>) -> HashMap<String, u8> {
    state.lock().mapper.param_to_cc()
}

#[tauri::command]
fn set_mapping(cc: u8, param_id: String, state: State<'_, SharedState>) {
    state.lock().mapper.set_mapping(cc, param_id);
}

#[tauri::command]
fn start_midi_learn(param_id: String, state: State<'_, SharedState>) {
    state.lock().learn_target = Some(param_id);
}

#[tauri::command]
fn list_midi_ports(state: State<'_, SharedState>) -> Vec<String> {
    let ports = list_input_ports();
    state.lock().port_names = ports.clone();
    ports
}

#[tauri::command]
fn select_midi_port(index: usize, app: tauri::AppHandle, state: State<'_, SharedState>) {
    state.lock().active_port = index;
    start_midi_thread(app, state.inner().clone(), index);
}

#[tauri::command]
fn virtual_output_name(state: State<'_, SharedState>) -> Option<String> {
    if state.lock().virtual_port_active {
        Some("Haptic Console".to_string())
    } else {
        None
    }
}

// ── Entry point ───────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shared: SharedState = Arc::new(Mutex::new(AppState::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .manage(shared.clone())
        .invoke_handler(tauri::generate_handler![
            get_mappings,
            set_mapping,
            start_midi_learn,
            list_midi_ports,
            select_midi_port,
            virtual_output_name,
        ])
        .setup(move |app| {
            let ports = list_input_ports();
            if !ports.is_empty() {
                start_midi_thread(app.handle().clone(), shared.clone(), 0);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error running Haptic Console");
}
