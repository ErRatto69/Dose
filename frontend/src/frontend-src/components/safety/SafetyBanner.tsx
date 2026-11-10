import React from 'react';
import type { BacSafetyLevel } from '@/types';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface SafetyBannerProps {
    bacGramsPerLiter: number;
    safetyLevel: BacSafetyLevel | number;
}

export const SafetyBanner: React.FC<SafetyBannerProps> = ({ bacGramsPerLiter, safetyLevel }) => {
    const normalizedLevel = String(safetyLevel);

    // Hide completely when sober, safe, or below the 0.50 g/L caution threshold
    if (
        bacGramsPerLiter < 0.5 ||
        normalizedLevel === 'Sober' ||
        normalizedLevel === 'Safe' ||
        normalizedLevel === '0' ||
        normalizedLevel === '1'
    ) {
        return null;
    }

    const isCritical =
        normalizedLevel === 'Warning' ||
        normalizedLevel === 'Critical' ||
        normalizedLevel === '3' ||
        normalizedLevel === '4' ||
        bacGramsPerLiter >= 0.8;

    return (
        <aside
            className={`sticky top-16 z-30 px-4 py-2.5 flex items-center justify-center shadow-lg border-b text-xs font-medium ${
                isCritical
                    ? 'bg-rose-950/95 border-rose-800 text-rose-200'
                    : 'bg-amber-950/95 border-amber-800 text-amber-200'
            }`}
            aria-label="Safety Alert"
        >
            <div className="max-w-7xl w-full flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    {isCritical ? (
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>
                        BAC at <strong className="font-bold">{bacGramsPerLiter.toFixed(2)} g/L</strong>. Do NOT drive. Drink water and assign a designated driver.
                    </span>
                </div>
            </div>
        </aside>
    );
};