import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { PARAM_META } from '../params';
import { ccMap, oscAddresses, oscPort, learnTarget } from '../settings';
import { getMappings, setMapping, startMidiLearn, setOscMapping, setOscPort } from '../bridge';

type Tab = 'midi' | 'osc' | 'daw';
const activeTab = signal<Tab>('midi');

export function Settings() {
    useEffect(() => {
        getMappings().then(data => {
            if (!data || typeof data !== 'object') return;
            const d = data as Record<string, unknown>;

            const midi = (d.midi ?? {}) as Record<string, string>;
            const inv: Record<string, number> = {};
            for (const [cc, pid] of Object.entries(midi))
                inv[pid] = parseInt(cc, 10);
            ccMap.value = inv;

            const osc = (d.osc ?? {}) as { port?: number; addresses?: Record<string, string> };
            oscPort.value = osc.port ?? 8000;
            const addrs: Record<string, string> = {};
            for (const [addr, pid] of Object.entries(osc.addresses ?? {}))
                addrs[pid] = addr;
            oscAddresses.value = addrs;
        });
    }, []);

    return (
        <div id="settings">
            <div class="settings-tabs">
                {(['midi', 'osc', 'daw'] as Tab[]).map(tab => (
                    <button
                        key={tab}
                        class={`tab-btn${activeTab.value === tab ? ' active' : ''}`}
                        onClick={() => { activeTab.value = tab; }}
                    >
                        {tab.toUpperCase()}
                    </button>
                ))}
            </div>
            <div class="settings-content">
                {activeTab.value === 'midi' && <MidiTab />}
                {activeTab.value === 'osc'  && <OscTab />}
                {activeTab.value === 'daw'  && <DawTab />}
            </div>
        </div>
    );
}

// ── MIDI tab ─────────────────────────────────────────────────────────────────

function MidiTab() {
    return (
        <table class="map-table">
            <thead>
                <tr>
                    <th>Parameter</th>
                    <th>CC</th>
                    <th>Learn</th>
                </tr>
            </thead>
            <tbody>
                {PARAM_META.map(p => <MidiRow key={p.id} id={p.id} label={p.label} />)}
            </tbody>
        </table>
    );
}

function MidiRow({ id, label }: { id: string; label: string }) {
    const cc = ccMap.value[id] ?? null;
    const isLearning = learnTarget.value === id;

    function handleCC(e: Event) {
        const val = parseInt((e.target as HTMLInputElement).value, 10);
        if (isNaN(val) || val < 0 || val > 127) return;
        setMapping(val, id);
        ccMap.value = { ...ccMap.value, [id]: val };
    }

    function handleLearn() {
        if (isLearning) { learnTarget.value = null; return; }
        learnTarget.value = id;
        startMidiLearn(id);
    }

    return (
        <tr class={isLearning ? 'learning' : ''}>
            <td class="col-param">{label}</td>
            <td class="col-cc">
                <input
                    type="number"
                    class="cc-input"
                    min={0} max={127}
                    value={cc ?? ''}
                    placeholder="--"
                    onChange={handleCC}
                />
            </td>
            <td class="col-learn">
                <button class={`learn-btn${isLearning ? ' active' : ''}`} onClick={handleLearn}>
                    {isLearning ? 'WAIT…' : 'LEARN'}
                </button>
            </td>
        </tr>
    );
}

// ── OSC tab ──────────────────────────────────────────────────────────────────

function OscTab() {
    function handlePort(e: Event) {
        const val = parseInt((e.target as HTMLInputElement).value, 10);
        if (isNaN(val)) return;
        setOscPort(val);
        oscPort.value = val;
    }

    return (
        <div class="osc-tab">
            <div class="osc-port-row">
                <span class="field-label">UDP PORT</span>
                <input
                    type="number"
                    class="cc-input"
                    min={1024} max={65535}
                    value={oscPort.value}
                    onChange={handlePort}
                />
            </div>
            <table class="map-table">
                <thead>
                    <tr>
                        <th>Parameter</th>
                        <th>OSC Address</th>
                    </tr>
                </thead>
                <tbody>
                    {PARAM_META.map(p => <OscRow key={p.id} id={p.id} label={p.label} />)}
                </tbody>
            </table>
        </div>
    );
}

function OscRow({ id, label }: { id: string; label: string }) {
    const addr = oscAddresses.value[id] ?? `/haptic/${id}`;

    function handleChange(e: Event) {
        const val = (e.target as HTMLInputElement).value;
        setOscMapping(val, id);
        oscAddresses.value = { ...oscAddresses.value, [id]: val };
    }

    return (
        <tr>
            <td class="col-param">{label}</td>
            <td>
                <input
                    type="text"
                    class="addr-input"
                    value={addr}
                    onChange={handleChange}
                />
            </td>
        </tr>
    );
}

// ── DAW tab ──────────────────────────────────────────────────────────────────

function DawTab() {
    return (
        <div class="daw-tab">
            <p class="daw-info">
                Parameters appear automatically as DAW automation lanes.
                Use the IDs below to address them.
            </p>
            <table class="map-table">
                <thead>
                    <tr>
                        <th>Parameter</th>
                        <th>Automation ID</th>
                        <th>Range</th>
                    </tr>
                </thead>
                <tbody>
                    {PARAM_META.map(p => (
                        <tr key={p.id}>
                            <td class="col-param">{p.label}</td>
                            <td><code class="param-id">{p.id}</code></td>
                            <td class="col-range">{p.bipolar ? '−1 → +1' : '0 → 1'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
