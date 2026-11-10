import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { gamificationApi } from '@/api/gamification.api';
import { queryKeys } from '@/api/queryKeys';
import { MonthlyBadgeChip } from '@/components/gamification/MonthlyBadgeChip';
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
    Calendar,
    Medal,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
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

    const { data: leaderboard, isLoading, isError, refetch } = useQuery({
        queryKey: queryKeys.leaderboard.monthly(),
        queryFn: () => bacApi.getLeaderboard(),
    });

    const { data: myMonthlyBadges } = useQuery({
        queryKey: queryKeys.gamification.monthlyBadges(),
        queryFn: () => gamificationApi.getMonthlyBadges(),
    });

    if (isLoading) {
        return (
            <div className="space-y-6" aria-busy="true" aria-label="Loading monthly leaderboard">
                <div className="h-14 w-64 rounded-xl bg-[#111114] border border-white/[0.08]" />
                <div className="h-56 rounded-2xl bg-[#111114] border border-white/[0.08]" />
                <div className="h-64 rounded-2xl bg-[#111114] border border-white/[0.08]" />
            </div>
        );
    }

    if (isError || !leaderboard) {
        return (
            <div className="py-16 max-w-md mx-auto text-center space-y-3 bg-[#111114] border border-white/[0.08] rounded-2xl p-6">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto" aria-hidden="true" />
                <h1 className="text-base font-extrabold text-white">Unable to load standings</h1>
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

    const formatAlcoholTotal = (grams: number, cl: number) => {
        return unit === 'cl' ? `${cl.toFixed(1)} cl` : `${grams.toFixed(1)} g`;
    };

    const first = leaderboard.entries[0];
    const runnersUp = leaderboard.entries.slice(1, 3);
    const restOfLeaderboard = leaderboard.entries.slice(3);

    return (
        <div className="space-y-6">
            {/* Header */}
            <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-wide leading-none">
                        {leaderboard.period.toUpperCase()} STANDINGS
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 flex items-center gap-1.5 tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                        <span>Resets on {new Date(leaderboard.resetsAt).toLocaleDateString()}</span>
                    </p>
                </div>

                <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-[#111114] border border-white/[0.08] text-xs font-bold text-zinc-200 tabular-nums">
                    <Trophy className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                    <span>{leaderboard.entries.length} ranked</span>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 space-y-6">
                    {/* Stepped Podium Board */}
                    {first && (
                        <section className="space-y-3">
                            <h2 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                                <Medal className="w-4 h-4 text-red-400" aria-hidden="true" />
                                <span>Podium Leaders</span>
                            </h2>

                            <div className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden">
                                {/* #1 Leader Featured Row */}
                                {(() => {
                                    const Icon1 = TIER_ICONS[first.currentTier.badgeIcon] || Crown;
                                    return (
                                        <div className="p-5 bg-gradient-to-br from-red-950/35 via-[#141419] to-[#111114] border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="space-y-2 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-extrabold tabular-nums">
                                                        #1 Leader
                                                    </span>
                                                    <span className="text-xs text-zinc-400 tabular-nums">
                                                        {first.drinksCount} drinks
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-display text-3xl font-extrabold tracking-wide text-white truncate">
                                                        {first.username}
                                                    </h3>
                                                    {first.monthlyBadges?.map((badge) => (
                                                        <MonthlyBadgeChip key={badge.key} badge={badge} />
                                                    ))}
                                                </div>

                                                <div
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold"
                                                    style={{ color: first.currentTier.colorHex }}
                                                >
                                                    <Icon1 className="w-4 h-4" aria-hidden="true" />
                                                    <span>{first.currentTier.name}</span>
                                                </div>
                                            </div>

                                            <div className="sm:text-right shrink-0 space-y-1">
                                                <span className="text-[11px] text-zinc-400 block">Pure Ethanol</span>
                                                <strong className="text-2xl sm:text-3xl font-extrabold text-red-400 tabular-nums block leading-none">
                                                    {formatAlcoholTotal(
                                                        first.monthlyPureAlcoholGrams,
                                                        first.monthlyPureAlcoholCl
                                                    )}
                                                </strong>
                                                {first.gramsToNextTier > 0 && (
                                                    <span className="text-[11px] text-zinc-400 tabular-nums block pt-1">
                                                        Next tier: {first.nextTierProgressPercent}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* #2 and #3 Side-by-Side Split on Mobile & Desktop */}
                                {runnersUp.length > 0 && (
                                    <div className="grid grid-cols-2 divide-x divide-white/[0.08]">
                                        {runnersUp.map((entry) => {
                                            const IconComp = TIER_ICONS[entry.currentTier.badgeIcon] || Award;
                                            return (
                                                <div key={entry.userId} className="p-4 flex flex-col justify-between gap-3">
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums ${
                                                                    entry.rank === 2
                                                                        ? 'bg-zinc-200 text-zinc-950'
                                                                        : 'bg-amber-600 text-white'
                                                                }`}
                                                            >
                                                                #{entry.rank}
                                                            </span>
                                                            <span className="text-[11px] text-zinc-400 tabular-nums">
                                                                {entry.drinksCount}d
                                                            </span>
                                                        </div>

                                                        <h3 className="font-display text-xl font-bold tracking-wide text-white truncate">
                                                            {entry.username}
                                                        </h3>

                                                        <div
                                                            className="flex items-center gap-1 text-[11px] font-bold"
                                                            style={{ color: entry.currentTier.colorHex }}
                                                        >
                                                            <IconComp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                                            <span className="truncate">{entry.currentTier.name}</span>
                                                        </div>

                                                        {entry.monthlyBadges && entry.monthlyBadges.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 pt-1">
                                                                {entry.monthlyBadges.map((badge) => (
                                                                    <MonthlyBadgeChip key={badge.key} badge={badge} />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="pt-2.5 border-t border-white/[0.06] flex items-baseline justify-between gap-1">
                                                        <span className="text-[11px] text-zinc-400">Ethanol</span>
                                                        <strong className="text-sm font-extrabold text-red-400 tabular-nums">
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
                            </div>
                        </section>
                    )}

                    {/* Scoreboard Ledger for Ranks 4+ */}
                    {restOfLeaderboard.length > 0 && (
                        <section className="space-y-2.5">
                            <h2 className="text-xs font-bold text-zinc-300">
                                Remaining Standings (Ranks 4–15)
                            </h2>
                            <div className="rounded-2xl bg-[#111114] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
                                {restOfLeaderboard.map((entry) => {
                                    const IconComponent = TIER_ICONS[entry.currentTier.badgeIcon] || Award;
                                    return (
                                        <div
                                            key={entry.userId}
                                            className="px-4 py-3 flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="w-6 text-center font-extrabold text-zinc-400 tabular-nums shrink-0">
                                                    {entry.rank}
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <strong className="text-sm font-bold text-white truncate">
                                                            {entry.username}
                                                        </strong>
                                                        {entry.monthlyBadges?.map((badge) => (
                                                            <MonthlyBadgeChip key={badge.key} badge={badge} />
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5 tabular-nums">
                                                        <span
                                                            className="font-bold flex items-center gap-1"
                                                            style={{ color: entry.currentTier.colorHex }}
                                                        >
                                                            <IconComponent className="w-3 h-3" aria-hidden="true" />
                                                            <span>{entry.currentTier.name}</span>
                                                        </span>
                                                        <span aria-hidden="true">·</span>
                                                        <span>{entry.drinksCount} drinks</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <strong className="text-sm font-extrabold text-red-400 tabular-nums shrink-0">
                                                {formatAlcoholTotal(
                                                    entry.monthlyPureAlcoholGrams,
                                                    entry.monthlyPureAlcoholCl
                                                )}
                                            </strong>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {leaderboard.entries.length === 0 && (
                        <div className="p-12 rounded-2xl bg-[#111114] border border-white/[0.08] text-center text-xs text-zinc-400">
                            No drinks logged yet this month. Pour the first cocktail to open the board.
                        </div>
                    )}
                </div>

                {/* Right Column: Tiers & Rolling Monthly Badges */}
                <div className="lg:col-span-4 space-y-5">
                    <section className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden">
                        <div className="px-4 py-3.5 border-b border-white/[0.08] bg-[#0c0c0f]">
                            <h2 className="text-sm font-extrabold text-white">Ranking Tiers</h2>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                                Monthly thresholds by cumulative ethanol.
                            </p>
                        </div>

                        <div className="divide-y divide-white/[0.06]">
                            {LEAGUE_TIERS_REFERENCE.map((tier) => {
                                const Icon = TIER_ICONS[tier.icon] || Award;
                                return (
                                    <div
                                        key={tier.name}
                                        className="px-4 py-3 flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span style={{ color: tier.color }}>
                                                <Icon className="w-4 h-4" aria-hidden="true" />
                                            </span>
                                            <span className="text-xs font-bold truncate" style={{ color: tier.color }}>
                                                {tier.name}
                                            </span>
                                        </div>
                                        <span className="text-xs tabular-nums font-bold text-zinc-200 shrink-0">
                                            {unit === 'cl' ? `${tier.minCl} cl` : `${tier.minGrams} g`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {myMonthlyBadges && (
                        <section className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden">
                            <div className="px-4 py-3.5 border-b border-white/[0.08] bg-[#0c0c0f] flex items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-red-400" aria-hidden="true" />
                                        <span>Monthly Badges</span>
                                    </h2>
                                    <p className="text-[11px] text-zinc-400 mt-0.5">
                                        Rolling {myMonthlyBadges.period} UTC badges.
                                    </p>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#111114] border border-white/[0.08] text-zinc-200 tabular-nums shrink-0">
                                    {myMonthlyBadges.badges.filter((b) => b.isEarned).length}/
                                    {myMonthlyBadges.badges.length}
                                </span>
                            </div>

                            <div className="divide-y divide-white/[0.06]">
                                {myMonthlyBadges.badges.map((badge) => {
                                    const pct =
                                        badge.targetProgress > 0
                                            ? Math.min(
                                                  100,
                                                  Math.round(
                                                      (badge.currentProgress / badge.targetProgress) * 100
                                                  )
                                              )
                                            : 0;

                                    return (
                                        <div key={badge.key} className="p-3.5 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <MonthlyBadgeChip badge={badge} />
                                                {badge.isEarned ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                                        <span>Earned</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] tabular-nums font-semibold text-zinc-400">
                                                        {badge.currentProgress}/{badge.targetProgress}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-zinc-300 leading-snug">
                                                {badge.description}
                                            </p>
                                            {!badge.isEarned && (
                                                <div className="w-full h-1.5 bg-[#0c0c0f] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-red-600 rounded-full transition-[width] duration-300"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};
