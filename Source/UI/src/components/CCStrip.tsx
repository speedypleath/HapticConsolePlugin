import { PARAM_META, paramValues } from '../params';

interface CellProps {
    id:      string;
    label:   string;
    bipolar: boolean;
}

function CCCell({ id, label, bipolar }: CellProps) {
    const sig   = paramValues[id as keyof typeof paramValues];
    const value = sig.value;
    const norm  = bipolar ? (value + 1) / 2 : Math.max(0, value);
    const height = `${norm * 100}%`;

    return (
        <div class="cc-cell">
            <div class="cc-bar-wrap">
                <div class="cc-bar" style={{ height }} />
            </div>
            <div class="cc-val">{value.toFixed(3)}</div>
            <div class="cc-name">{label}</div>
        </div>
    );
}

export function CCStrip() {
    return (
        <div id="cc-strip">
            {PARAM_META.map(p => (
                <CCCell key={p.id} id={p.id} label={p.label} bipolar={p.bipolar} />
            ))}
        </div>
    );
}
