import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { bacApi } from '@/api/bac.api';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/store/useAuthStore';
import { BacGaugeCard } from '@/components/safety/BacGaugeCard';
import { EditDrinkLogModal } from '@/components/drink/EditDrinkLogModal';
import { EditWaterLogModal } from '@/components/safety/EditWaterLogModal';
import { LogWaterModal } from '@/components/safety/LogWaterModal';
import { ConfirmDialogModal } from '@/components/common/ConfirmDialogModal';
import type { DrinkEvent, WaterEvent } from '@/types';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceLine,
    CartesianGrid,
} from 'recharts';
import {
    Activity,
    Clock,
    ShieldCheck,
    UserCheck,
    AlertCircle,
    RefreshCw,
    Edit3,
    Trash2,
    Droplets,
    Flame,
    HeartPulse,
    Award,
    Plus,
    Wine,
} from 'lucide-react';

type SessionTimelineEntry =
    | { kind: 'drink'; id: string; consumedAt: string; data: DrinkEvent }
    | { kind: 'water'; id: string; consumedAt: string; data: WaterEvent };

export const MyBacDashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [editingEvent, setEditingEvent] = useState<DrinkEvent | null>(null);
    const [drinkToDelete, setDrinkToDelete] = useState<DrinkEvent | null>(null);

    const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
    const [editingWater, setEditingWater] = useState<WaterEvent | null>(null);
    const [waterToDelete, setWaterToDelete] = useState<WaterEvent | null>(null);

    const {
        data: bacData,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: queryKeys.bac.me(),
        queryFn: bacApi.getMyBac,
        refetchInterval: 30000,
    });

    const deleteDrinkMutation = useMutation({
        mutationFn: (logId: string) => bacApi.deleteDrinkLog(logId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.bac.me() });
            queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.monthly() });
            queryClient.invalidateQueries({ queryKey: queryKeys.gamification.monthlyBadges() });
            setDrinkToDelete(null);
        },
    });

    const deleteWaterMutation = useMutation({
        mutationFn: (waterId: string) => bacApi.deleteWaterLog(waterId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.bac.me() });
            queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.monthly() });
            queryClient.invalidateQueries({ queryKey: queryKeys.gamification.monthlyBadges() });
            setWaterToDelete(null);
        },
    });

    const timelineEntries = useMemo<SessionTimelineEntry[]>(() => {
        if (!bacData) return [];
        const drinks: SessionTimelineEntry[] = (bacData.activeLogsLast12h ?? []).map((d) => ({
            kind: 'drink',
            id: `drink-${d.logId}`,
            consumedAt: d.consumedAt,
            data: d,
        }));
        const waters: SessionTimelineEntry[] = (bacData.activeWaterLogsLast12h ?? []).map((w) => ({
            kind: 'water',
            id: `water-${w.id}`,
            consumedAt: w.consumedAt,
            data: w,
        }));
        return [...drinks, ...waters].sort(
            (a, b) => new Date(b.consumedAt).getTime() - new Date(a.consumedAt).getTime()
        );
    }, [bacData]);

    if (isLoading) {
        return (
            <div className="space-y-6" aria-busy="true" aria-label="Loading BAC telemetry">
                <div className="h-12 w-56 rounded-xl bg-[#111114] border border-white/[0.08]" />
                <div className="h-[420px] rounded-2xl bg-[#111114] border border-white/[0.08]" />
                <div className="h-48 rounded-2xl bg-[#111114] border border-white/[0.08]" />
            </div>
        );
    }

    if (isError || !bacData) {
        return (
            <div className="py-16 max-w-md mx-auto text-center space-y-3 bg-[#111114] border border-white/[0.08] rounded-2xl p-6">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto" aria-hidden="true" />
                <h1 className="text-base font-extrabold text-white">Unable to load BAC telemetry</h1>
                <p className="text-xs text-zinc-400">
                    Check your connection and refresh your metabolic readout.
                </p>
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs inline-flex items-center gap-2 dose-press"
                >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Retry</span>
                </button>
            </div>
        );
    }

    const chartData = (bacData.timeline || []).map((point) => ({
        time: new Date(point.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        }),
        bac: Number(point.bacGramsPerLiter || 0),
    }));

    const workoutEquivalenceMinutes = Math.round(bacData.totalKcalLast12h / 11);
    const totalWaterCl = bacData.totalWaterClLast12h ?? 0;
    const waterVolumeLabel = totalWaterCl >= 100
        ? `${(totalWaterCl / 100).toFixed(2)} L`
        : `${Math.round(totalWaterCl)} cl`;

    return (
        <div className="space-y-6">
            {/* Open Page Header */}
            <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-wide leading-none">
                        MY BAC TELEMETRY
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1.5">
                        Real-time metabolic curve, hydration balance, and 12-hour bar log.
                    </p>
                </div>

                {user && (
                    <Link
                        to="/profile"
                        className="self-start sm:self-auto min-h-[38px] px-3.5 py-1.5 rounded-full bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-xs font-bold text-zinc-200 inline-flex items-center gap-2 tabular-nums dose-press"
                    >
                        <UserCheck className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                        <span>{user.weightKg} kg · {user.sex}</span>
                    </Link>
                )}
            </section>

            {/* Unified Instrument Telemetry Console (Zero 4-Card Clutter) */}
            <section className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden">
                {/* Upper Split: Calibrated Dial + Elimination Curve */}
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
                    <div className="lg:col-span-5">
                        <BacGaugeCard
                            embedded
                            bacGramsPerLiter={bacData.currentBacGramsPerLiter}
                            bacGramsPerDl={bacData.currentBacGramsPerDl}
                            safetyLevel={bacData.safetyLevel}
                            safetyMessage={bacData.safetyMessage}
                            estimatedSoberAt={bacData.estimatedSoberAt}
                            totalAlcoholGramsLast12h={bacData.totalAlcoholGramsLast12h}
                        />
                    </div>

                    <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-red-400" aria-hidden="true" />
                                <h2 className="text-sm font-extrabold text-zinc-100">
                                    Elimination Curve
                                </h2>
                            </div>
                            <span className="text-[11px] text-zinc-400 tabular-nums">
                                Clearance: -0.15 g/L / hr
                            </span>
                        </div>

                        <div className="w-full h-52 sm:h-60">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData}
                                    margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="doseBacFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.45} />
                                            <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                                    <XAxis dataKey="time" stroke="#91919c" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis
                                        stroke="#91919c"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        domain={[0, (dataMax: number) => Math.max(0.6, Number((dataMax * 1.2).toFixed(2)))]}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#111114',
                                            borderColor: 'rgba(255,255,255,0.14)',
                                            borderRadius: '0.75rem',
                                            fontSize: '12px',
                                            color: '#f4f4f5',
                                        }}
                                        formatter={(val: unknown) => [`${Number(val).toFixed(2)} g/L`, 'BAC']}
                                    />
                                    <ReferenceLine
                                        y={0.5}
                                        stroke="#f59e0b"
                                        strokeDasharray="4 4"
                                        label={{
                                            value: '0.50 g/L Limit',
                                            fill: '#fbbf24',
                                            fontSize: 10,
                                            position: 'insideTopRight',
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="bac"
                                        stroke="#ef4444"
                                        strokeWidth={2.5}
                                        fillOpacity={1}
                                        fill="url(#doseBacFill)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Lower 2x2 / 4x1 Hairline Telemetry Strip */}
                <div
                    className="border-t border-white/[0.08] bg-[#0d0d10] grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/[0.07]"
                    aria-label="12-hour bio-telemetry metrics"
                >
                    <div className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                                <HeartPulse className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
                                <span>Hangover</span>
                            </span>
                            <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    bacData.hangoverRiskPercent > 60
                                        ? 'bg-red-500/15 text-red-300'
                                        : bacData.hangoverRiskPercent > 30
                                            ? 'bg-amber-500/15 text-amber-300'
                                            : 'bg-emerald-500/15 text-emerald-300'
                                }`}
                            >
                                {bacData.hangoverRiskPercent > 60 ? 'High' : bacData.hangoverRiskPercent > 30 ? 'Med' : 'Low'}
                            </span>
                        </div>
                        <strong className="text-xl font-extrabold tabular-nums text-white block">
                            {bacData.hangoverRiskPercent}%
                        </strong>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsWaterModalOpen(true)}
                        className="text-left p-4 space-y-1.5 hover:bg-sky-950/25 dose-press group"
                    >
                        <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[11px] font-bold text-zinc-400 group-hover:text-sky-300 flex items-center gap-1.5">
                                <Droplets className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                                <span>Water</span>
                            </span>
                            <Plus className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <strong className="text-xl font-extrabold tabular-nums text-white">
                                {waterVolumeLabel}
                            </strong>
                            <span className="text-[11px] text-sky-400 font-semibold tabular-nums">
                                ({bacData.waterLogsCountLast12h})
                            </span>
                        </div>
                    </button>

                    <div className="p-4 space-y-1.5">
                        <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                            <span>Calories</span>
                        </span>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                            <strong className="text-xl font-extrabold tabular-nums text-white">
                                {bacData.totalKcalLast12h}
                            </strong>
                            <span className="text-[11px] text-zinc-400 tabular-nums">
                                kcal · ~{workoutEquivalenceMinutes}m run
                            </span>
                        </div>
                    </div>

                    <div className="p-4 space-y-1.5">
                        <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                            <span>Safe Score</span>
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <strong className="text-xl font-extrabold tabular-nums text-emerald-400">
                                {bacData.responsibleDrinkingScore}
                            </strong>
                            <span className="text-[11px] text-zinc-400">pts</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Chronological 12-Hour Session Timeline */}
            <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-red-400" aria-hidden="true" />
                            <span>12-Hour Session Log ({timelineEntries.length})</span>
                        </h2>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                            Tap edit or delete on any pour or water entry within 12 hours.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsWaterModalOpen(true)}
                        className="min-h-[38px] px-3.5 rounded-full bg-sky-950/60 hover:bg-sky-900/75 border border-sky-500/35 text-sky-200 text-xs font-bold flex items-center gap-1.5 dose-press"
                    >
                        <Plus className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                        <span>Water</span>
                    </button>
                </div>

                {timelineEntries.length > 0 ? (
                    <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 sm:p-5">
                        <div className="relative pl-6 border-l border-white/[0.12] space-y-4">
                            {timelineEntries.map((entry) => {
                                const timeLabel = new Date(entry.consumedAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                });

                                if (entry.kind === 'drink') {
                                    const drink = entry.data;
                                    return (
                                        <div key={entry.id} className="relative flex items-center justify-between gap-3">
                                            <span
                                                className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-red-500 ring-4 ring-[#111114]"
                                                aria-hidden="true"
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[11px] font-bold text-zinc-400 tabular-nums">
                                                        {timeLabel}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 text-sm font-bold text-white truncate">
                                                        <Wine className="w-3.5 h-3.5 text-red-400 shrink-0" aria-hidden="true" />
                                                        <span className="truncate">{drink.drinkName}</span>
                                                    </span>
                                                    {drink.stomachState && drink.stomachState !== 'LightSnack' && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300">
                                                            {drink.stomachState === 'Empty' ? 'Empty' : 'Full Meal'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-zinc-400 tabular-nums mt-0.5">
                                                    <strong className="text-red-400">+{drink.pureAlcoholGrams.toFixed(1)} g</strong>
                                                    {drink.totalKcal ? (
                                                        <span className="text-amber-300 ml-2">{drink.totalKcal} kcal</span>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingEvent(drink)}
                                                    aria-label={`Edit ${drink.drinkName} log`}
                                                    className="w-9 h-9 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center dose-press"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDrinkToDelete(drink)}
                                                    aria-label={`Delete ${drink.drinkName} log`}
                                                    className="w-9 h-9 rounded-xl bg-[#0c0c0f] hover:bg-red-950/60 border border-white/[0.08] text-zinc-400 hover:text-red-400 flex items-center justify-center dose-press"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                const water = entry.data;
                                return (
                                    <div key={entry.id} className="relative flex items-center justify-between gap-3">
                                        <span
                                            className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-sky-400 ring-4 ring-[#111114]"
                                            aria-hidden="true"
                                        />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[11px] font-bold text-zinc-400 tabular-nums">
                                                    {timeLabel}
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-sm font-bold text-sky-300 tabular-nums">
                                                    <Droplets className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
                                                    <span>{water.amountCl} cl Water</span>
                                                </span>
                                                <span className="text-[11px] text-zinc-400 tabular-nums">
                                                    ({water.amountCl * 10} ml)
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setEditingWater(water)}
                                                aria-label="Edit water log"
                                                className="w-9 h-9 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center dose-press"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setWaterToDelete(water)}
                                                aria-label="Delete water log"
                                                className="w-9 h-9 rounded-xl bg-[#0c0c0f] hover:bg-red-950/60 border border-white/[0.08] text-zinc-400 hover:text-red-400 flex items-center justify-center dose-press"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                        <span>No drinks or water logged in the last 12 hours.</span>
                    </div>
                )}
            </section>

            <EditDrinkLogModal
                event={editingEvent}
                isOpen={!!editingEvent}
                onClose={() => setEditingEvent(null)}
            />

            <EditWaterLogModal
                event={editingWater}
                isOpen={!!editingWater}
                onClose={() => setEditingWater(null)}
            />

            <LogWaterModal
                isOpen={isWaterModalOpen}
                onClose={() => setIsWaterModalOpen(false)}
            />

            <ConfirmDialogModal
                isOpen={!!drinkToDelete}
                title="Delete Drink Log?"
                message={`Remove “${drinkToDelete?.drinkName ?? ''}” from your records? Your BAC, hangover risk, and calorie totals will recalculate immediately.`}
                confirmLabel="Delete Log"
                isDestructive
                isLoading={deleteDrinkMutation.isPending}
                onConfirm={() => {
                    if (drinkToDelete) {
                        deleteDrinkMutation.mutate(drinkToDelete.logId);
                    }
                }}
                onCancel={() => setDrinkToDelete(null)}
            />

            <ConfirmDialogModal
                isOpen={!!waterToDelete}
                title="Delete Water Entry?"
                message={`Remove water intake of ${waterToDelete?.amountCl ?? 0} cl (${(waterToDelete?.amountCl ?? 0) * 10} ml)? Hydration and safe score will recalculate.`}
                confirmLabel="Delete Water"
                isDestructive
                isLoading={deleteWaterMutation.isPending}
                onConfirm={() => {
                    if (waterToDelete) {
                        deleteWaterMutation.mutate(waterToDelete.id);
                    }
                }}
                onCancel={() => setWaterToDelete(null)}
            />
        </div>
    );
};
