import React, { useState } from 'react';
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
} from 'lucide-react';

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

    if (isLoading) {
        return (
            <div className="space-y-6" aria-busy="true" aria-label="Loading BAC telemetry">
                <div className="h-14 w-72 rounded-2xl bg-[#111114] border border-white/[0.08]" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-28 rounded-2xl bg-[#111114] border border-white/[0.08]" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-5 h-72 rounded-2xl bg-[#111114] border border-white/[0.08]" />
                    <div className="lg:col-span-7 h-72 rounded-2xl bg-[#111114] border border-white/[0.08]" />
                </div>
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

    const activeWaterLogs = bacData.activeWaterLogsLast12h ?? [];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
                        My BAC &amp; Bio-Telemetry
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                        Real-time blood alcohol curve, hydration balance, calories, and 12-hour editable logs.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setIsWaterModalOpen(true)}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-sky-950/60 hover:bg-sky-900/75 border border-sky-500/35 text-sky-200 font-bold text-xs flex items-center gap-2 dose-press"
                    >
                        <Droplets className="w-4 h-4 text-sky-400" aria-hidden="true" />
                        <span>Log Water</span>
                    </button>

                    {user && (
                        <Link
                            to="/profile"
                            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-xs font-bold text-zinc-200 flex items-center gap-2 tabular-nums dose-press"
                        >
                            <UserCheck className="w-4 h-4 text-red-400" aria-hidden="true" />
                            <span>{user.weightKg} kg · {user.sex}</span>
                        </Link>
                    )}
                </div>
            </section>

            {/* 4 Telemetry Readout Cards */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5" aria-label="12-hour bio-telemetry summary">
                {/* 1. Hangover Risk */}
                <div className="p-4 rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                            <HeartPulse className="w-4 h-4 text-rose-400" aria-hidden="true" />
                            <span>Hangover Risk</span>
                        </span>
                        <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                bacData.hangoverRiskPercent > 60
                                    ? 'bg-red-500/15 text-red-300'
                                    : bacData.hangoverRiskPercent > 30
                                        ? 'bg-amber-500/15 text-amber-300'
                                        : 'bg-emerald-500/15 text-emerald-300'
                            }`}
                        >
                            {bacData.hangoverRiskPercent > 60 ? 'High' : bacData.hangoverRiskPercent > 30 ? 'Moderate' : 'Low'}
                        </span>
                    </div>
                    <div>
                        <strong className="text-2xl font-extrabold tabular-nums text-white">
                            {bacData.hangoverRiskPercent}%
                        </strong>
                        <div className="w-full h-1.5 bg-[#0c0c0f] rounded-full mt-2 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-[width] duration-500 ${
                                    bacData.hangoverRiskPercent > 60
                                        ? 'bg-red-500'
                                        : bacData.hangoverRiskPercent > 30
                                            ? 'bg-amber-500'
                                            : 'bg-emerald-500'
                                }`}
                                style={{ width: `${bacData.hangoverRiskPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Hydration Tracker (button, not clickable div) */}
                <button
                    type="button"
                    onClick={() => setIsWaterModalOpen(true)}
                    className="text-left p-4 rounded-2xl bg-[#111114] hover:bg-[#16161b] border border-white/[0.08] hover:border-sky-500/45 flex flex-col justify-between gap-3 dose-press group"
                >
                    <div className="w-full flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-400 group-hover:text-sky-300 flex items-center gap-1.5">
                            <Droplets className="w-4 h-4 text-sky-400" aria-hidden="true" />
                            <span>Water Intake</span>
                        </span>
                        <Plus className="w-4 h-4 text-sky-400" aria-hidden="true" />
                    </div>
                    <div>
                        <strong className="text-2xl font-extrabold tabular-nums text-white block">
                            {waterVolumeLabel}
                        </strong>
                        <span className="text-[11px] text-sky-400 font-semibold mt-0.5 block tabular-nums">
                            {bacData.waterLogsCountLast12h} entry(ies) in 12h
                        </span>
                    </div>
                </button>

                {/* 3. Calories */}
                <div className="p-4 rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col justify-between gap-3">
                    <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-400" aria-hidden="true" />
                        <span>Alcohol Kcal</span>
                    </span>
                    <div>
                        <strong className="text-2xl font-extrabold tabular-nums text-white">
                            {bacData.totalKcalLast12h}{' '}
                            <span className="text-xs font-medium text-zinc-400">kcal</span>
                        </strong>
                        <span className="text-[11px] text-zinc-400 block mt-0.5 truncate tabular-nums">
                            ≈ {workoutEquivalenceMinutes} min cardio
                        </span>
                    </div>
                </div>

                {/* 4. Safe Score */}
                <div className="p-4 rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col justify-between gap-3">
                    <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                        <span>Safe Score</span>
                    </span>
                    <div>
                        <strong className="text-2xl font-extrabold tabular-nums text-emerald-400">
                            {bacData.responsibleDrinkingScore}{' '}
                            <span className="text-xs font-medium text-zinc-400">pts</span>
                        </strong>
                        <span className="text-[11px] text-zinc-400 block mt-0.5">
                            Pacing &amp; hydration points
                        </span>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Semicircular Instrument Gauge */}
                <div className="lg:col-span-5">
                    <BacGaugeCard
                        bacGramsPerLiter={bacData.currentBacGramsPerLiter}
                        bacGramsPerDl={bacData.currentBacGramsPerDl}
                        safetyLevel={bacData.safetyLevel}
                        safetyMessage={bacData.safetyMessage}
                        estimatedSoberAt={bacData.estimatedSoberAt}
                        totalAlcoholGramsLast12h={bacData.totalAlcoholGramsLast12h}
                    />
                </div>

                {/* Right Column: Elimination Curve + Logs */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Elimination Chart */}
                    <section className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08]">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-red-400" aria-hidden="true" />
                                <h2 className="text-sm font-extrabold text-zinc-100">
                                    Elimination Curve
                                </h2>
                            </div>
                            <span className="text-xs text-zinc-400 tabular-nums">
                                Clearance: -0.15 g/L per hour
                            </span>
                        </div>

                        <div className="w-full h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData}
                                    margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
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
                    </section>

                    {/* Active Drinks in Last 12h */}
                    <section className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-sm font-extrabold text-zinc-100 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-red-400" aria-hidden="true" />
                                <span>Drinks in Last 12 Hours ({bacData.activeLogsLast12h.length})</span>
                            </h2>
                            <span className="text-[11px] text-zinc-400">Editable for 12h</span>
                        </div>

                        {bacData.activeLogsLast12h.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {bacData.activeLogsLast12h.map((drink) => (
                                    <div
                                        key={drink.logId}
                                        className="p-3.5 rounded-xl bg-[#0c0c0f] border border-white/[0.08] flex items-center justify-between gap-2 text-xs"
                                    >
                                        <div className="min-w-0">
                                            <div className="font-bold text-zinc-100 truncate flex items-center gap-1.5">
                                                <span className="truncate">{drink.drinkName}</span>
                                                {drink.stomachState && drink.stomachState !== 'LightSnack' && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 shrink-0">
                                                        {drink.stomachState === 'Empty' ? 'Empty' : 'Full Meal'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-zinc-400 tabular-nums mt-0.5">
                                                {new Date(drink.consumedAt).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}{' '}
                                                ·{' '}
                                                <strong className="text-red-400">
                                                    +{drink.pureAlcoholGrams.toFixed(1)} g
                                                </strong>
                                                {drink.totalKcal ? (
                                                    <span className="text-amber-300 ml-1.5">
                                                        ({drink.totalKcal} kcal)
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setEditingEvent(drink)}
                                                aria-label={`Edit ${drink.drinkName} log`}
                                                className="w-9 h-9 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center dose-press"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDrinkToDelete(drink)}
                                                aria-label={`Delete ${drink.drinkName} log`}
                                                className="w-9 h-9 rounded-xl bg-[#111114] hover:bg-red-950/60 border border-white/[0.08] text-zinc-400 hover:text-red-400 flex items-center justify-center dose-press"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-5 rounded-xl bg-[#0c0c0f] border border-white/[0.08] text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                                <span>No drinks logged in the last 12 hours.</span>
                            </div>
                        )}
                    </section>

                    {/* Active Water Logs in Last 12h */}
                    <section className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-sm font-extrabold text-sky-300 flex items-center gap-1.5">
                                <Droplets className="w-4 h-4 text-sky-400" aria-hidden="true" />
                                <span>Water Logs in Last 12 Hours ({activeWaterLogs.length})</span>
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsWaterModalOpen(true)}
                                className="min-h-[34px] px-2.5 rounded-lg text-xs font-bold text-sky-400 hover:text-sky-300 hover:bg-white/[0.04] flex items-center gap-1 dose-press"
                            >
                                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Add Water</span>
                            </button>
                        </div>

                        {activeWaterLogs.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {activeWaterLogs.map((water) => (
                                    <div
                                        key={water.id}
                                        className="p-3.5 rounded-xl bg-[#0c0c0f] border border-white/[0.08] flex items-center justify-between gap-2 text-xs"
                                    >
                                        <div className="min-w-0">
                                            <div className="font-bold text-zinc-100 flex items-center gap-1.5 tabular-nums">
                                                <span className="text-sky-400 font-extrabold">{water.amountCl} cl</span>
                                                <span className="text-zinc-400 text-[11px]">({water.amountCl * 10} ml)</span>
                                            </div>
                                            <div className="text-[11px] text-zinc-400 tabular-nums mt-0.5">
                                                {new Date(water.consumedAt).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setEditingWater(water)}
                                                aria-label="Edit water log"
                                                className="w-9 h-9 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center dose-press"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setWaterToDelete(water)}
                                                aria-label="Delete water log"
                                                className="w-9 h-9 rounded-xl bg-[#111114] hover:bg-red-950/60 border border-white/[0.08] text-zinc-400 hover:text-red-400 flex items-center justify-center dose-press"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-5 rounded-xl bg-[#0c0c0f] border border-white/[0.08] text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                                <Droplets className="w-4 h-4 text-sky-400" aria-hidden="true" />
                                <span>No water logged in the last 12 hours. Hydrate to pace your session.</span>
                            </div>
                        )}
                    </section>
                </div>
            </div>

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
