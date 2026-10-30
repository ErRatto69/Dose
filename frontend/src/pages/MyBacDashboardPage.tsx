import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { bacApi } from '@/api/bac.api';
import { useAuthStore } from '@/store/useAuthStore';
import { BacGaugeCard } from '@/components/safety/BacGaugeCard';
import { EditDrinkLogModal } from '@/components/drink/EditDrinkLogModal';
import { EditWaterLogModal } from '@/components/safety/EditWaterLogModal';
import { LogWaterModal } from '@/components/safety/LogWaterModal';
import type { DrinkEvent, WaterEvent } from '@/types';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceLine,
} from 'recharts';
import {
    Activity,
    Clock,
    ShieldCheck,
    Loader2,
    UserCheck,
    AlertCircle,
    RefreshCw,
    Edit3,
    Trash2,
    X,
    Droplets,
    Flame,
    HeartPulse,
    Award,
    Plus,
} from 'lucide-react';

export const MyBacDashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // Drink state
    const [editingEvent, setEditingEvent] = useState<DrinkEvent | null>(null);
    const [drinkToDelete, setDrinkToDelete] = useState<DrinkEvent | null>(null);

    // Water state
    const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
    const [editingWater, setEditingWater] = useState<WaterEvent | null>(null);
    const [waterToDelete, setWaterToDelete] = useState<WaterEvent | null>(null);

    const {
        data: bacData,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: ['my-bac-status'],
        queryFn: bacApi.getMyBac,
        refetchInterval: 30000,
    });

    const deleteDrinkMutation = useMutation({
        mutationFn: (logId: string) => bacApi.deleteDrinkLog(logId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-bac-status'] });
            queryClient.invalidateQueries({ queryKey: ['monthly-leaderboard'] });
            setDrinkToDelete(null);
        },
    });

    const deleteWaterMutation = useMutation({
        mutationFn: (waterId: string) => bacApi.deleteWaterLog(waterId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-bac-status'] });
            setWaterToDelete(null);
        },
    });

    if (isLoading) {
        return (
            <div className="py-24 flex flex-col items-center justify-center text-neutral-500 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                <span className="text-xs">Computing biological alcohol curve...</span>
            </div>
        );
    }

    if (isError || !bacData) {
        return (
            <div className="py-16 max-w-md mx-auto text-center space-y-3 bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                <h2 className="text-base font-bold text-white">Unable to load BAC telemetry</h2>
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs inline-flex items-center gap-2"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
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
        ? `${(totalWaterCl / 100).toFixed(2)} Liters`
        : `${Math.round(totalWaterCl)} cl`;

    const activeWaterLogs = bacData.activeWaterLogsLast12h ?? [];

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white">My BAC &amp; Bio-Telemetry</h1>
                    <p className="text-xs text-neutral-400 mt-0.5">
                        Real-time blood alcohol, metabolic curves, hydration, and recovery analytics.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Log Water Modal Button */}
                    <button
                        type="button"
                        onClick={() => setIsWaterModalOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-sky-950/70 hover:bg-sky-900/90 border border-sky-600/40 text-sky-200 font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                        <Droplets className="w-4 h-4 text-sky-400 fill-sky-400" />
                        <span>Log Water</span>
                    </button>

                    {user && (
                        <Link
                            to="/profile"
                            className="px-3.5 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 flex items-center gap-2 transition-colors"
                        >
                            <UserCheck className="w-4 h-4 text-red-500" />
                            <span>{user.weightKg} kg • {user.sex}</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Smart Bio-Cards Grid: Hangover Risk, Water, Calories, Safety Points */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Hangover Index */}
                <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-2 shadow-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-400 flex items-center gap-1.5">
                            <HeartPulse className="w-4 h-4 text-rose-500" />
                            Hangover Risk
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            bacData.hangoverRiskPercent > 60 ? 'bg-rose-500/20 text-rose-400' :
                                bacData.hangoverRiskPercent > 30 ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-emerald-500/20 text-emerald-400'
                        }`}>
                            {bacData.hangoverRiskPercent > 60 ? 'High' : bacData.hangoverRiskPercent > 30 ? 'Moderate' : 'Low'}
                        </span>
                    </div>
                    <div>
                        <strong className="text-2xl font-black font-mono text-white">
                            {bacData.hangoverRiskPercent}%
                        </strong>
                        <div className="w-full h-1.5 bg-neutral-950 rounded-full mt-1.5 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    bacData.hangoverRiskPercent > 60 ? 'bg-rose-500' :
                                        bacData.hangoverRiskPercent > 30 ? 'bg-amber-500' :
                                            'bg-emerald-500'
                                }`}
                                style={{ width: `${bacData.hangoverRiskPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Hydration Tracker */}
                <div
                    onClick={() => setIsWaterModalOpen(true)}
                    className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-sky-600/40 flex flex-col justify-between space-y-2 shadow-lg cursor-pointer transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-400 flex items-center gap-1.5 group-hover:text-sky-300">
                            <Droplets className="w-4 h-4 text-sky-400" />
                            Water Intake
                        </span>
                        <Plus className="w-3.5 h-3.5 text-sky-400 opacity-60 group-hover:opacity-100" />
                    </div>
                    <div>
                        <strong className="text-2xl font-black font-mono text-white">
                            {waterVolumeLabel}
                        </strong>
                        <span className="text-[11px] text-sky-400 block mt-0.5 font-medium">
                            {bacData.waterLogsCountLast12h} drink session(s) in 12h
                        </span>
                    </div>
                </div>

                {/* 3. Session Calories & Fitness Burn */}
                <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-2 shadow-lg">
                    <span className="text-xs text-neutral-400 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-500" />
                        Alcohol Kcal
                    </span>
                    <div>
                        <strong className="text-2xl font-black font-mono text-white">
                            {bacData.totalKcalLast12h} <span className="text-xs font-normal text-neutral-400">kcal</span>
                        </strong>
                        <span className="text-[10px] text-neutral-400 block mt-0.5 truncate">
                            ≈ {workoutEquivalenceMinutes} min running / cardio
                        </span>
                    </div>
                </div>

                {/* 4. Responsible Score */}
                <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-2 shadow-lg">
                    <span className="text-xs text-neutral-400 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-400" />
                        Safe Score
                    </span>
                    <div>
                        <strong className="text-2xl font-black font-mono text-emerald-400">
                            {bacData.responsibleDrinkingScore} <span className="text-xs font-normal text-neutral-400">pts</span>
                        </strong>
                        <span className="text-[10px] text-neutral-400 block mt-0.5">
                            Pacing &amp; hydration points
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Gauge */}
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

                {/* Right Column: Timeline Chart + Active Drinks + Active Water */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Elimination Chart */}
                    <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-red-500" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                                    Elimination Curve
                                </h3>
                            </div>
                            <span className="text-[11px] text-neutral-400 font-mono">
                                Metabolic rate: -0.15 g/L / hr
                            </span>
                        </div>

                        <div className="w-full h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData}
                                    margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.5} />
                                            <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" stroke="#52525b" fontSize={11} tickLine={false} />
                                    <YAxis
                                        stroke="#52525b"
                                        fontSize={11}
                                        tickLine={false}
                                        domain={[0, (dataMax: number) => Math.max(0.6, Number((dataMax * 1.2).toFixed(2)))]}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#171717',
                                            borderColor: '#262626',
                                            borderRadius: '1rem',
                                            fontSize: '12px',
                                        }}
                                        formatter={(val: unknown) => [`${Number(val).toFixed(2)} g/L`, 'BAC']}
                                    />
                                    <ReferenceLine
                                        y={0.5}
                                        stroke="#ef4444"
                                        strokeDasharray="3 3"
                                        label={{
                                            value: '0.50 g/L Legal Limit',
                                            fill: '#ef4444',
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
                                        fill="url(#redGradient)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Active Drinks in Last 12h */}
                    <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-red-500" />
                                Drinks in Last 12 Hours ({bacData.activeLogsLast12h.length})
                            </h3>
                            <span className="text-[11px] text-neutral-500">
                                Editable for 12 hours
                            </span>
                        </div>

                        {bacData.activeLogsLast12h.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {bacData.activeLogsLast12h.map((drink) => (
                                    <div
                                        key={drink.logId}
                                        className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <div className="font-bold text-neutral-100 truncate flex items-center gap-1.5">
                                                <span>{drink.drinkName}</span>
                                                {drink.stomachState && drink.stomachState !== 'LightSnack' && (
                                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                                                        {drink.stomachState === 'Empty' ? 'Empty Stomach' : 'Full Meal'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                                                {new Date(drink.consumedAt).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}{' '}
                                                •{' '}
                                                <strong className="text-red-400">
                                                    +{drink.pureAlcoholGrams.toFixed(1)}g
                                                </strong>
                                                {drink.totalKcal ? (
                                                    <span className="text-amber-400 ml-1.5 font-sans">
                                                        (~{drink.totalKcal} kcal)
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setEditingEvent(drink)}
                                                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
                                                title="Edit drink"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDrinkToDelete(drink)}
                                                className="p-2 rounded-xl bg-neutral-900 hover:bg-red-950/70 border border-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
                                                title="Delete drink"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                <span>No drinks consumed in the last 12 hours.</span>
                            </div>
                        )}
                    </div>

                    {/* Active Water Hydration Logs in Last 12h */}
                    <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                                <Droplets className="w-4 h-4 fill-sky-400" />
                                Water Logs in Last 12 Hours ({activeWaterLogs.length})
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsWaterModalOpen(true)}
                                className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Water</span>
                            </button>
                        </div>

                        {activeWaterLogs.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {activeWaterLogs.map((water) => (
                                    <div
                                        key={water.id}
                                        className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <div className="font-bold text-neutral-100 flex items-center gap-1.5">
                                                <span className="text-sky-400 font-mono font-black">{water.amountCl} cl</span>
                                                <span className="text-neutral-500 text-[11px]">({water.amountCl * 10} ml)</span>
                                            </div>
                                            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
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
                                                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
                                                title="Edit water log"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setWaterToDelete(water)}
                                                className="p-2 rounded-xl bg-neutral-900 hover:bg-red-950/70 border border-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
                                                title="Delete water log"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                                <Droplets className="w-4 h-4 text-sky-400" />
                                <span>No water logged in the last 12 hours. Stay hydrated!</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
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

            {/* Delete Drink Confirmation Dialog */}
            {drinkToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md">
                    <div
                        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-red-600/15 border border-red-600/30 flex items-center justify-center text-red-500">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <button
                                type="button"
                                onClick={() => setDrinkToDelete(null)}
                                className="p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div>
                            <h3 className="text-base font-bold text-white">Delete Drink Log?</h3>
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                                Remove <strong className="text-neutral-200">{drinkToDelete.drinkName}</strong> from your records? Your current BAC, hangover risk, and calorie counters will be recalculated immediately.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                            <button
                                type="button"
                                onClick={() => setDrinkToDelete(null)}
                                disabled={deleteDrinkMutation.isPending}
                                className="px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => deleteDrinkMutation.mutate(drinkToDelete.logId)}
                                disabled={deleteDrinkMutation.isPending}
                                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all active:scale-95"
                            >
                                {deleteDrinkMutation.isPending ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                )}
                                <span>Delete Log</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Water Confirmation Dialog */}
            {waterToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md">
                    <div
                        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-sky-950/60 border border-sky-600/40 flex items-center justify-center text-sky-400">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <button
                                type="button"
                                onClick={() => setWaterToDelete(null)}
                                className="p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div>
                            <h3 className="text-base font-bold text-white">Delete Water Entry?</h3>
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                                Remove water intake of <strong className="text-sky-300">{waterToDelete.amountCl} cl</strong> ({waterToDelete.amountCl * 10} ml)? Your hydration tracking, hangover score, and safety points will be updated.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                            <button
                                type="button"
                                onClick={() => setWaterToDelete(null)}
                                disabled={deleteWaterMutation.isPending}
                                className="px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => deleteWaterMutation.mutate(waterToDelete.id)}
                                disabled={deleteWaterMutation.isPending}
                                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-600/30 transition-all active:scale-95"
                            >
                                {deleteWaterMutation.isPending ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                )}
                                <span>Delete Water</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};