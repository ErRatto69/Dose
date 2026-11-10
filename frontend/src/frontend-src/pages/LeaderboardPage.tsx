import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { normalizeUnit } from '@/utils/units';
import {
    Trophy,
    Flame,
    Award,
    Crown,
    Eye,
    Beer,
    Martini,
    Loader2,
    Calendar,
    Medal,
} from 'lucide-react';

const TIER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    eye: Eye,
    beer: Beer,
    martini: Martini,
    flame: Flame,
    crown: Crown,
};

const LEAGUE_TIERS_REFERENCE = [
    { name: 'Observer', minGrams: 0, minCl: 0, icon: 'eye', color: '#9CA3AF' },
    { name: 'Casual Drinker', minGrams: 40, minCl: 5.1, icon: 'beer', color: '#38BDF8' },
    { name: 'Amateur Mixer', minGrams: 120, minCl: 15.2, icon: 'martini', color: '#10B981' },
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
            <div className="py-24 flex flex-col items-center justify-center text-neutral-500 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                <span className="text-xs">Fetching monthly league standings...</span>
            </div>
        );
    }

    const formatAlcoholTotal = (grams: number, cl: number) => {
        return unit === 'cl' ? `${cl.toFixed(1)} cl` : `${grams.toFixed(1)} g`;
    };

    const topThree = leaderboard.entries.slice(0, 3);
    const restOfLeaderboard = leaderboard.entries.slice(3);

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                        {leaderboard.period} Standings
                    </h1>
                    <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-red-500" />
                        Resets on {new Date(leaderboard.resetsAt).toLocaleDateString()}
                    </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-red-600/15 border border-red-600/40 flex items-center justify-center text-red-500 shrink-0 shadow-lg shadow-red-600/20">
                    <Trophy className="w-7 h-7" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Top 3 Podium & Ranks */}
                <div className="lg:col-span-8 space-y-5">
                    {/* Podium Section (Top 3) */}
                    {topThree.length > 0 && (
                        <div>
                            <h2 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-1.5">
                                <Medal className="w-4 h-4 text-red-500" />
                                <span>Podium Leaders</span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                {topThree.map((entry) => {
                                    const IconComponent = TIER_ICONS[entry.currentTier.badgeIcon] || Award;
                                    const isFirst = entry.rank === 1;

                                    return (
                                        <div
                                            key={entry.userId}
                                            className={`p-5 rounded-3xl border flex flex-col justify-between gap-4 transition-all shadow-lg ${
                                                isFirst
                                                    ? 'bg-neutral-900 border-red-600 shadow-red-600/10 order-first sm:order-none'
                                                    : 'bg-neutral-900 border-neutral-800'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className={`px-3 py-1 rounded-xl text-xs font-black ${
                                                        entry.rank === 1
                                                            ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                                                            : entry.rank === 2
                                                                ? 'bg-neutral-300 text-neutral-950'
                                                                : 'bg-amber-700 text-white'
                                                    }`}
                                                >
                                                    #{entry.rank}
                                                </span>
                                                <span className="text-xs text-neutral-400 font-medium">
                                                    {entry.drinksCount} drink(s)
                                                </span>
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-black text-white truncate">
                                                    {entry.username}
                                                </h3>
                                                <div
                                                    className="flex items-center gap-1.5 text-xs font-bold mt-1"
                                                    style={{ color: entry.currentTier.colorHex }}
                                                >
                                                    <IconComponent className="w-4 h-4" />
                                                    <span>{entry.currentTier.name}</span>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-neutral-800 flex items-baseline justify-between">
                                                <span className="text-xs text-neutral-400">Pure Alcohol</span>
                                                <strong className="text-xl font-black text-red-500 font-mono">
                                                    {formatAlcoholTotal(
                                                        entry.monthlyPureAlcoholGrams,
                                                        entry.monthlyPureAlcoholCl
                                                    )}
                                                </strong>
                                            </div>

                                            {entry.gramsToNextTier > 0 && (
                                                <div className="pt-2 border-t border-neutral-800/80">
                                                    <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                                                        <span>Next Tier</span>
                                                        <span className="font-mono text-red-400 font-bold">
                                                            {entry.nextTierProgressPercent}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-red-600 rounded-full"
                                                            style={{ width: `${entry.nextTierProgressPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Compact List for Ranks 4 to 15 */}
                    {restOfLeaderboard.length > 0 && (
                        <div className="space-y-2.5">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 pt-2">
                                Remaining Top Standings (Ranks 4-15)
                            </h2>
                            {restOfLeaderboard.map((entry) => {
                                const IconComponent = TIER_ICONS[entry.currentTier.badgeIcon] || Award;
                                return (
                                    <div
                                        key={entry.userId}
                                        className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3 text-xs"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center font-bold text-neutral-400 shrink-0">
                                                {entry.rank}
                                            </div>
                                            <div>
                                                <strong className="text-sm font-bold text-white block">
                                                    {entry.username}
                                                </strong>
                                                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                                                    <span
                                                        className="font-bold flex items-center gap-1"
                                                        style={{ color: entry.currentTier.colorHex }}
                                                    >
                                                        <IconComponent className="w-3 h-3" />
                                                        {entry.currentTier.name}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{entry.drinksCount} drinks</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <strong className="text-sm font-black text-red-500 font-mono block">
                                                {formatAlcoholTotal(
                                                    entry.monthlyPureAlcoholGrams,
                                                    entry.monthlyPureAlcoholCl
                                                )}
                                            </strong>
                                            <span className="text-[10px] text-neutral-500">pure alcohol</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {leaderboard.entries.length === 0 && (
                        <div className="p-12 rounded-3xl bg-neutral-900 border border-neutral-800 text-center text-xs text-neutral-500">
                            No drinks logged yet this month. Be the first to start the board!
                        </div>
                    )}
                </div>

                {/* Right Column: Tiers Reference Card */}
                <div className="lg:col-span-4 p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
                    <div>
                        <h3 className="text-base font-bold text-white">Ranking Tiers</h3>
                        <p className="text-xs text-neutral-400 mt-0.5">
                            Monthly tiers unlocked based on cumulative alcohol intake.
                        </p>
                    </div>

                    <div className="space-y-2">
                        {LEAGUE_TIERS_REFERENCE.map((tier) => {
                            const Icon = TIER_ICONS[tier.icon] || Award;
                            return (
                                <div
                                    key={tier.name}
                                    className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-neutral-900 border border-neutral-800"
                                            style={{ color: tier.color }}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold" style={{ color: tier.color }}>
                                                {tier.name}
                                            </div>
                                            <div className="text-[10px] text-neutral-500">Min. required</div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-neutral-300">
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