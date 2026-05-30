use crate::midi::parse_cc;

#[test]
fn cc_ch1_parsed() {
    let (cc, value) = parse_cc(&[0xB0, 7, 64]).unwrap();
    assert_eq!(cc, 7);
    assert!((value - 64.0 / 127.0).abs() < f64::EPSILON);
}

#[test]
fn cc_any_channel_accepted() {
    // Channel 3 (0xB2) should pass the filter.
    assert!(parse_cc(&[0xB2, 1, 127]).is_some());
}

#[test]
fn note_on_ignored() {
    assert!(parse_cc(&[0x90, 60, 80]).is_none());
}

#[test]
fn pitch_bend_ignored() {
    assert!(parse_cc(&[0xE0, 0x00, 0x40]).is_none());
}

#[test]
fn short_message_ignored() {
    assert!(parse_cc(&[0xB0, 1]).is_none());
    assert!(parse_cc(&[]).is_none());
}

#[test]
fn value_min() {
    assert_eq!(parse_cc(&[0xB0, 1, 0]).unwrap().1, 0.0);
}

#[test]
fn value_max() {
    assert_eq!(parse_cc(&[0xB0, 1, 127]).unwrap().1, 1.0);
}

#[test]
fn value_midpoint() {
    let (_, v) = parse_cc(&[0xB0, 1, 64]).unwrap();
    assert!((v - 64.0 / 127.0).abs() < f64::EPSILON);
}
