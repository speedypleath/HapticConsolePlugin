import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { PARAM_META } from '../params';
import { ccMap, learnTarget } from '../settings';
import { getMappings, setMapping, startMidiLearn, listMidiPorts, selectMidiPort } from '../bridge';

type Tab = 'midi' | 'daw';
const activeTab  = signal<Tab>('midi');
const portNames  = signal<string[]>([]);
const activePort = signal<number>(0);

export function Settings() {
    useEffect(() => {
        getMappings().then(data => {
            ccMap.value = data as Record<string, number>;
        });
        listMidiPorts().then(ports => {
            portNames.value = ports;
        });
    }, []);

    return (
        <div id="settings">
            <div class="settings-tabs">
                {(['midi', 'daw'] as Tab[]).map(tab => (
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
                {activeTab.value === 'daw'  && <DawTab />}
            </div>
        </div>
    );
}

// ── MIDI tab ──────────────────────────────────────────────────────────────────

function MidiTab() {
    function handlePort(e: Event) {
        const idx = parseInt((e.target as HTMLSelectElement).value, 10);
        activePort.value = idx;
        selectMidiPort(idx);
    }

    return (
        <div class="midi-tab">
            {portNames.value.length > 0 && (
                <div class="osc-port-row">
                    <span class="field-label">MIDI INPUT</span>
                    <select class="port-select" value={activePort.value} onChange={handlePort}>
                        {portNames.value.map((name, i) => (
                            <option key={i} value={i}>{name}</option>
                        ))}
                    </select>
                </div>
            )}
            {portNames.value.length === 0 && (
                <p class="daw-info">No MIDI input ports found. Connect your device and reopen settings.</p>
            )}
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
        </div>
    );
}

function MidiRow({ id, label }: { id: string; label: string }) {
    const cc         = ccMap.value[id] ?? null;
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

// ── DAW tab ───────────────────────────────────────────────────────────────────

function DawTab() {
    return (
        <div class="daw-tab">
            <p class="daw-info">
                A virtual MIDI port named <code class="param-id">Haptic Console</code> is
                created automatically. Point your DAW to this port to receive remapped CCs.
            </p>
            <table class="map-table">
                <thead>
                    <tr>
                        <th>Parameter</th>
                        <th>Default CC</th>
                        <th>Range</th>
                    </tr>
                </thead>
                <tbody>
                    {PARAM_META.map(p => (
                        <tr key={p.id}>
                            <td class="col-param">{p.label}</td>
                            <td><code class="param-id">{ccMap.value[p.id] ?? '—'}</code></td>
                            <td class="col-range">{p.bipolar ? '−1 → +1' : '0 → 1'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
