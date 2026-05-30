declare global {
    interface Window {
        haptic: {
            onParamChange: (paramId: string, value: number) => void;
            onMidiLearnComplete: (paramId: string, cc: number) => void;
        };
        __JUCE__?: {
            backend: {
                addEventListener: (event: string, cb: (data: unknown) => void) => void;
                emitEvent: (event: string, data: unknown) => void;
            };
        };
    }
}

export {};
