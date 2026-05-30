use std::collections::HashMap;
use std::net::UdpSocket;

pub struct OscConfig {
    pub host: String,
    pub port: u16,
    pub addresses: HashMap<String, String>,
}

impl OscConfig {
    pub fn new(param_ids: impl IntoIterator<Item = String>) -> Self {
        let addresses = param_ids
            .into_iter()
            .map(|id| {
                let addr = format!("/haptic/{id}");
                (id, addr)
            })
            .collect();
        Self {
            host: "127.0.0.1".to_string(),
            port: 8000,
            addresses,
        }
    }

    pub fn address_for(&self, param_id: &str) -> String {
        self.addresses
            .get(param_id)
            .cloned()
            .unwrap_or_else(|| format!("/haptic/{param_id}"))
    }
}

/// Send a single float value for `param_id` to the configured target.
pub fn send_param(host: &str, port: u16, address: &str, value: f64) {
    let packet = build_osc_float(address, value as f32);
    let target = format!("{host}:{port}");
    if let Ok(sock) = UdpSocket::bind("0.0.0.0:0") {
        let _ = sock.send_to(&packet, target);
    }
}

/// Builds a minimal OSC 1.0 message carrying a single float argument.
///
/// Wire format:
///   [address\0 padded to 4 bytes] [",f\0\0"] [f32 big-endian]
fn build_osc_float(address: &str, value: f32) -> Vec<u8> {
    let mut buf = Vec::new();

    buf.extend_from_slice(address.as_bytes());
    buf.push(0);
    while buf.len() % 4 != 0 {
        buf.push(0);
    }

    buf.extend_from_slice(b",f\0\0");

    buf.extend_from_slice(&value.to_be_bytes());
    buf
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn packet_address_is_null_padded_to_4_bytes() {
        // "/a" → 2 bytes + null → 3 bytes → pad to 4
        let p = build_osc_float("/a", 0.0);
        assert_eq!(p[0..4], *b"/a\0\0");
    }

    #[test]
    fn packet_contains_type_tag() {
        let p = build_osc_float("/x", 0.0);
        // address "/x\0\0" = 4 bytes, then type tag
        assert_eq!(&p[4..8], b",f\0\0");
    }

    #[test]
    fn packet_encodes_value_big_endian() {
        let p = build_osc_float("/x", 1.0_f32);
        // address 4 bytes, type tag 4 bytes, then value
        let v = f32::from_be_bytes(p[8..12].try_into().unwrap());
        assert_eq!(v, 1.0);
    }

    #[test]
    fn default_address_uses_haptic_prefix() {
        let config = OscConfig::new(["flywheel_velocity".to_string()]);
        assert_eq!(
            config.address_for("flywheel_velocity"),
            "/haptic/flywheel_velocity"
        );
    }

    #[test]
    fn custom_address_overrides_default() {
        let mut config = OscConfig::new(["flywheel_velocity".to_string()]);
        config
            .addresses
            .insert("flywheel_velocity".to_string(), "/my/custom".to_string());
        assert_eq!(config.address_for("flywheel_velocity"), "/my/custom");
    }
}
