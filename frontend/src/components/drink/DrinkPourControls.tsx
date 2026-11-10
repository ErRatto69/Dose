import React from 'react';
import type { StomachState } from '@/types';
import { RecentTimePicker } from '@/components/common/RecentTimePicker';
import { POUR_MULTIPLIERS, STOMACH_OPTIONS } from './drinkPourOptions';
import { Check, Clock } from 'lucide-react';

interface PourSizeSelectorProps {
    selectedMultiplier: number | null;
    onSelect: (multiplier: number) => void;
    label?: string;
}

export const PourSizeSelector: React.FC<PourSizeSelectorProps> = ({
    selectedMultiplier,
    onSelect,
    label = '1. How big is this pour?',
}) => {
    return (
        <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-200 block">{label}</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Pour size">
                {POUR_MULTIPLIERS.map((item) => {
                    const isActive = selectedMultiplier === item.mult;
                    return (
                        <button
                            key={item.mult}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => onSelect(item.mult)}
                            className={`min-h-[52px] py-2 px-3 rounded-xl border flex flex-col items-center justify-center gap-0.5 dose-press ${
                                isActive
                                    ? 'bg-red-600 text-white border-red-400/70'
                                    : 'bg-[#0c0c0f] hover:bg-[#18181d] border-white/[0.08] text-zinc-200'
                            }`}
                        >
                            <span className="text-xs font-extrabold">{item.label}</span>
                            <span
                                className={`text-[11px] font-bold tabular-nums ${
                                    isActive ? 'text-red-100' : 'text-red-400'
                                }`}
                            >
                                {item.tag}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

interface PourTimingSelectorProps {
    isNow: boolean;
    customConsumedAt: string;
    onToggleNow: (now: boolean) => void;
    onChangeTime: (isoStr: string) => void;
    label?: string;
}

export const PourTimingSelector: React.FC<PourTimingSelectorProps> = ({
    isNow,
    customConsumedAt,
    onToggleNow,
    onChangeTime,
    label = '2. When did you drink it?',
}) => {
    return (
        <div className="space-y-2.5">
            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                <span>{label}</span>
            </span>

            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Consumption time">
                <button
                    type="button"
                    aria-pressed={isNow}
                    onClick={() => onToggleNow(true)}
                    className={`min-h-[46px] py-2 px-3 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 dose-press ${
                        isNow
                            ? 'bg-red-600 text-white border-red-400/70'
                            : 'bg-[#0c0c0f] hover:bg-[#18181d] border-white/[0.08] text-zinc-300'
                    }`}
                >
                    {isNow && <Check className="w-3.5 h-3.5 stroke-[2.75]" aria-hidden="true" />}
                    <span>Right Now</span>
                </button>
                <button
                    type="button"
                    aria-pressed={!isNow}
                    onClick={() => onToggleNow(false)}
                    className={`min-h-[46px] py-2 px-3 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 dose-press ${
                        !isNow
                            ? 'bg-red-600 text-white border-red-400/70'
                            : 'bg-[#0c0c0f] hover:bg-[#18181d] border-white/[0.08] text-zinc-300'
                    }`}
                >
                    {!isNow && <Check className="w-3.5 h-3.5 stroke-[2.75]" aria-hidden="true" />}
                    <span>Earlier (12h)</span>
                </button>
            </div>

            {!isNow && (
                <RecentTimePicker
                    value={customConsumedAt || undefined}
                    onChange={onChangeTime}
                    isNow={false}
                    showNowOption={false}
                    label="Select exact time"
                />
            )}
        </div>
    );
};

interface StomachSelectorProps {
    value: StomachState;
    onChange: (value: StomachState) => void;
}

export const StomachSelector: React.FC<StomachSelectorProps> = ({ value, onChange }) => {
    return (
        <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-200 block">
                Stomach Fullness (Absorption Rate)
            </span>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Stomach fullness">
                {STOMACH_OPTIONS.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        aria-pressed={value === item.value}
                        onClick={() => onChange(item.value)}
                        className={`min-h-[48px] py-2 px-2.5 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-0.5 dose-press ${
                            value === item.value
                                ? 'bg-red-600 text-white border-red-500/70'
                                : 'bg-[#0c0c0f] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <span>{item.label}</span>
                        <span className="text-[11px] font-medium opacity-80">{item.desc}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
