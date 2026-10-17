import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { bacApi } from '@/api/bac.api';
import { useAuthStore } from '@/store/useAuthStore';
import { BacGaugeCard } from '@/components/safety/BacGaugeCard';
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
} from 'lucide-react';

export const MyBacDashboardPage: React.FC = () => {
    const { user } = useAuthStore();

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

    if (isLoading) {
        return (
            <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                <span className="text-xs">Computing biological alcohol curve...</span>
            </div>
        );
    }

    if (isError || !bacData) {
        return (
            <div className="py-16 max-w-md mx-auto text-center space-y-3 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                <h2 className="text-base font-bold text-white">Unable to load BAC telemetry</h2>
                <p className="text-xs text-slate-400">
                    Please make sure the backend server is running and updated.
                </p>
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs inline-flex items-center gap-2"
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                        Widmark-Watson Biometrics
                    </span>
                    <h1 className="text-2xl font-black text-white">My BAC Telemetry</h1>
                </div>

                {user && (
                    <Link
                        to="/profile"
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 self-start sm:self-auto transition-colors"
                    >
                        <UserCheck className="w-4 h-4 text-amber-400" />
                        <span>
                            {user.weightKg} kg • {user.heightCm} cm • {user.sex} (Edit Profile)
                        </span>
                    </Link>
                )}
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

                {/* Right Column: 12h Chart + Active Drinks */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-amber-400" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                    12h Elimination Timeline
                                </h3>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                                Elimination rate: -0.15 g/L / hr
                            </span>
                        </div>

                        <div className="w-full h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData}
                                    margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="bacGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                                    <YAxis
                                        stroke="#64748b"
                                        fontSize={11}
                                        tickLine={false}
                                        domain={[0, (dataMax: number) => Math.max(0.6, Number((dataMax * 1.2).toFixed(2)))]}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0f172a',
                                            borderColor: '#334155',
                                            borderRadius: '0.75rem',
                                            fontSize: '12px',
                                        }}
                                        formatter={(val: unknown) => [`${Number(val).toFixed(2)} g/L`, 'BAC']}
                                    />
                                    <ReferenceLine
                                        y={0.5}
                                        stroke="#f59e0b"
                                        strokeDasharray="3 3"
                                        label={{
                                            value: '0.50 g/L Legal Limit',
                                            fill: '#f59e0b',
                                            fontSize: 10,
                                            position: 'insideTopRight',
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="bac"
                                        stroke="#f59e0b"
                                        strokeWidth={2.5}
                                        fillOpacity={1}
                                        fill="url(#bacGradient)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Active Drinks List */}
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-400" />
                            Active Drinks in Last 12 Hours ({bacData.activeLogsLast12h.length})
                        </h3>

                        {bacData.activeLogsLast12h.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {bacData.activeLogsLast12h.map((drink) => (
                                    <div
                                        key={drink.logId}
                                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-100">{drink.drinkName}</div>
                                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                                {new Date(drink.consumedAt).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </div>
                                        <span className="font-mono font-bold text-amber-400 text-sm">
                                            +{drink.pureAlcoholGrams.toFixed(1)}g
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 rounded-xl bg-slate-950/50 border border-slate-800/80 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                <span>No alcoholic drinks consumed in the last 12 hours.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};