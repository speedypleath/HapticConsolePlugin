// Integration tests for the full MIDI → routing → event pipeline.
//
// These tests exercise process_message(), which is the pure core of the MIDI
// handler. They cover the same path a real message takes from the Teensy up to
// the point where events would be emitted to the UI — without needing a running
// Tauri window or WebView.

use crate::midi::{process_message, AppState, MidiEvent};

fn make_cc(cc: u8, value: u8) -> [u8; 3] {
    [0xB0, cc, value]
}

// ── Routing ───────────────────────────────────────────────────────────────────

#[test]
fn cc1_routes_to_flywheel_velocity() {
    let mut state = AppState::new();
    let events = process_message(&make_cc(1, 64), &mut state);
    assert_eq!(events.len(), 1);
    assert!(matches!(
        &events[0],
        MidiEvent::ParamChange { param_id, .. } if param_id == "flywheel_velocity"
    ));
}

#[test]
fn value_is_normalised_correctly() {
    let mut state = AppState::new();

    let events = process_message(&make_cc(1, 127), &mut state);
    let MidiEvent::ParamChange { value, .. } = &events[0] else {
        panic!()
    };
    assert_eq!(*value, 1.0);

    let events = process_message(&make_cc(1, 0), &mut state);
    let MidiEvent::ParamChange { value, .. } = &events[0] else {
        panic!()
    };
    assert_eq!(*value, 0.0);
}

#[test]
fn unmapped_cc_produces_no_events() {
    let mut state = AppState::new();
    let events = process_message(&make_cc(99, 64), &mut state);
    assert!(events.is_empty());
}

#[test]
fn non_cc_message_produces_no_events() {
    let mut state = AppState::new();
    // Note-on
    let events = process_message(&[0x90, 60, 80], &mut state);
    assert!(events.is_empty());
}

// ── MIDI learn ────────────────────────────────────────────────────────────────

#[test]
fn learn_binds_next_cc_and_emits_both_events() {
    let mut state = AppState::new();
    state.learn_target = Some("spring_tension".to_string());

    let events = process_message(&make_cc(42, 80), &mut state);

    assert_eq!(events.len(), 2);
    assert!(matches!(
        &events[0],
        MidiEvent::LearnComplete { param_id, cc: 42 } if param_id == "spring_tension"
    ));
    assert!(matches!(
        &events[1],
        MidiEvent::ParamChange { param_id, .. } if param_id == "spring_tension"
    ));
}

#[test]
fn learn_clears_old_mapping_for_same_param() {
    let mut state = AppState::new();
    state.learn_target = Some("flywheel_velocity".to_string());

    // Remap "flywheel_velocity" from CC 1 to CC 50
    process_message(&make_cc(50, 0), &mut state);

    // Old CC 1 should no longer route to anything
    let events = process_message(&make_cc(1, 64), &mut state);
    assert!(events.is_empty(), "old CC should be evicted after learn");

    // New CC 50 should route correctly
    let events = process_message(&make_cc(50, 64), &mut state);
    assert!(matches!(
        &events[0],
        MidiEvent::ParamChange { param_id, .. } if param_id == "flywheel_velocity"
    ));
}

#[test]
fn learn_is_consumed_after_one_message() {
    let mut state = AppState::new();
    state.learn_target = Some("pneumatic_pressure".to_string());

    process_message(&make_cc(99, 0), &mut state);

    // learn_target should be None — a second message must not trigger learn again
    assert!(state.learn_target.is_none());
}

// ── All 14 default parameters ─────────────────────────────────────────────────

#[test]
fn all_default_params_route() {
    let defaults: &[(u8, &str)] = &[
        (1, "flywheel_velocity"),
        (2, "flywheel_direction"),
        (3, "pneumatic_pressure"),
        (4, "spring_tension"),
        (5, "spring_acoustic"),
        (6, "lean_total"),
        (7, "lean_balance"),
        (8, "matrix_centroid_x"),
        (9, "matrix_centroid_y"),
        (10, "matrix_pressure"),
        (11, "joystick_1_x"),
        (12, "joystick_1_y"),
        (13, "joystick_2_x"),
        (14, "joystick_2_y"),
    ];

    let mut state = AppState::new();

    for &(cc, expected_param) in defaults {
        let events = process_message(&make_cc(cc, 64), &mut state);
        assert_eq!(events.len(), 1, "CC {cc} should produce exactly one event");
        assert!(
            matches!(&events[0], MidiEvent::ParamChange { param_id, .. } if param_id == expected_param),
            "CC {cc} should route to {expected_param}"
        );
    }
}
