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
        return { label: 'Medium', textColor: 'text-orange-400', fillHex: '#f97316' };
    }
    if (bottles <= 4.25) {
        return { label: 'Strong', textColor: 'text-red-400', fillHex: '#ef4444' };
    }
    return { label: 'Very Strong', textColor: 'text-rose-300', fillHex: '#dc2626' };
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
            className={`bg-[#0c0c0f] border border-white/[0.08] rounded-2xl flex flex-col justify-between gap-2 ${
                compact ? 'p-3' : 'p-3.5'
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                {/* 5 Calibrated Bottle Icons */}
                <div
                    className="flex items-center gap-1.5"
                    role="img"
                    aria-label={`Strength ${effectiveBottles} out of 5 bottles, ${descriptor.label}`}
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
                                <path
                                    d="M9 2h6v6l4 6v30a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V14l4-6V2z"
                                    className="fill-[#141418] stroke-white/15"
                                    strokeWidth="1.5"
                                    strokeLinejoin="round"
                                />
                                {fillPercent > 0 && (
                                    <path
                                        clipPath={`url(#${clipId})`}
                                        d="M9 2h6v6l4 6v30a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V14l4-6V2z"
                                        style={{ fill: descriptor.fillHex }}
                                    />
                                )}
                                {/* Calibration tick marks matching Dose logo aesthetic */}
                                <line x1="6.5" y1="22" x2="9.5" y2="22" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
                                <line x1="6.5" y1="30" x2="9.5" y2="30" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
                                <line x1="6.5" y1="38" x2="9.5" y2="38" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
                            </svg>
                        );
                    })}
                </div>

                <div className="text-right">
                    <div className="text-sm font-bold flex items-center justify-end gap-1.5">
                        <span className={descriptor.textColor}>{descriptor.label}</span>
                        <span className="text-zinc-400 tabular-nums text-xs">
                            {effectiveBottles}/5
                        </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                        <strong className="text-zinc-100 font-bold">{abvPercent.toFixed(1)}%</strong>{' '}
                        <span>ABV</span>
                    </div>
                </div>
            </div>

            {!compact && (
                <p className="text-[11px] text-zinc-400 border-t border-white/[0.06] pt-2 leading-snug">
                    Calculated from effective % ABV and total ethanol load.
                </p>
            )}
        </div>
    );
};
