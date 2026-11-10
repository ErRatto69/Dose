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
                <div className="h-16 w-64 rounded-2xl bg-[#111114] border border-white/[0.08]" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-44 rounded-2xl bg-[#111114] border border-white/[0.08]" />
                            ))}
                        </div>
                        <div className="h-64 rounded-2xl bg-[#111114] border border-white/[0.08]" />
                    </div>
                    <div className="lg:col-span-4 h-80 rounded-2xl bg-[#111114] border border-white/[0.08]" />
                </div>
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

    const topThree = leaderboard.entries.slice(0, 3);
    const restOfLeaderboard = leaderboard.entries.slice(3);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
                        {leaderboard.period} Standings
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1 flex items-center gap-1.5 tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                        <span>Resets on {new Date(leaderboard.resetsAt).toLocaleDateString()}</span>
                    </p>
                </div>

                <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 rounded-xl bg-[#111114] border border-white/[0.08] text-xs font-bold text-zinc-200 tabular-nums">
                    <Trophy className="w-4 h-4 text-red-400" aria-hidden="true" />
                    <span>{leaderboard.entries.length} active ranked guests</span>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Podium & Standings Table */}
                <div className="lg:col-span-8 space-y-6">
                    {topThree.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-sm font-extrabold text-zinc-200 flex items-center gap-1.5">
                                <Medal className="w-4 h-4 text-red-400" aria-hidden="true" />
                                <span>Podium Leaders</span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                {topThree.map((entry) => {
                                    const IconComponent = TIER_ICONS[entry.currentTier.badgeIcon] || Award;
                                    const isFirst = entry.rank === 1;

                                    return (
                                        <div
                                            key={entry.userId}
                                            className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${
                                                isFirst
                                                    ? 'bg-[#15151a] border-red-500/55 order-first sm:order-none'
                                                    : 'bg-[#111114] border-white/[0.08]'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold tabular-nums ${
                                                        entry.rank === 1
                                                            ? 'bg-red-600 text-white'
                                                            : entry.rank === 2
                                                                ? 'bg-zinc-200 text-zinc-950'
                                                                : 'bg-amber-600 text-white'
                                                    }`}
                                                >
                                                    #{entry.rank}
                                                </span>
                                                <span className="text-xs text-zinc-400 font-semibold tabular-nums">
                                                    {entry.drinksCount} drinks
                                                </span>
                                            </div>

                                            <div>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <h3 className="text-lg font-extrabold text-white truncate">
                                                        {entry.username}
                                                    </h3>
                                                    {entry.monthlyBadges &&
                                                        entry.monthlyBadges.map((badge) => (
                                                            <MonthlyBadgeChip
                                                                key={badge.key}
                                                                badge={badge}
                                                            />
                                                        ))}
                                                </div>
                                                <div
                                                    className="flex items-center gap-1.5 text-xs font-bold mt-1.5"
                                                    style={{ color: entry.currentTier.colorHex }}
                                                >
                                                    <IconComponent className="w-4 h-4" aria-hidden="true" />
                                                    <span>{entry.currentTier.name}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2.5 pt-3 border-t border-white/[0.08]">
                                                <div className="flex items-baseline justify-between">
                                                    <span className="text-xs text-zinc-400">Pure Ethanol</span>
                                                    <strong className="text-xl font-extrabold text-red-400 tabular-nums">
                                                        {formatAlcoholTotal(
                                                            entry.monthlyPureAlcoholGrams,
                                                            entry.monthlyPureAlcoholCl
                                                        )}
                                                    </strong>
                                                </div>

                                                {entry.gramsToNextTier > 0 && (
                                                    <div>
                                                        <div className="flex justify-between text-[11px] text-zinc-400 mb-1 tabular-nums">
                                                            <span>Next tier</span>
                                                            <span className="text-red-400 font-bold">
                                                                {entry.nextTierProgressPercent}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-[#0c0c0f] rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-red-600 rounded-full"
                                                                style={{ width: `${entry.nextTierProgressPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Clean Dense Standings Table List for Ranks 4+ */}
                    {restOfLeaderboard.length > 0 && (
                        <section className="space-y-2.5">
                            <h2 className="text-sm font-extrabold text-zinc-200">
                                Remaining Standings (Ranks 4–15)
                            </h2>
                            <div className="rounded-2xl bg-[#111114] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
                                {restOfLeaderboard.map((entry) => {
                                    const IconComponent = TIER_ICONS[entry.currentTier.badgeIcon] || Award;
                                    return (
                                        <div
                                            key={entry.userId}
                                            className="px-4 py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.02] transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-[#0c0c0f] border border-white/[0.08] flex items-center justify-center font-extrabold text-zinc-300 tabular-nums shrink-0">
                                                    {entry.rank}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <strong className="text-sm font-bold text-white truncate">
                                                            {entry.username}
                                                        </strong>
                                                        {entry.monthlyBadges &&
                                                            entry.monthlyBadges.map((badge) => (
                                                                <MonthlyBadgeChip
                                                                    key={badge.key}
                                                                    badge={badge}
                                                                />
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

                                            <div className="text-right shrink-0">
                                                <strong className="text-sm font-extrabold text-red-400 tabular-nums block">
                                                    {formatAlcoholTotal(
                                                        entry.monthlyPureAlcoholGrams,
                                                        entry.monthlyPureAlcoholCl
                                                    )}
                                                </strong>
                                                <span className="text-[11px] text-zinc-400">ethanol</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {leaderboard.entries.length === 0 && (
                        <div className="p-12 rounded-2xl bg-[#111114] border border-white/[0.08] text-center text-xs text-zinc-400">
                            No drinks logged yet this month. Pour the first cocktail to open the standings.
                        </div>
                    )}
                </div>

                {/* Right Column: Ranking Tiers & Rolling Monthly Badges */}
                <div className="lg:col-span-4 space-y-5">
                    <section className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3.5">
                        <div>
                            <h2 className="text-base font-extrabold text-white">Ranking Tiers</h2>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Monthly thresholds unlocked by cumulative pure ethanol.
                            </p>
                        </div>

                        <div className="divide-y divide-white/[0.06] rounded-xl bg-[#0c0c0f] border border-white/[0.08] overflow-hidden">
                            {LEAGUE_TIERS_REFERENCE.map((tier) => {
                                const Icon = TIER_ICONS[tier.icon] || Award;
                                return (
                                    <div
                                        key={tier.name}
                                        className="px-3.5 py-2.5 flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#111114] border border-white/[0.08] shrink-0"
                                                style={{ color: tier.color }}
                                            >
                                                <Icon className="w-4 h-4" aria-hidden="true" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold truncate" style={{ color: tier.color }}>
                                                    {tier.name}
                                                </div>
                                                <div className="text-[11px] text-zinc-400">Min. required</div>
                                            </div>
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
                        <section className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-4">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h2 className="text-base font-extrabold text-white flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-red-400" aria-hidden="true" />
                                        <span>Your Monthly Badges</span>
                                    </h2>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Rolling {myMonthlyBadges.period} UTC badges. Resets monthly.
                                    </p>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#0c0c0f] border border-white/[0.08] text-zinc-200 tabular-nums shrink-0">
                                    {myMonthlyBadges.badges.filter((b) => b.isEarned).length}/
                                    {myMonthlyBadges.badges.length}
                                </span>
                            </div>

                            <div className="space-y-2.5">
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
                                        <div
                                            key={badge.key}
                                            className={`p-3 rounded-xl border space-y-2 ${
                                                badge.isEarned
                                                    ? 'bg-[#0c0c0f] border-white/15'
                                                    : 'bg-[#0c0c0f]/70 border-white/[0.06]'
                                            }`}
                                        >
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
                                                <div className="w-full h-1.5 bg-[#111114] rounded-full overflow-hidden">
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
