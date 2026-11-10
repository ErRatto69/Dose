import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, Check, AlertCircle, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';

interface RecentTimePickerProps {
    value?: string;
    onChange: (isoString: string) => void;
    isNow?: boolean;
    onToggleNow?: (isNow: boolean) => void;
    showNowOption?: boolean;
    label?: string;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 132px
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const pad = (n: number) => String(n).padStart(2, '0');

const parseValidDate = (value?: string): Date | null => {
    if (!value) return null;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
};

const resolvePast12HourDate = (hour: number, minute: number, refDate: Date) => {
    const cToday = new Date(refDate);
    cToday.setHours(hour, minute, 0, 0);
    const cYesterday = new Date(cToday);
    cYesterday.setDate(cYesterday.getDate() - 1);
    const cTomorrow = new Date(cToday);
    cTomorrow.setDate(cTomorrow.getDate() + 1);

    const twelveHoursAgoMs = refDate.getTime() - 12 * 60 * 60 * 1000;
    const maxFutureMs = refDate.getTime() + 5 * 60 * 1000;

    const candidates = [cToday, cYesterday, cTomorrow];
    const match = candidates.find(
        (c) => c.getTime() >= twelveHoursAgoMs && c.getTime() <= maxFutureMs
    );

    if (!match) {
        return {
            date: cToday,
            isValid: false,
            label: 'Selected time is outside the 12-hour window',
        };
    }

    const diffMinutes = Math.max(0, Math.round((refDate.getTime() - match.getTime()) / 60000));
    const isToday = match.getDate() === refDate.getDate() && match.getMonth() === refDate.getMonth();
    const dayLabel = isToday ? 'Today' : 'Yesterday';
    let agoText = '';
    if (diffMinutes < 1) agoText = 'Just now';
    else if (diffMinutes < 60) agoText = `${diffMinutes}m ago`;
    else {
        const h = Math.floor(diffMinutes / 60);
        const m = diffMinutes % 60;
        agoText = m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
    }

    return {
        date: match,
        isValid: true,
        label: `${dayLabel} at ${pad(match.getHours())}:${pad(match.getMinutes())} (${agoText})`,
    };
};

interface WheelColumnProps {
    items: number[];
    value: number;
    onChange: (val: number) => void;
    label: string;
}

const WheelColumn: React.FC<WheelColumnProps> = ({ items, value, onChange, label }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            const targetScroll = items.indexOf(value) * ITEM_HEIGHT;
            if (Math.abs(containerRef.current.scrollTop - targetScroll) > ITEM_HEIGHT / 2) {
                containerRef.current.scrollTop = targetScroll;
            }
        }
    }, [value, items]);

    const step = (delta: number) => {
        const currentIndex = items.indexOf(value);
        const newIndex = Math.max(0, Math.min(items.length - 1, currentIndex + delta));
        if (newIndex !== currentIndex) {
            onChange(items[newIndex]);
            if (containerRef.current) {
                containerRef.current.scrollTo({
                    top: newIndex * ITEM_HEIGHT,
                    behavior: 'smooth',
                });
            }
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
        const activeItem = items[clampedIndex];
        if (activeItem !== undefined && activeItem !== value) {
            onChange(activeItem);
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-1.5 px-1">
                <span className="text-[11px] font-bold text-zinc-400">
                    {label}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => step(-1)}
                        aria-label={`Previous ${label}`}
                        className="w-8 h-8 rounded-lg bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center dose-press"
                    >
                        <ChevronUp className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={() => step(1)}
                        aria-label={`Next ${label}`}
                        className="w-8 h-8 rounded-lg bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center dose-press"
                    >
                        <ChevronDown className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="relative w-full overflow-hidden rounded-2xl bg-[#09090b] border border-white/[0.08]">
                <div
                    className="absolute left-1.5 right-1.5 pointer-events-none rounded-xl bg-red-600/15 border border-red-500/40"
                    style={{
                        top: ITEM_HEIGHT,
                        height: ITEM_HEIGHT,
                    }}
                    aria-hidden="true"
                />

                <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#09090b] via-[#09090b]/80 to-transparent pointer-events-none z-10" aria-hidden="true" />
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent pointer-events-none z-10" aria-hidden="true" />

                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="overflow-y-auto overflow-x-hidden overscroll-contain snap-y snap-mandatory no-scrollbar w-full dose-control"
                    style={{
                        height: WHEEL_HEIGHT,
                        paddingTop: ITEM_HEIGHT,
                        paddingBottom: ITEM_HEIGHT,
                    }}
                >
                    {items.map((item, index) => {
                        const isSelected = item === value;
                        return (
                            <button
                                key={item}
                                type="button"
                                onClick={() => {
                                    onChange(item);
                                    containerRef.current?.scrollTo({
                                        top: index * ITEM_HEIGHT,
                                        behavior: 'smooth',
                                    });
                                }}
                                style={{ height: ITEM_HEIGHT }}
                                className={`w-full snap-center flex items-center justify-center tabular-nums transition-colors duration-150 ${
                                    isSelected
                                        ? 'text-white font-extrabold text-2xl'
                                        : 'text-zinc-500 font-semibold text-base hover:text-zinc-300'
                                }`}
                            >
                                {pad(item)}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export const RecentTimePicker: React.FC<RecentTimePickerProps> = ({
    value,
    onChange,
    isNow = true,
    onToggleNow,
    showNowOption = true,
    label = 'Consumption Time',
}) => {
    const [refDate, setRefDate] = useState<Date>(() => new Date());
    const [prevValue, setPrevValue] = useState<string | undefined>(value);
    const [selectedHour, setSelectedHour] = useState<number>(() => {
        return parseValidDate(value)?.getHours() ?? new Date().getHours();
    });
    const [selectedMinute, setSelectedMinute] = useState<number>(() => {
        return parseValidDate(value)?.getMinutes() ?? new Date().getMinutes();
    });

    if (value !== prevValue) {
        setPrevValue(value);
        if (!isNow) {
            const parsed = parseValidDate(value);
            if (parsed) {
                setSelectedHour(parsed.getHours());
                setSelectedMinute(parsed.getMinutes());
            }
        }
    }

    const timeStatus = useMemo(() => {
        return resolvePast12HourDate(selectedHour, selectedMinute, refDate);
    }, [selectedHour, selectedMinute, refDate]);

    const handleTimeChange = useCallback(
        (hour: number, minute: number) => {
            const now = new Date();
            setRefDate(now);
            setSelectedHour(hour);
            setSelectedMinute(minute);
            const result = resolvePast12HourDate(hour, minute, now);
            if (result.isValid) {
                onChange(result.date.toISOString());
            }
        },
        [onChange]
    );

    const handleSetToCurrentTime = () => {
        const now = new Date();
        handleTimeChange(now.getHours(), now.getMinutes());
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                    {label}
                </span>
                <span className="text-[11px] text-zinc-400 tabular-nums">12h window</span>
            </div>

            {showNowOption && (
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0c0c0f] border border-white/[0.08] rounded-xl">
                    <button
                        type="button"
                        onClick={() => onToggleNow?.(true)}
                        className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 dose-press ${
                            isNow
                                ? 'bg-red-600 text-white'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        {isNow && <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />}
                        <span>Now</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const now = new Date();
                            setRefDate(now);
                            onToggleNow?.(false);
                            const nextStatus = resolvePast12HourDate(selectedHour, selectedMinute, now);
                            if (nextStatus.isValid) {
                                onChange(nextStatus.date.toISOString());
                            }
                        }}
                        className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 dose-press ${
                            !isNow
                                ? 'bg-red-600 text-white'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        {!isNow && <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />}
                        <span>Custom Time</span>
                    </button>
                </div>
            )}

            {(!showNowOption || !isNow) && (
                <div className="p-4 rounded-2xl bg-[#0c0c0f] border border-white/[0.08] space-y-3 dose-dialog-enter">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Adjust hour and minute</span>
                        <button
                            type="button"
                            onClick={handleSetToCurrentTime}
                            className="min-h-[32px] px-2 rounded-lg text-[11px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 dose-press"
                        >
                            <RotateCcw className="w-3 h-3" aria-hidden="true" />
                            <span>Reset to now</span>
                        </button>
                    </div>

                    <div className="flex items-end gap-3">
                        <WheelColumn
                            items={HOURS}
                            value={selectedHour}
                            onChange={(h) => handleTimeChange(h, selectedMinute)}
                            label="Hour"
                        />
                        <div
                            className="flex items-center justify-center font-extrabold text-2xl text-red-400 tabular-nums select-none pb-0.5"
                            style={{
                                height: ITEM_HEIGHT,
                                marginBottom: ITEM_HEIGHT,
                            }}
                            aria-hidden="true"
                        >
                            :
                        </div>
                        <WheelColumn
                            items={MINUTES}
                            value={selectedMinute}
                            onChange={(m) => handleTimeChange(selectedHour, m)}
                            label="Minute"
                        />
                    </div>

                    {timeStatus.isValid ? (
                        <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-[#111114] border border-white/[0.08]">
                            <span className="text-zinc-400">Logged at</span>
                            <span className="font-semibold text-zinc-100 tabular-nums flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                                {timeStatus.label}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs text-red-300 px-3 py-2 rounded-xl bg-red-950/50 border border-red-700/50">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" aria-hidden="true" />
                            <span>{timeStatus.label}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
