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
    Sober: { stroke: '#94a3b8', bg: 'bg-slate-900/90', text: 'text-slate-300', label: 'Completely Sober' },
    Safe: { stroke: '#10b981', bg: 'bg-emerald-950/40', text: 'text-emerald-400', label: 'Safe / Under Limit' },
    Caution: { stroke: '#f59e0b', bg: 'bg-amber-950/40', text: 'text-amber-400', label: 'Driving Limit Exceeded' },
    Warning: { stroke: '#f97316', bg: 'bg-orange-950/40', text: 'text-orange-400', label: 'Marked Impairment' },
    Critical: { stroke: '#ef4444', bg: 'bg-rose-950/40', text: 'text-rose-400', label: 'Critical Risk' },
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
        <div
            className={`w-full rounded-2xl border border-slate-800 p-6 backdrop-blur-sm ${config.bg} flex flex-col items-center shadow-xl`}
        >
            <div className="relative w-52 h-32 flex items-end justify-center overflow-hidden">
                <svg viewBox="0 0 200 110" className="w-full h-full">
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="16"
                        strokeLinecap="round"
                    />
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
                    <span className="text-3xl font-black tracking-tight text-white">
                        {bacGramsPerLiter.toFixed(2)}
                        <span className="text-sm font-semibold text-slate-400 ml-1">g/L</span>
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                        {bacGramsPerDl.toFixed(3)} g/dL
                    </span>
                </div>
            </div>

            <div
                className={`mt-4 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold ${config.text} bg-slate-900/90 border border-slate-700/60`}
            >
                {(resolvedKey === 'Sober' || resolvedKey === 'Safe') && <CheckCircle className="w-3.5 h-3.5" />}
                {resolvedKey === 'Caution' && <AlertTriangle className="w-3.5 h-3.5" />}
                {(resolvedKey === 'Warning' || resolvedKey === 'Critical') && (
                    <ShieldAlert className="w-3.5 h-3.5" />
                )}
                {config.label}
            </div>

            <p className="mt-3 text-center text-xs text-slate-300 leading-relaxed max-w-md font-medium">
                {safetyMessage}
            </p>

            <div className="mt-5 pt-3.5 border-t border-slate-800/80 w-full flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Estimated sober:</span>
                    <strong className="text-slate-200">{formatSoberTime(estimatedSoberAt)}</strong>
                </div>
                <div>
                    <span>12h intake:</span>{' '}
                    <strong className="text-amber-400">{totalAlcoholGramsLast12h.toFixed(1)}g</strong>
                </div>
            </div>
        </div>
    );
};