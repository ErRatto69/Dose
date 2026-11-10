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
    bg: string;
    text: string;
    label: string;
}

const SAFETY_COLORS: Record<BacSafetyLevel, SafetyConfig> = {
    Sober: { stroke: '#71717a', bg: 'bg-neutral-900', text: 'text-neutral-300', label: 'Completely Sober' },
    Safe: { stroke: '#10b981', bg: 'bg-neutral-900', text: 'text-emerald-400', label: 'Safe / Under Limit' },
    Caution: { stroke: '#f59e0b', bg: 'bg-neutral-900', text: 'text-amber-400', label: 'Driving Limit Exceeded' },
    Warning: { stroke: '#f97316', bg: 'bg-neutral-900', text: 'text-orange-400', label: 'Marked Impairment' },
    Critical: { stroke: '#ef4444', bg: 'bg-neutral-900', text: 'text-red-400', label: 'Critical Risk' },
};

const NUMERIC_MAP: Record<string, BacSafetyLevel> = {
    '0': 'Sober',
    '1': 'Safe',
    '2': 'Caution',
    '3': 'Warning',
    '4': 'Critical',
};

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
    const radius = 80;
    const circumference = Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progressRatio);

    const formatSoberTime = (isoString?: string) => {
        if (!isoString || bacGramsPerLiter <= 0) return 'Now (Sober)';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="w-full rounded-3xl border border-neutral-800 bg-neutral-900 p-6 flex flex-col items-center shadow-xl">
            {/* Circular Gauge Arc */}
            <div className="relative w-52 h-32 flex items-end justify-center overflow-hidden">
                <svg viewBox="0 0 200 110" className="w-full h-full">
                    {/* Dark neutral track background */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#262626"
                        strokeWidth="16"
                        strokeLinecap="round"
                    />
                    {/* Dynamic color fill */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke={config.stroke}
                        strokeWidth="16"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-700 ease-out"
                    />
                </svg>

                <div className="absolute bottom-0 flex flex-col items-center">
                    <span className="text-3xl font-black tracking-tight text-white font-mono">
                        {bacGramsPerLiter.toFixed(2)}
                        <span className="text-sm font-semibold text-neutral-400 ml-1 font-sans">g/L</span>
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                        {bacGramsPerDl.toFixed(3)} g/dL
                    </span>
                </div>
            </div>

            {/* Safety status pill */}
            <div
                className={`mt-4 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold ${config.text} bg-neutral-950 border border-neutral-800 shadow-sm`}
            >
                {(resolvedKey === 'Sober' || resolvedKey === 'Safe') && <CheckCircle className="w-3.5 h-3.5" />}
                {resolvedKey === 'Caution' && <AlertTriangle className="w-3.5 h-3.5" />}
                {(resolvedKey === 'Warning' || resolvedKey === 'Critical') && (
                    <ShieldAlert className="w-3.5 h-3.5" />
                )}
                <span>{config.label}</span>
            </div>

            <p className="mt-3 text-center text-xs text-neutral-300 leading-relaxed max-w-md font-medium">
                {safetyMessage}
            </p>

            {/* Footer metrics bar */}
            <div className="mt-5 pt-3.5 border-t border-neutral-800/80 w-full flex items-center justify-between text-xs text-neutral-400">
                <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Estimated sober:</span>
                    <strong className="text-neutral-200">{formatSoberTime(estimatedSoberAt)}</strong>
                </div>
                <div>
                    <span>12h intake:</span>{' '}
                    <strong className="text-red-400 font-mono">{totalAlcoholGramsLast12h.toFixed(1)}g</strong>
                </div>
            </div>
        </div>
    );
};