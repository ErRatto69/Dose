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

const resolvePast12HourDate = (hour: number, minute: number, refDate: Date = new Date()) => {
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
            {/* Column Header: Label + Desktop Stepper Chevrons */}
            <div className="w-full flex items-center justify-between mb-1.5 px-1">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    {label}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => step(-1)}
                        className="w-6 h-6 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-all active:scale-95"
                        title={`Previous ${label}`}
                    >
                        <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => step(1)}
                        className="w-6 h-6 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-all active:scale-95"
                        title={`Next ${label}`}
                    >
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Roller Box */}
            <div className="relative w-full overflow-hidden rounded-2xl bg-neutral-950 border border-neutral-800">
                {/* Center Highlight Selection Bar */}
                <div
                    className="absolute left-1.5 right-1.5 pointer-events-none rounded-xl bg-red-600/15 border border-red-500/40"
                    style={{
                        top: ITEM_HEIGHT,
                        height: ITEM_HEIGHT,
                    }}
                />

                {/* Top and Bottom Vignette Fades */}
                <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-neutral-950 via-neutral-950/80 to-transparent pointer-events-none z-10" />
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent pointer-events-none z-10" />

                {/* Scroll Container with Strict Cross-Browser Scrollbar Suppression */}
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="overflow-y-auto overflow-x-hidden snap-y snap-mandatory select-none w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    style={{
                        height: WHEEL_HEIGHT,
                        paddingTop: ITEM_HEIGHT,
                        paddingBottom: ITEM_HEIGHT,
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                >
                    {items.map((item, index) => {
                        const isSelected = item === value;
                        return (
                            <div
                                key={item}
                                onClick={() => {
                                    onChange(item);
                                    containerRef.current?.scrollTo({
                                        top: index * ITEM_HEIGHT,
                                        behavior: 'smooth',
                                    });
                                }}
                                style={{ height: ITEM_HEIGHT }}
                                className={`snap-center flex items-center justify-center cursor-pointer transition-colors duration-150 ${
                                    isSelected
                                        ? 'text-white font-mono font-black text-2xl'
                                        : 'text-neutral-500 font-mono text-base hover:text-neutral-300'
                                }`}
                            >
                                {pad(item)}
                            </div>
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
    const initialDate = useMemo(() => {
        if (value) {
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime())) return parsed;
        }
        return new Date();
    }, [value]);

    const [selectedHour, setSelectedHour] = useState(initialDate.getHours());
    const [selectedMinute, setSelectedMinute] = useState(initialDate.getMinutes());

    useEffect(() => {
        if (value && !isNow) {
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime())) {
                setSelectedHour(parsed.getHours());
                setSelectedMinute(parsed.getMinutes());
            }
        }
    }, [value, isNow]);

    const timeStatus = useMemo(() => {
        return resolvePast12HourDate(selectedHour, selectedMinute, new Date());
    }, [selectedHour, selectedMinute]);

    const handleTimeChange = useCallback(
        (hour: number, minute: number) => {
            setSelectedHour(hour);
            setSelectedMinute(minute);
            const result = resolvePast12HourDate(hour, minute, new Date());
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
                <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-red-500" />
                    {label}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">Past 12h window</span>
            </div>

            {/* Now vs Custom Time Toggle */}
            {showNowOption && (
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
                    <button
                        type="button"
                        onClick={() => onToggleNow?.(true)}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            isNow
                                ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                                : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                    >
                        {isNow && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>Now (Default)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onToggleNow?.(false);
                            if (timeStatus.isValid) {
                                onChange(timeStatus.date.toISOString());
                            }
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            !isNow
                                ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                                : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                    >
                        {!isNow && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>Custom Time</span>
                    </button>
                </div>
            )}

            {/* Roller Wheels Area */}
            {(!showNowOption || !isNow) && (
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-400">Set hour and minute:</span>
                        <button
                            type="button"
                            onClick={handleSetToCurrentTime}
                            className="text-[11px] font-bold text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                            title="Reset to current time"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>Current time</span>
                        </button>
                    </div>

                    {/* Columns + Colon Aligned at the Selection Line */}
                    <div className="flex items-end gap-3">
                        <WheelColumn
                            items={HOURS}
                            value={selectedHour}
                            onChange={(h) => handleTimeChange(h, selectedMinute)}
                            label="Hours"
                        />
                        <div
                            className="flex items-center justify-center font-mono font-black text-2xl text-red-500 select-none pb-0.5"
                            style={{
                                height: ITEM_HEIGHT,
                                marginBottom: ITEM_HEIGHT,
                            }}
                        >
                            :
                        </div>
                        <WheelColumn
                            items={MINUTES}
                            value={selectedMinute}
                            onChange={(m) => handleTimeChange(selectedHour, m)}
                            label="Minutes"
                        />
                    </div>

                    {/* Auto-resolved Date/Time Feedback */}
                    {timeStatus.isValid ? (
                        <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800">
                            <span className="text-neutral-400">Recorded for:</span>
                            <span className="font-semibold text-neutral-100 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                {timeStatus.label}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs text-red-400 px-3 py-2 rounded-xl bg-red-950/40 border border-red-800/50">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{timeStatus.label}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};