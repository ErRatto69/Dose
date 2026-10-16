import React from 'react';
import type { BacSafetyLevel } from '@/types';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface SafetyBannerProps {
    bacGramsPerLiter: number;
    safetyLevel: BacSafetyLevel;
}

export const SafetyBanner: React.FC<SafetyBannerProps> = ({ bacGramsPerLiter, safetyLevel }) => {
    if (safetyLevel === 'Sober' || safetyLevel === 'Safe') {
        return null;
    }

    const isCritical = safetyLevel === 'Warning' || safetyLevel === 'Critical';

    return (
        <aside
            className={`sticky top-16 z-30 px-4 py-2.5 flex items-center justify-between shadow-lg border-b text-xs font-medium ${
                isCritical
                    ? 'bg-rose-950/90 border-rose-800 text-rose-200'
                    : 'bg-amber-950/90 border-amber-800 text-amber-200'
            }`}
            aria-label="Safety Alert"
        >
            <div className="flex items-center gap-2">
                {isCritical ? (
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>
          BAC at <strong className="font-bold">{bacGramsPerLiter.toFixed(2)} g/L</strong>. Do NOT drive. Drink water and assign a driver.
        </span>
            </div>
        </aside>
    );
};