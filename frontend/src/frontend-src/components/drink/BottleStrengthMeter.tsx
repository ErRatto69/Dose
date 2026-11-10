import React, { useId } from 'react';

interface BottleStrengthMeterProps {
    score1To10: number;
    bottleRating?: number;
    abvPercent: number;
    compact?: boolean;
}

interface StrengthDescriptor {
    label: string;
    textColor: string;
    fillHex: string;
}

const getStrengthDescriptor = (bottles: number): StrengthDescriptor => {
    if (bottles <= 1.25) {
        return { label: 'Light', textColor: 'text-emerald-400', fillHex: '#10b981' };
    }
    if (bottles <= 2.25) {
        return { label: 'Moderate', textColor: 'text-amber-400', fillHex: '#f59e0b' };
    }
    if (bottles <= 3.25) {
        return { label: 'Medium', textColor: 'text-orange-500', fillHex: '#f97316' };
    }
    if (bottles <= 4.25) {
        return { label: 'Strong', textColor: 'text-red-500', fillHex: '#ef4444' };
    }
    return { label: 'Very Strong', textColor: 'text-purple-400', fillHex: '#a855f7' };
};

export const BottleStrengthMeter: React.FC<BottleStrengthMeterProps> = ({
                                                                            score1To10,
                                                                            bottleRating,
                                                                            abvPercent,
                                                                            compact = false,
                                                                        }) => {
    const uniqueId = useId().replace(/:/g, '');
    const effectiveBottles = bottleRating ?? Math.min(Math.max(score1To10 / 2, 0.5), 5.0);
    const descriptor = getStrengthDescriptor(effectiveBottles);

    return (
        <div
            className={`bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col justify-between gap-2 ${
                compact ? 'p-2.5' : 'p-3.5'
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                {/* 5 Physical Bottle Icons - dynamically filled with the matching level color */}
                <div
                    className="flex items-center gap-1.5"
                    aria-label={`Strength: ${effectiveBottles} out of 5 bottles`}
                >
                    {[1, 2, 3, 4, 5].map((bottleIndex) => {
                        const fillFraction = Math.max(0, Math.min(1, effectiveBottles - (bottleIndex - 1)));
                        const fillPercent = Math.round(fillFraction * 100);
                        const clipId = `bottle-clip-${uniqueId}-${bottleIndex}`;

                        return (
                            <svg
                                key={bottleIndex}
                                viewBox="0 0 24 48"
                                className={compact ? 'w-3.5 h-7' : 'w-4 h-9'}
                                aria-hidden="true"
                            >
                                <defs>
                                    <clipPath id={clipId}>
                                        <rect
                                            x="0"
                                            y={48 - (48 * fillPercent) / 100}
                                            width="24"
                                            height={(48 * fillPercent) / 100}
                                        />
                                    </clipPath>
                                </defs>
                                {/* Bottle Base Outline */}
                                <path
                                    d="M9 2h6v6l4 6v30a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V14l4-6V2z"
                                    className="fill-neutral-900 stroke-neutral-800"
                                    strokeWidth="1.5"
                                    strokeLinejoin="round"
                                />
                                {/* Dynamic Liquid Fill with the EXACT matching color */}
                                {fillPercent > 0 && (
                                    <path
                                        clipPath={`url(#${clipId})`}
                                        d="M9 2h6v6l4 6v30a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V14l4-6V2z"
                                        style={{ fill: descriptor.fillHex }}
                                        className="transition-all duration-300 ease-out"
                                    />
                                )}
                            </svg>
                        );
                    })}
                </div>

                {/* Text descriptor using the exact same color */}
                <div className="text-right">
                    <div className="text-sm font-bold flex items-center justify-end gap-1.5">
                        <span className={descriptor.textColor}>{descriptor.label}</span>
                        <span className="text-neutral-400 font-mono text-xs">
                            ({effectiveBottles}/5)
                        </span>
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                        <strong className="text-neutral-200 font-mono">{abvPercent.toFixed(1)}%</strong>{' '}
                        <span>ABV</span>
                    </div>
                </div>
            </div>

            {!compact && (
                <p className="text-[10px] text-neutral-500 border-t border-neutral-800/80 pt-1.5 leading-tight">
                    Strength rating based on alcohol percentage (% ABV) and total volume.
                </p>
            )}
        </div>
    );
};