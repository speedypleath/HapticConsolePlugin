import { signal } from '@preact/signals';

export const PARAM_META = [
    { id: 'flywheel_velocity',  label: 'FW Vel',  bipolar: false },
    { id: 'flywheel_direction', label: 'FW Dir',  bipolar: false },
    { id: 'pneumatic_pressure', label: 'Pneum',   bipolar: false },
    { id: 'spring_tension',     label: 'Sp Ten',  bipolar: false },
    { id: 'spring_acoustic',    label: 'Sp Ac',   bipolar: false },
    { id: 'lean_total',         label: 'Lean',    bipolar: true  },
    { id: 'lean_balance',       label: 'L Bal',   bipolar: true  },
    { id: 'matrix_centroid_x',  label: 'Mx X',    bipolar: false },
    { id: 'matrix_centroid_y',  label: 'Mx Y',    bipolar: false },
    { id: 'matrix_pressure',    label: 'Mx P',    bipolar: false },
    { id: 'joystick_1_x',       label: 'J1 X',    bipolar: false },
    { id: 'joystick_1_y',       label: 'J1 Y',    bipolar: false },
    { id: 'joystick_2_x',       label: 'J2 X',    bipolar: false },
    { id: 'joystick_2_y',       label: 'J2 Y',    bipolar: false },
] as const;

export type ParamId = typeof PARAM_META[number]['id'];

export const paramValues = Object.fromEntries(
    PARAM_META.map(p => [p.id, signal(0)])
) as Record<ParamId, ReturnType<typeof signal<number>>>;

export const isOnline = signal(false);
