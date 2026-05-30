import { invoke } from '@tauri-apps/api/core';
import { listen }  from '@tauri-apps/api/event';
import { paramValues, isOnline, ParamId } from './params';
import { ccMap, learnTarget } from './settings';

export async function setupBridge(): Promise<void> {
    await listen<{ paramId: string; value: number }>('param-change', ({ payload }) => {
        const sig = paramValues[payload.paramId as ParamId];
        if (sig) {
            sig.value = payload.value;
            isOnline.value = true;
        }
    });

    await listen<{ paramId: string; cc: number }>('midi-learn-complete', ({ payload }) => {
        ccMap.value = { ...ccMap.value, [payload.paramId]: payload.cc };
        learnTarget.value = null;
    });
}

export const getMappings       = ()                             => invoke<Record<string, number>>('get_mappings');
export const setMapping        = (cc: number, paramId: string)  => invoke('set_mapping',        { cc, paramId });
export const startMidiLearn    = (paramId: string)              => invoke('start_midi_learn',   { paramId });
export const listMidiPorts     = ()                             => invoke<string[]>('list_midi_ports');
export const selectMidiPort    = (index: number)                => invoke('select_midi_port',   { index });
export const virtualOutputName = ()                             => invoke<string | null>('virtual_output_name');

export interface OscConfig {
    host:      string;
    port:      number;
    addresses: Record<string, string>;
}

export const getOscConfig   = ()                                          => invoke<OscConfig>('get_osc_config');
export const setOscHost     = (host: string)                              => invoke('set_osc_host',    { host });
export const setOscPort     = (port: number)                              => invoke('set_osc_port',    { port });
export const setOscAddress  = (paramId: string, address: string)          => invoke('set_osc_address', { paramId, address });
