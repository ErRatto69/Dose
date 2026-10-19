import React, { useId } from 'react';

interface BottleStrengthMeterProps {
    score1To10: number;
    bottleRating?: number;
    abvPercent: number;
    compact?: boolean;
}

const getStrengthDescriptor = (bottles: number): { label: string; color: string } => {
    if (bottles <= 1.25) return { label: 'Light', color: 'text-emerald-400' };
    if (bottles <= 2.25) return { label: 'Moderate', color: 'text-amber-400' };
    if (bottles <= 3.25) return { label: 'Medium', color: 'text-orange-400' };
    if (bottles <= 4.25) return { label: 'Strong', color: 'text-red-400' };
    return { label: 'Very Strong', color: 'text-rose-500' };
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
            className={`bg-neutral-900/90 border border-neutral-800 rounded-2xl flex flex-col justify-between gap-2 ${
                compact ? 'p-2.5' : 'p-3.5'
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                {/* 5 Physical Bottle Icons */}
                <div
                    className="flex items-center gap-1"
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
                                {/* Bottle Base Contour */}
                                <path
                                    d="M9 2h6v6l4 6v30a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V14l4-6V2z"
                                    className="fill-neutral-800 stroke-neutral-700"
                                    strokeWidth="1.5"
                                    strokeLinejoin="round"
                                />
                                {/* Dynamic Liquid Fill in Crimson Red */}
                                {fillPercent > 0 && (
                                    <path
                                        clipPath={`url(#${clipId})`}
                                        d="M9 2h6v6l4 6v30a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V14l4-6V2z"
                                        className="fill-red-600 transition-all duration-300 ease-out"
                                    />
                                )}
                            </svg>
                        );
                    })}
                </div>

                {/* Clear textual strength indicator */}
                <div className="text-right">
                    <div className="text-sm font-bold text-white flex items-center justify-end gap-1.5">
                        <span className={descriptor.color}>{descriptor.label}</span>
                        <span className="text-neutral-400 font-mono text-xs">
                            ({effectiveBottles}/5)
                        </span>
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                        <strong className="text-red-400 font-mono">{abvPercent.toFixed(1)}%</strong>{' '}
                        <span>ABV</span>
                    </div>
                </div>
            </div>

            {/* Explanatory helper note for clarity */}
            {!compact && (
                <p className="text-[10px] text-neutral-500 border-t border-neutral-800/80 pt-1.5 leading-tight">
                    Strength rating based on alcohol percentage (% ABV) and total volume.
                </p>
            )}
        </div>
    );
};