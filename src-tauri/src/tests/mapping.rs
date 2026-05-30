use crate::mapping::MidiMapper;

#[test]
fn default_map_has_all_14_params() {
    let m = MidiMapper::new();
    assert_eq!(m.param_to_cc().len(), 14);
}

#[test]
fn default_cc_assignments() {
    let m = MidiMapper::new();
    assert_eq!(m.param_for_cc(1), Some("flywheel_velocity"));
    assert_eq!(m.param_for_cc(7), Some("lean_balance"));
    assert_eq!(m.param_for_cc(14), Some("joystick_2_y"));
}

#[test]
fn unknown_cc_returns_none() {
    let m = MidiMapper::new();
    assert!(m.param_for_cc(99).is_none());
}

#[test]
fn set_mapping_adds_entry() {
    let mut m = MidiMapper::new();
    m.set_mapping(20, "flywheel_velocity".to_string());
    assert_eq!(m.param_for_cc(20), Some("flywheel_velocity"));
}

#[test]
fn set_mapping_overwrites_existing_cc() {
    let mut m = MidiMapper::new();
    m.set_mapping(1, "spring_tension".to_string());
    assert_eq!(m.param_for_cc(1), Some("spring_tension"));
}

#[test]
fn set_mapping_evicts_old_cc_for_same_param() {
    let mut m = MidiMapper::new();
    // "pneumatic_pressure" starts on CC 3; remap to CC 42.
    m.set_mapping(42, "pneumatic_pressure".to_string());
    assert!(m.param_for_cc(3).is_none(), "old CC should be evicted");
    assert_eq!(m.param_for_cc(42), Some("pneumatic_pressure"));
}

#[test]
fn param_to_cc_inverts_map() {
    let m = MidiMapper::new();
    let inv = m.param_to_cc();
    assert_eq!(inv.get("flywheel_velocity"), Some(&1u8));
    assert_eq!(inv.get("joystick_2_y"), Some(&14u8));
}

#[test]
fn param_to_cc_reflects_custom_mapping() {
    let mut m = MidiMapper::new();
    m.set_mapping(42, "pneumatic_pressure".to_string());
    let inv = m.param_to_cc();
    assert_eq!(inv.get("pneumatic_pressure"), Some(&42u8));
}
