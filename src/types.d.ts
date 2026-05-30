declare global {
    interface Window {
        haptic: {
            onParamChange: (paramId: string, value: number) => void;
            onMidiLearnComplete: (paramId: string, cc: number) => void;
        };
    }
}

export {};
