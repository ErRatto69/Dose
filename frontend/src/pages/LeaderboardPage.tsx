import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { normalizeUnit } from '@/utils/units';
import { Trophy, Flame, Award, Sparkles, Crown, Eye, Loader2, Calendar } from 'lucide-react';

const TIER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    eye: Eye,
    glass: Sparkles,
    sparkles: Sparkles,
    flame: Flame,
    crown: Crown,
};

const LEAGUE_TIERS_REFERENCE = [
    { name: 'Observer', minGrams: 0, minCl: 0, icon: 'eye', color: '#9CA3AF' },
    { name: 'Casual Drinker', minGrams: 40, minCl: 5.1, icon: 'glass', color: '#38BDF8' },
    { name: 'Amateur Mixer', minGrams: 120, minCl: 15.2, icon: 'sparkles', color: '#10B981' },
    { name: 'Pro Taster', minGrams: 240, minCl: 30.4, icon: 'flame', color: '#F59E0B' },
    { name: 'Master Alchemist', minGrams: 400, minCl: 50.7, icon: 'crown', color: '#EF4444' },
];

export const LeaderboardPage: React.FC = () => {
    const { preferredUnit } = usePreferencesStore();
    const unit = normalizeUnit(preferredUnit);

    const { data: leaderboard, isLoading } = useQuery({
        queryKey: ['monthly-leaderboard'],
        queryFn: () => bacApi.getLeaderboard(),
    });

    if (isLoading || !leaderboard) {
        return (
            <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                <span className="text-xs">Fetching monthly league standings...</span>
            </div>
        );
    }

    const formatAlcoholTotal = (grams: number, cl: number) => {
        return unit === 'cl' ? `${cl.toFixed(1)} cl` : `${grams.toFixed(1)} g`;
    };

    return (
        <div className="space-y-6">
            {/* Hero Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                        Monthly Standings &amp; Progression
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                        {leaderboard.period} League
                    </h1>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        Resets on {new Date(leaderboard.resetsAt).toLocaleDateString()}
                    </p>
                </div>

                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Trophy className="w-7 h-7" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Standings */}
                <div className="lg:col-span-8 space-y-4">
                    {/* Top 3 Podium Cards (Desktop Grid) */}
                    {leaderboard.entries.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {leaderboard.entries.slice(0, 3).map((entry) => {
                                const IconComponent = TIER_ICONS[entry.currentTier.badgeIcon] || Award;
                                const isFirst = entry.rank === 1;
                                return (
                                    <div
                                        key={entry.userId}
                                        className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                                            isFirst
                                                ? 'bg-amber-950/25 border-amber-500/50 shadow-lg shadow-amber-500/5'
                                                : 'bg-slate-900 border-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span
                                                className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                                                    entry.rank === 1
                                                        ? 'bg-amber-500 text-slate-950'
                                                        : entry.rank === 2
                                                            ? 'bg-slate-300 text-slate-950'
                                                            : 'bg-amber-700 text-white'
                                                }`}
                                            >
                                                #{entry.rank}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium">
                                                {entry.drinksCount} drink(s)
                                            </span>
                                        </div>

                                        <div>
                                            <h3 className="text-base font-black text-white truncate">
                                                {entry.username}
                                            </h3>
                                            <div
                                                className="flex items-center gap-1 text-xs font-bold mt-0.5"
                                                style={{ color: entry.currentTier.colorHex }}
                                            >
                                                <IconComponent className="w-3.5 h-3.5" />
                                                <span>{entry.currentTier.name}</span>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-800/80 flex items-baseline justify-between">
                                            <span className="text-[11px] text-slate-400">Pure Alcohol</span>
                                            <strong className="text-lg font-black text-amber-400 font-mono">
                                                {formatAlcoholTotal(
                                                    entry.monthlyPureAlcoholGrams,
                                                    entry.monthlyPureAlcoholCl
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Detailed Standings Table / List */}
                    <div className="space-y-3">
                        {leaderboard.entries.map((entry) => {
                            const IconComponent = TIER_ICONS[entry.currentTier.badgeIcon] || Award;
                            return (
                                <div
                                    key={entry.userId}
                                    className={`p-5 rounded-2xl border transition-all ${
                                        entry.rank === 1
                                            ? 'bg-amber-950/20 border-amber-500/40'
                                            : 'bg-slate-900 border-slate-800'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-4 mb-3">
                                        <div className="flex items-center gap-3.5">
                                            <div
                                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                                                    entry.rank === 1
                                                        ? 'bg-amber-500 text-slate-950'
                                                        : entry.rank === 2
                                                            ? 'bg-slate-300 text-slate-950'
                                                            : entry.rank === 3
                                                                ? 'bg-amber-700 text-white'
                                                                : 'bg-slate-800 text-slate-400'
                                                }`}
                                            >
                                                {entry.rank}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-white leading-tight">
                                                    {entry.username}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                                                    <span
                                                        className="font-bold flex items-center gap-1"
                                                        style={{ color: entry.currentTier.colorHex }}
                                                    >
                                                        <IconComponent className="w-3.5 h-3.5" />
                                                        {entry.currentTier.name}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{entry.drinksCount} drinks logged</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-lg font-black text-amber-400 font-mono">
                                                {formatAlcoholTotal(
                                                    entry.monthlyPureAlcoholGrams,
                                                    entry.monthlyPureAlcoholCl
                                                )}
                                            </span>
                                            <p className="text-[11px] text-slate-500 font-medium">
                                                pure alcohol
                                            </p>
                                        </div>
                                    </div>

                                    {entry.gramsToNextTier > 0 && (
                                        <div className="pt-3 border-t border-slate-800/80">
                                            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                                                <span>
                                                    Progress to next tier ({entry.gramsToNextTier.toFixed(1)}g remaining)
                                                </span>
                                                <span className="font-mono font-bold text-amber-400">
                                                    {entry.nextTierProgressPercent}%
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${entry.nextTierProgressPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {leaderboard.entries.length === 0 && (
                            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-500">
                                No drinks logged yet this month. Be the first to start the board!
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Ranking Tiers Reference */}
                <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            Progression System
                        </span>
                        <h3 className="text-base font-bold text-white">Monthly Ranking Tiers</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Tiers are unlocked based on your cumulative pure alcohol intake during the calendar month.
                        </p>
                    </div>

                    <div className="space-y-2.5">
                        {LEAGUE_TIERS_REFERENCE.map((tier) => {
                            const Icon = TIER_ICONS[tier.icon] || Award;
                            return (
                                <div
                                    key={tier.name}
                                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-900 border border-slate-800"
                                            style={{ color: tier.color }}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div
                                                className="text-xs font-bold"
                                                style={{ color: tier.color }}
                                            >
                                                {tier.name}
                                            </div>
                                            <div className="text-[10px] text-slate-500">
                                                Min. threshold
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-300">
                                        {unit === 'cl' ? `${tier.minCl} cl` : `${tier.minGrams} g`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};