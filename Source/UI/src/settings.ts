import { signal } from '@preact/signals';

export const ccMap        = signal<Record<string, number>>({});
export const oscAddresses = signal<Record<string, string>>({});
export const oscPort      = signal(8000);
export const learnTarget  = signal<string | null>(null);
