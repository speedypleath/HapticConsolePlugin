import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { PARAM_META } from '../params';
import { ccMap, learnTarget } from '../settings';
import {
    getMappings, setMapping, startMidiLearn, listMidiPorts, selectMidiPort, virtualOutputName,
    getOscConfig, setOscHost, setOscPort, setOscAddress, OscConfig,
} from '../bridge';

type Tab = 'midi' | 'osc' | 'daw';
const activeTab  = signal<Tab>('midi');
const portNames  = signal<string[]>([]);
const activePort = signal<number>(0);
const outputPort = signal<string | null>(null);
const oscConfig  = signal<OscConfig>({ host: '127.0.0.1', port: 8000, addresses: {} });

export function Settings() {
    useEffect(() => {
        getMappings().then(data => { ccMap.value = data as Record<string, number>; });
        listMidiPorts().then(ports => { portNames.value = ports; });
        virtualOutputName().then(name => { outputPort.value = name; });
        getOscConfig().then(cfg => { oscConfig.value = cfg; });
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
            <div class="osc-port-row">
                <span class="field-label">MIDI OUTPUT</span>
                <span class={`port-status${outputPort.value ? ' active' : ''}`}>
                    {outputPort.value ?? 'unavailable'}
                </span>
            </div>
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

// ── OSC tab ───────────────────────────────────────────────────────────────────

function OscTab() {
    function handleHost(e: Event) {
        const host = (e.target as HTMLInputElement).value.trim();
        if (!host) return;
        setOscHost(host);
        oscConfig.value = { ...oscConfig.value, host };
    }

    function handlePort(e: Event) {
        const port = parseInt((e.target as HTMLInputElement).value, 10);
        if (isNaN(port) || port < 1 || port > 65535) return;
        setOscPort(port);
        oscConfig.value = { ...oscConfig.value, port };
    }

    return (
        <div class="osc-tab">
            <div class="osc-port-row">
                <span class="field-label">HOST</span>
                <input
                    class="addr-input"
                    value={oscConfig.value.host}
                    onBlur={handleHost}
                    placeholder="127.0.0.1"
                />
            </div>
            <div class="osc-port-row">
                <span class="field-label">PORT</span>
                <input
                    type="number"
                    class="cc-input"
                    style="width:5rem"
                    min={1} max={65535}
                    value={oscConfig.value.port}
                    onBlur={handlePort}
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
                    {PARAM_META.map(p => (
                        <OscRow
                            key={p.id}
                            id={p.id}
                            label={p.label}
                            address={oscConfig.value.addresses[p.id] ?? `/haptic/${p.id}`}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function OscRow({ id, label, address }: { id: string; label: string; address: string }) {
    function handleAddress(e: Event) {
        const addr = (e.target as HTMLInputElement).value.trim();
        if (!addr) return;
        setOscAddress(id, addr);
        oscConfig.value = { ...oscConfig.value, addresses: { ...oscConfig.value.addresses, [id]: addr } };
    }

    return (
        <tr>
            <td class="col-param">{label}</td>
            <td>
                <input
                    class="addr-input"
                    value={address}
                    onBlur={handleAddress}
                />
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
                        <th>CC</th>
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
