import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
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
import { Activity, Clock, ShieldCheck, Loader2 } from 'lucide-react';

export const MyBacDashboardPage: React.FC = () => {
    const { data: bacData, isLoading } = useQuery({
        queryKey: ['my-bac-status'],
        queryFn: bacApi.getMyBac,
        refetchInterval: 30000,
    });

    if (isLoading || !bacData) {
        return (
            <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                <span className="text-xs">Computing biological alcohol curve...</span>
            </div>
        );
    }

    const chartData = bacData.timeline.map((point) => ({
        time: new Date(point.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        }),
        bac: point.bacGramsPerLiter,
    }));

    return (
        <div className="py-4 space-y-5">
            <BacGaugeCard
                bacGramsPerLiter={bacData.currentBacGramsPerLiter}
                bacGramsPerDl={bacData.currentBacGramsPerDl}
                safetyLevel={bacData.safetyLevel}
                safetyMessage={bacData.safetyMessage}
                estimatedSoberAt={bacData.estimatedSoberAt}
                totalAlcoholGramsLast12h={bacData.totalAlcoholGramsLast12h}
            />

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            12h Elimination Timeline
                        </h3>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">-0.15 g/L / hr</span>
                </div>

                <div className="w-full h-44">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="bacGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 'auto']} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    borderColor: '#334155',
                                    borderRadius: '0.75rem',
                                    fontSize: '11px',
                                }}
                                formatter={(val: unknown) => [`${Number(val).toFixed(2)} g/L`, 'BAC']}
                            />
                            <ReferenceLine
                                y={0.5}
                                stroke="#f59e0b"
                                strokeDasharray="3 3"
                                label={{
                                    value: '0.50 g/L Limit',
                                    fill: '#f59e0b',
                                    fontSize: 9,
                                    position: 'insideTopRight',
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="bac"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#bacGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Active Drinks in System ({bacData.activeLogsLast12h.length})
                </h3>

                {bacData.activeLogsLast12h.length > 0 ? (
                    <div className="space-y-2">
                        {bacData.activeLogsLast12h.map((drink) => (
                            <div
                                key={drink.logId}
                                className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                            >
                                <div>
                                    <div className="font-semibold text-slate-200">{drink.drinkName}</div>
                                    <div className="text-[11px] text-slate-500 font-mono">
                                        {new Date(drink.consumedAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </div>
                                </div>

                                <span className="font-mono font-bold text-amber-400">
                  +{drink.pureAlcoholGrams.toFixed(1)}g pure alc.
                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>No alcoholic drinks consumed in the last 12 hours.</span>
                    </div>
                )}
            </div>
        </div>
    );
};