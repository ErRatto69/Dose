import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { PaginationControls } from '@/components/common/PaginationControls';
import { ShieldAlert, Users, Loader2, Search, X } from 'lucide-react';

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

    const { data: pagedSafety, isLoading } = useQuery({
        queryKey: ['admin-bac-overview', pageNumber, debouncedSearch],
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
            <div className="py-24 flex flex-col items-center justify-center text-neutral-500 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                <span className="text-xs">Loading attendees safety status...</span>
            </div>
        );
    }

    const criticalCount = pagedSafety?.criticalCount ?? 0;
    const attendees = pagedSafety?.items ?? [];

    return (
        <div className="py-4 space-y-4">
            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div>
                    <h2 className="text-xl font-black text-white">Party BAC Overview</h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                        Live blood alcohol levels and sober predictions for all active guests.
                    </p>
                </div>
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-bold text-neutral-200">
                    <Users className="w-4 h-4 text-red-500" />
                    <span>{pagedSafety?.totalCount ?? 0} Guests</span>
                </div>
            </div>

            {criticalCount > 0 && (
                <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/80 text-red-300 text-xs flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                    <span>
                        <strong>{criticalCount} guest(s)</strong> have high alcohol levels (&gt; 0.80 g/L). Consider cutting off spirit doses.
                    </span>
                </div>
            )}

            {/* Search filter */}
            <div className="relative max-w-md">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search guest by username..."
                    className="w-full pl-10 pr-9 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="space-y-2.5">
                {attendees.map((attendee) => {
                    const isHigh = attendee.safetyLevel === 'Warning' || attendee.safetyLevel === 'Critical';
                    const isCaution = attendee.safetyLevel === 'Caution';

                    return (
                        <div
                            key={attendee.id}
                            className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                                isHigh
                                    ? 'bg-red-950/20 border-red-800/60'
                                    : isCaution
                                        ? 'bg-amber-950/20 border-amber-800/60'
                                        : 'bg-neutral-900 border-neutral-800'
                            }`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-white">{attendee.username}</h3>
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isHigh
                                                ? 'bg-red-500/20 text-red-400'
                                                : isCaution
                                                    ? 'bg-amber-500/20 text-amber-400'
                                                    : 'bg-emerald-500/20 text-emerald-400'
                                        }`}
                                    >
                                        {attendee.safetyLevel}
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-400 mt-0.5">
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
                                        isHigh ? 'text-red-400' : isCaution ? 'text-amber-400' : 'text-emerald-400'
                                    }`}
                                >
                                    {attendee.currentBacGramsPerLiter.toFixed(2)}
                                </span>
                                <span className="text-xs text-neutral-500 block font-sans">g/L</span>
                            </div>
                        </div>
                    );
                })}
            </div>

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