import { paramValues, isOnline, ParamId } from './params';
import { ccMap, learnTarget } from './settings';

export function setupBridge(): void {
    window.haptic = {
        onParamChange(paramId, value) {
            const sig = paramValues[paramId as ParamId];
            if (sig) {
                sig.value = value;
                isOnline.value = true;
            }
        },
        onMidiLearnComplete(paramId, cc) {
            ccMap.value = { ...ccMap.value, [paramId]: cc };
            learnTarget.value = null;
        },
    };
}

// ── Bridge factory ───────────────────────────────────────────────────────────

type BridgeFn = (name: string, params: unknown[]) => Promise<unknown>;

let call: BridgeFn = (_name, _params) => Promise.resolve();

if (typeof window.__JUCE__ !== 'undefined') {
    const pending = new Map<number, (v: unknown) => void>();
    let nextId = 0;

    window.__JUCE__.backend.addEventListener('__juce__complete', (data) => {
        const { promiseId, result } = data as { promiseId: number; result: unknown };
        pending.get(promiseId)?.(result);
        pending.delete(promiseId);
    });

    call = (name, params) => {
        const id = nextId++;
        const promise = new Promise<unknown>(resolve => pending.set(id, resolve));
        window.__JUCE__!.backend.emitEvent('__juce__invoke', { name, params, resultId: id });
        return promise;
    };
}

export const setMapping    = (cc: number, paramId: string)           => call('setMapping',    [cc, paramId]);
export const getMappings   = ()                                       => call('getMappings',   []);
export const startMidiLearn= (paramId: string)                       => call('startMidiLearn',[paramId]);
export const setOscMapping = (address: string, paramId: string)      => call('setOscMapping', [address, paramId]);
export const setOscPort    = (port: number)                          => call('setOscPort',    [port]);
