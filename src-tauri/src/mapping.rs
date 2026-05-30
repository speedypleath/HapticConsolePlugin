use std::collections::HashMap;

pub struct MidiMapper {
    map: HashMap<u8, String>,
}

impl MidiMapper {
    pub fn new() -> Self {
        let mut map = HashMap::new();
        let defaults: &[(u8, &str)] = &[
            (1,  "flywheel_velocity"),
            (2,  "flywheel_direction"),
            (3,  "pneumatic_pressure"),
            (4,  "spring_tension"),
            (5,  "spring_acoustic"),
            (6,  "lean_total"),
            (7,  "lean_balance"),
            (8,  "matrix_centroid_x"),
            (9,  "matrix_centroid_y"),
            (10, "matrix_pressure"),
            (11, "joystick_1_x"),
            (12, "joystick_1_y"),
            (13, "joystick_2_x"),
            (14, "joystick_2_y"),
        ];
        for &(cc, id) in defaults {
            map.insert(cc, id.to_string());
        }
        Self { map }
    }

    pub fn param_for_cc(&self, cc: u8) -> Option<&str> {
        self.map.get(&cc).map(String::as_str)
    }

    pub fn set_mapping(&mut self, cc: u8, param_id: String) {
        self.map.insert(cc, param_id);
    }

    // Returns inverted map: param_id → cc, for UI display
    pub fn param_to_cc(&self) -> HashMap<String, u8> {
        self.map.iter().map(|(&cc, id)| (id.clone(), cc)).collect()
    }
}
