import React from 'react';
import type { BacSafetyLevel } from '@/types';
import { AlertTriangle, CheckCircle, ShieldAlert, Clock } from 'lucide-react';

interface BacGaugeCardProps {
    bacGramsPerLiter: number;
    bacGramsPerDl: number;
    safetyLevel: BacSafetyLevel | number;
    safetyMessage: string;
    estimatedSoberAt?: string;
    totalAlcoholGramsLast12h: number;
}

interface SafetyConfig {
    stroke: string;
    text: string;
    badgeBorder: string;
    label: string;
}

const SAFETY_COLORS: Record<BacSafetyLevel, SafetyConfig> = {
    Sober: { stroke: '#71717a', text: 'text-zinc-300', badgeBorder: 'border-white/10', label: 'Completely Sober' },
    Safe: { stroke: '#10b981', text: 'text-emerald-300', badgeBorder: 'border-emerald-500/35', label: 'Safe / Under Limit' },
    Caution: { stroke: '#f59e0b', text: 'text-amber-300', badgeBorder: 'border-amber-500/40', label: 'Driving Limit Exceeded' },
    Warning: { stroke: '#f97316', text: 'text-orange-300', badgeBorder: 'border-orange-500/40', label: 'Marked Impairment' },
    Critical: { stroke: '#ef4444', text: 'text-red-300', badgeBorder: 'border-red-500/45', label: 'Critical Risk' },
};

const NUMERIC_MAP: Record<string, BacSafetyLevel> = {
    '0': 'Sober',
    '1': 'Safe',
    '2': 'Caution',
    '3': 'Warning',
    '4': 'Critical',
};

// Calibrated scale ticks along the semicircular arc (0.00 to 2.00 g/L)
const GAUGE_TICKS = [0, 0.5, 1.0, 1.5, 2.0];

export const BacGaugeCard: React.FC<BacGaugeCardProps> = ({
    bacGramsPerLiter,
    bacGramsPerDl,
    safetyLevel,
    safetyMessage,
    estimatedSoberAt,
    totalAlcoholGramsLast12h,
}) => {
    const resolvedKey: BacSafetyLevel =
        NUMERIC_MAP[String(safetyLevel)] ||
        (SAFETY_COLORS[safetyLevel as BacSafetyLevel] ? (safetyLevel as BacSafetyLevel) : 'Sober');

    const config = SAFETY_COLORS[resolvedKey];
    const maxScale = 2.0;
    const progressRatio = Math.min(Math.max(bacGramsPerLiter / maxScale, 0), 1);
    const radius = 78;
    const circumference = Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progressRatio);

    const formatSoberTime = (isoString?: string) => {
        if (!isoString || bacGramsPerLiter <= 0) return 'Now (Sober)';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="w-full rounded-2xl border border-white/[0.08] bg-[#111114] p-5 sm:p-6 flex flex-col items-center">
            {/* Instrument Semicircular Gauge */}
            <div className="relative w-60 h-36 flex items-end justify-center overflow-hidden">
                <svg
                    viewBox="0 0 220 124"
                    className="w-full h-full"
                    role="img"
                    aria-label={`Blood alcohol level ${bacGramsPerLiter.toFixed(2)} grams per liter`}
                >
                    {/* Calibrated outer instrument ticks */}
                    {GAUGE_TICKS.map((tickVal) => {
                        const frac = tickVal / maxScale;
                        const angleRad = Math.PI * (1 - frac);
                        const x1 = 110 + 91 * Math.cos(angleRad);
                        const y1 = 108 - 91 * Math.sin(angleRad);
                        const x2 = 110 + 98 * Math.cos(angleRad);
                        const y2 = 108 - 98 * Math.sin(angleRad);
                        const isLegalLimit = tickVal === 0.5;
                        return (
                            <line
                                key={tickVal}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={isLegalLimit ? '#f59e0b' : 'rgba(255,255,255,0.22)'}
                                strokeWidth={isLegalLimit ? '2' : '1.25'}
                                strokeLinecap="round"
                            />
                        );
                    })}

                    {/* Base track */}
                    <path
                        d="M 32 108 A 78 78 0 0 1 188 108"
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="15"
                        strokeLinecap="round"
                    />
                    {/* Active BAC arc */}
                    <path
                        d="M 32 108 A 78 78 0 0 1 188 108"
                        fill="none"
                        stroke={config.stroke}
                        strokeWidth="15"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-[stroke-dashoffset,stroke] duration-500 ease-out"
                    />
                </svg>

                <div className="absolute bottom-1 flex flex-col items-center">
                    <span className="text-3xl font-extrabold tracking-tight text-white tabular-nums">
                        {bacGramsPerLiter.toFixed(2)}
                        <span className="text-sm font-semibold text-zinc-400 ml-1">g/L</span>
                    </span>
                    <span className="text-xs text-zinc-400 tabular-nums">
                        {bacGramsPerDl.toFixed(3)} g/dL
                    </span>
                </div>
            </div>

            {/* Safety Status Pill */}
            <div
                className={`mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold ${config.text} bg-[#0c0c0f] border ${config.badgeBorder}`}
            >
                {(resolvedKey === 'Sober' || resolvedKey === 'Safe') && <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />}
                {resolvedKey === 'Caution' && <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />}
                {(resolvedKey === 'Warning' || resolvedKey === 'Critical') && (
                    <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{config.label}</span>
            </div>

            <p className="mt-3 text-center text-xs text-zinc-300 leading-relaxed max-w-md">
                {safetyMessage}
            </p>

            {/* Footer Metrics */}
            <div className="mt-5 pt-3.5 border-t border-white/[0.08] w-full flex items-center justify-between text-xs text-zinc-400 tabular-nums">
                <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                    <span>Est. sober:</span>
                    <strong className="text-zinc-100">{formatSoberTime(estimatedSoberAt)}</strong>
                </div>
                <div>
                    <span>12h intake:</span>{' '}
                    <strong className="text-red-400">{totalAlcoholGramsLast12h.toFixed(1)} g</strong>
                </div>
            </div>
        </div>
    );
};
