import React from 'react';
import { usePreferencesStore } from '@/store/usePreferencesStore';

export const UnitTogglePill: React.FC = () => {
    const { preferredUnit, toggleUnit } = usePreferencesStore();

    return (
        <button
            type="button"
            onClick={toggleUnit}
            className="flex items-center bg-slate-900 border border-slate-700/80 rounded-full p-1 text-xs font-bold transition-all active:scale-95"
            aria-label={`Toggle unit: currently ${preferredUnit}`}
        >
      <span
          className={`px-2.5 py-1 rounded-full transition-all ${
              preferredUnit === 'cl'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
          }`}
      >
        cl
      </span>
            <span
                className={`px-2.5 py-1 rounded-full transition-all ${
                    preferredUnit === 'oz'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                }`}
            >
        oz
      </span>
        </button>
    );
};