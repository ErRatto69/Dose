import { create } from 'zustand';
import type { VolumeUnit } from '@/types';

interface PreferencesState {
    preferredUnit: VolumeUnit;
    toggleUnit: () => void;
    setUnit: (unit: VolumeUnit) => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
    preferredUnit: (localStorage.getItem('dose_unit') as VolumeUnit) || 'cl',

    toggleUnit: () =>
        set((state) => {
            const nextUnit: VolumeUnit = state.preferredUnit === 'cl' ? 'oz' : 'cl';
            localStorage.setItem('dose_unit', nextUnit);
            return { preferredUnit: nextUnit };
        }),

    setUnit: (unit: VolumeUnit) => {
        localStorage.setItem('dose_unit', unit);
        set({ preferredUnit: unit });
    },
}));