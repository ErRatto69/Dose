import React from 'react';
import { Link } from 'react-router-dom';
import type { BacSafetyLevel } from '@/types';
import { AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';

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
            role="status"
            aria-live="polite"
            aria-label="Blood alcohol safety alert"
            className={`sticky top-16 z-30 px-4 py-2.5 border-b text-xs font-medium ${
                isCritical
                    ? 'bg-red-950/95 border-red-700/70 text-red-100'
                    : 'bg-amber-950/95 border-amber-700/60 text-amber-100'
            }`}
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    {isCritical ? (
                        <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
                    ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                    )}
                    <span className="leading-snug">
                        BAC at{' '}
                        <strong className="font-extrabold tabular-nums">
                            {bacGramsPerLiter.toFixed(2)} g/L
                        </strong>
                        . Do not drive — hydrate and assign a designated driver.
                    </span>
                </div>

                <Link
                    to="/bac"
                    className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border dose-press ${
                        isCritical
                            ? 'bg-red-900/60 border-red-500/40 text-red-100 hover:bg-red-900'
                            : 'bg-amber-900/50 border-amber-500/40 text-amber-100 hover:bg-amber-900'
                    }`}
                >
                    <span>Telemetry</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </Link>
            </div>
        </aside>
    );
};
