import { paramValues, isOnline, ParamId } from './params';

export function setupBridge(): void {
    window.haptic = {
        onParamChange(paramId, value) {
            const sig = paramValues[paramId as ParamId];
            if (sig) {
                sig.value = value;
                isOnline.value = true;
            }
        },
    };
}

// Calls the native function registered with withNativeFunction("setMapping", …) in PluginEditor.cpp.
// No-ops gracefully when running outside the WebView.
export let setMapping: (cc: number, paramId: string) => Promise<unknown> = () => Promise.resolve();

if (typeof window.__JUCE__ !== 'undefined') {
    const pending = new Map<number, { resolve: (v: unknown) => void }>();
    let nextId = 0;

    window.__JUCE__.backend.addEventListener('__juce__complete', (data) => {
        const { promiseId, result } = data as { promiseId: number; result: unknown };
        pending.get(promiseId)?.resolve(result);
        pending.delete(promiseId);
    });

    setMapping = (cc, paramId) => {
        const id = nextId++;
        const promise = new Promise<unknown>(resolve => pending.set(id, { resolve }));
        window.__JUCE__!.backend.emitEvent('__juce__invoke', {
            name: 'setMapping', params: [cc, paramId], resultId: id,
        });
        return promise;
    };
}
