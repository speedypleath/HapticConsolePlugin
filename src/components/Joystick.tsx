import type { Signal } from '@preact/signals';

interface Props {
    label:  string;
    x:      Signal<number>;
    y:      Signal<number>;
}

export function Joystick({ label, x, y }: Props) {
    const left = `${x.value * 100}%`;
    const top  = `${y.value * 100}%`;

    return (
        <div class="module">
            <div class="module-label">{label}</div>
            <div class="joy-pad">
                <div class="joy-crosshair" />
                <div class="joy-thumb" style={{ left, top }} />
            </div>
            <div class="joy-vals">
                <div class="stat">
                    <div class="stat-label">X</div>
                    <div class="stat-value">{x.value.toFixed(3)}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Y</div>
                    <div class="stat-value">{y.value.toFixed(3)}</div>
                </div>
            </div>
        </div>
    );
}
