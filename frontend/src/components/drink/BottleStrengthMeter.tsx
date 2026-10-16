import React, { useId } from 'react';

interface BottleStrengthMeterProps {
    score1To10: number;
    bottleRating?: number;
    abvPercent: number;
    compact?: boolean;
}

export const BottleStrengthMeter: React.FC<BottleStrengthMeterProps> = ({
                                                                            score1To10,
                                                                            bottleRating,
                                                                            abvPercent,
                                                                            compact = false,
                                                                        }) => {
    const uniqueId = useId().replace(/:/g, '');
    const effectiveBottles = bottleRating ?? Math.min(Math.max(score1To10 / 2, 0.5), 5.0);

    return (
        <div
            className={`flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl ${
                compact ? 'p-2' : 'p-3'
            }`}
        >
            <div className="flex items-center gap-1.5" aria-label={`Drink strength: ${effectiveBottles} of 5 bottles`}>
                {[1, 2, 3, 4, 5].map((bottleIndex) => {
                    const fillFraction = Math.max(0, Math.min(1, effectiveBottles - (bottleIndex - 1)));
                    const fillPercent = Math.round(fillFraction * 100);
                    const clipId = `bottle-clip-${uniqueId}-${bottleIndex}`;

                    return (
                        <svg
                            key={bottleIndex}
                            viewBox="0 0 24 48"
                            className={compact ? 'w-4 h-8' : 'w-5 h-10'}
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

                            <path
                                d="M9 2h6v6l4 6v30a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V14l4-6V2z"
                                className="fill-slate-800 stroke-slate-700"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                            />

                            {fillPercent > 0 && (
                                <path
                                    clipPath={`url(#${clipId})`}
                                    d="M9 2h6v6l4 6v30a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V14l4-6V2z"
                                    className="fill-amber-500 transition-all duration-300 ease-out"
                                />
                            )}
                        </svg>
                    );
                })}
            </div>

            <div className="text-right">
                <div className="text-sm font-bold text-amber-400">
                    {abvPercent.toFixed(1)}% <span className="text-xs font-normal text-slate-400">ABV</span>
                </div>
                {!compact && (
                    <p className="text-[11px] text-slate-400 font-medium">
                        Intensity: <strong className="text-slate-200">{score1To10}/10</strong> ({effectiveBottles} bottles)
                    </p>
                )}
            </div>
        </div>
    );
};