import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { ShieldAlert, Users, Loader2 } from 'lucide-react';

export const AdminSafetyMonitorPage: React.FC = () => {
    const { data: usersOverview = [], isLoading } = useQuery({
        queryKey: ['admin-bac-overview'],
        queryFn: bacApi.getAdminBacOverview,
        refetchInterval: 15000,
    });

    if (isLoading) {
        return (
            <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                <span className="text-xs">Loading attendees safety status...</span>
            </div>
        );
    }

    const criticalCount = usersOverview.filter(
        (u) => u.safetyLevel === 'Warning' || u.safetyLevel === 'Critical'
    ).length;

    return (
        <div className="py-4 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
                <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
            Host Safety Control
          </span>
                    <h2 className="text-lg font-black text-white">Party BAC Overview</h2>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span>{usersOverview.length} Guests</span>
                </div>
            </div>

            {criticalCount > 0 && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>
            <strong>{criticalCount} guest(s)</strong> have high alcohol levels (&gt; 0.80 g/L). Consider cutting off spirit doses.
          </span>
                </div>
            )}

            <div className="space-y-2.5">
                {usersOverview.map((attendee) => {
                    const isHigh = attendee.safetyLevel === 'Warning' || attendee.safetyLevel === 'Critical';
                    const isCaution = attendee.safetyLevel === 'Caution';

                    return (
                        <div
                            key={attendee.id}
                            className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                                isHigh
                                    ? 'bg-rose-950/20 border-rose-800/60'
                                    : isCaution
                                        ? 'bg-amber-950/20 border-amber-800/60'
                                        : 'bg-slate-900 border-slate-800'
                            }`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-white">{attendee.username}</h3>
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isHigh
                                                ? 'bg-rose-500/20 text-rose-400'
                                                : isCaution
                                                    ? 'bg-amber-500/20 text-amber-400'
                                                    : 'bg-emerald-500/20 text-emerald-400'
                                        }`}
                                    >
                    {attendee.safetyLevel}
                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {attendee.totalDrinksLast12h} drink(s) in last 12h
                                    {attendee.estimatedSoberAt && (
                                        <span>
                      {' '}• Sober at {new Date(attendee.estimatedSoberAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                                    )}
                                </p>
                            </div>

                            <div className="text-right">
                <span
                    className={`text-lg font-black font-mono ${
                        isHigh ? 'text-rose-400' : isCaution ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                >
                  {attendee.currentBacGramsPerLiter.toFixed(2)}
                </span>
                                <span className="text-xs text-slate-400 block font-sans">g/L</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};