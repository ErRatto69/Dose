import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { queryKeys } from '@/api/queryKeys';
import { PaginationControls } from '@/components/common/PaginationControls';
import { ShieldAlert, Users, Search, X, AlertCircle, RefreshCw } from 'lucide-react';

export const AdminSafetyMonitorPage: React.FC = () => {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pageNumber, setPageNumber] = useState(1);
    const pageSize = 12;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPageNumber(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: pagedSafety, isLoading, isError, refetch } = useQuery({
        queryKey: queryKeys.bac.adminOverview(pageNumber, debouncedSearch),
        queryFn: () =>
            bacApi.getAdminBacOverview({
                pageNumber,
                pageSize,
                search: debouncedSearch.trim() || undefined,
            }),
        refetchInterval: 15000,
    });

    if (isLoading) {
        return (
            <div className="space-y-4" aria-busy="true" aria-label="Loading party safety monitor">
                <div className="h-14 w-64 rounded-2xl bg-[#111114] border border-white/[0.08]" />
                <div className="space-y-2.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-2xl bg-[#111114] border border-white/[0.08]" />
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="py-16 max-w-md mx-auto text-center space-y-3 bg-[#111114] border border-white/[0.08] rounded-2xl p-6">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto" aria-hidden="true" />
                <h1 className="text-base font-extrabold text-white">Unable to load safety overview</h1>
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

    const criticalCount = pagedSafety?.criticalCount ?? 0;
    const attendees = pagedSafety?.items ?? [];

    return (
        <div className="space-y-5">
            <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-wide leading-none">
                        PARTY SAFETY MONITOR
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                        Live blood alcohol levels and sobriety estimates across all active guests.
                    </p>
                </div>
                <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 rounded-xl bg-[#111114] border border-white/[0.08] text-xs font-bold text-zinc-200 tabular-nums">
                    <Users className="w-4 h-4 text-red-400" aria-hidden="true" />
                    <span>{pagedSafety?.totalCount ?? 0} Guests</span>
                </div>
            </section>

            {criticalCount > 0 && (
                <div
                    role="status"
                    aria-live="polite"
                    className="p-3.5 rounded-2xl bg-red-950/50 border border-red-700/60 text-red-100 text-xs flex items-center gap-2.5"
                >
                    <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" aria-hidden="true" />
                    <span>
                        <strong className="tabular-nums">{criticalCount} guest(s)</strong> exceed 0.80 g/L. Consider pausing spirit pours and offering water.
                    </span>
                </div>
            )}

            <div className="relative max-w-md">
                <Search
                    className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                />
                <input
                    type="search"
                    aria-label="Search guest by username"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search guest by username…"
                    className="w-full min-h-[44px] pl-10 pr-10 py-2.5 rounded-xl text-sm dose-input"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        aria-label="Clear guest search"
                        className="w-9 h-9 rounded-lg flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                )}
            </div>

            {attendees.length === 0 ? (
                <div className="py-16 text-center text-zinc-400 bg-[#111114] border border-white/[0.08] rounded-2xl text-sm">
                    No active guests match your filter.
                </div>
            ) : (
                <>
                    {/* Desktop Operational Table */}
                    <div className="hidden md:block rounded-2xl bg-[#111114] border border-white/[0.08] overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-white/[0.08] bg-[#0c0c0f] text-zinc-400 font-bold">
                                    <th className="py-3 px-4">Guest</th>
                                    <th className="py-3 px-4">Safety Status</th>
                                    <th className="py-3 px-4">12h Drinks</th>
                                    <th className="py-3 px-4">Est. Sober</th>
                                    <th className="py-3 px-4 text-right">Current BAC</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.06]">
                                {attendees.map((attendee) => {
                                    const isHigh = attendee.safetyLevel === 'Warning' || attendee.safetyLevel === 'Critical';
                                    const isCaution = attendee.safetyLevel === 'Caution';
                                    return (
                                        <tr
                                            key={attendee.id}
                                            className={`transition-colors ${
                                                isHigh
                                                    ? 'bg-red-950/20 hover:bg-red-950/30'
                                                    : isCaution
                                                        ? 'bg-amber-950/15 hover:bg-amber-950/25'
                                                        : 'hover:bg-white/[0.02]'
                                            }`}
                                        >
                                            <td className="py-3.5 px-4 font-bold text-white text-sm">
                                                {attendee.username}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span
                                                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                                        isHigh
                                                            ? 'bg-red-500/20 text-red-300'
                                                            : isCaution
                                                                ? 'bg-amber-500/20 text-amber-300'
                                                                : 'bg-emerald-500/20 text-emerald-300'
                                                    }`}
                                                >
                                                    {attendee.safetyLevel}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 tabular-nums text-zinc-300">
                                                {attendee.totalDrinksLast12h}
                                            </td>
                                            <td className="py-3.5 px-4 tabular-nums text-zinc-300">
                                                {attendee.estimatedSoberAt
                                                    ? new Date(attendee.estimatedSoberAt).toLocaleTimeString([], {
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                      })
                                                    : 'Sober'}
                                            </td>
                                            <td className="py-3.5 px-4 text-right tabular-nums">
                                                <span
                                                    className={`text-base font-extrabold ${
                                                        isHigh ? 'text-red-400' : isCaution ? 'text-amber-400' : 'text-emerald-400'
                                                    }`}
                                                >
                                                    {attendee.currentBacGramsPerLiter.toFixed(2)}
                                                </span>{' '}
                                                <span className="text-zinc-400">g/L</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Rows */}
                    <div className="md:hidden space-y-2.5">
                        {attendees.map((attendee) => {
                            const isHigh = attendee.safetyLevel === 'Warning' || attendee.safetyLevel === 'Critical';
                            const isCaution = attendee.safetyLevel === 'Caution';

                            return (
                                <div
                                    key={attendee.id}
                                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                                        isHigh
                                            ? 'bg-red-950/25 border-red-700/50'
                                            : isCaution
                                                ? 'bg-amber-950/20 border-amber-700/50'
                                                : 'bg-[#111114] border-white/[0.08]'
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-sm font-extrabold text-white truncate">
                                                {attendee.username}
                                            </h2>
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    isHigh
                                                        ? 'bg-red-500/20 text-red-300'
                                                        : isCaution
                                                            ? 'bg-amber-500/20 text-amber-300'
                                                            : 'bg-emerald-500/20 text-emerald-300'
                                                }`}
                                            >
                                                {attendee.safetyLevel}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-400 mt-1 tabular-nums">
                                            {attendee.totalDrinksLast12h} drinks
                                            {attendee.estimatedSoberAt && (
                                                <span>
                                                    {' '}· Sober at{' '}
                                                    {new Date(attendee.estimatedSoberAt).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="text-right shrink-0 tabular-nums">
                                        <span
                                            className={`text-lg font-extrabold block leading-none ${
                                                isHigh ? 'text-red-400' : isCaution ? 'text-amber-400' : 'text-emerald-400'
                                            }`}
                                        >
                                            {attendee.currentBacGramsPerLiter.toFixed(2)}
                                        </span>
                                        <span className="text-[11px] text-zinc-400">g/L</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {pagedSafety && (
                <PaginationControls
                    pageNumber={pagedSafety.pageNumber}
                    totalPages={pagedSafety.totalPages}
                    totalCount={pagedSafety.totalCount}
                    hasPreviousPage={pagedSafety.hasPreviousPage}
                    hasNextPage={pagedSafety.hasNextPage}
                    onPageChange={(p) => setPageNumber(p)}
                    itemLabel="attendees"
                />
            )}
        </div>
    );
};
