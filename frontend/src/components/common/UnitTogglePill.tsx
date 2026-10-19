import React from 'react';
import { usePreferencesStore } from '@/store/usePreferencesStore';

export const UnitTogglePill: React.FC = () => {
    const { preferredUnit, toggleUnit } = usePreferencesStore();

    return (
        <button
            type="button"
            onClick={toggleUnit}
            className="flex items-center bg-neutral-900 border border-neutral-800 rounded-full p-1 text-xs font-bold transition-all active:scale-95"
            aria-label={`Toggle unit: currently ${preferredUnit}`}
        >
            <span
                className={`px-2.5 py-1 rounded-full transition-all ${
                    preferredUnit === 'cl'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                }`}
            >
                cl
            </span>
            <span
                className={`px-2.5 py-1 rounded-full transition-all ${
                    preferredUnit === 'oz'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                }`}
            >
                oz
            </span>
        </button>
    );
};