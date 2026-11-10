import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '@/api/gamification.api';
import { queryKeys } from '@/api/queryKeys';
import { MonthlyBadgeChip } from './MonthlyBadgeChip';
import {
    Award,
    CheckCircle2,
    Compass,
    Droplets,
    FlaskConical,
    Loader2,
    Lock,
    MessageSquareQuote,
    Sparkles,
    Stamp,
    Wine,
} from 'lucide-react';

const PASSPORT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    wine: Wine,
    compass: Compass,
    'flask-conical': FlaskConical,
    'message-square-quote': MessageSquareQuote,
    droplets: Droplets,
    award: Award,
};

const CATEGORY_TINTS: Record<string, string> = {
    Milestone: 'bg-red-500/15 border-red-500/35 text-red-300',
    Exploration: 'bg-sky-500/15 border-sky-500/35 text-sky-300',
    Craftsmanship: 'bg-orange-500/15 border-orange-500/35 text-orange-300',
    Community: 'bg-amber-500/15 border-amber-500/35 text-amber-300',
    Wellness: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300',
};

export const CocktailPassportSection: React.FC = () => {
    const { data: passport, isLoading } = useQuery({
        queryKey: queryKeys.gamification.passport(),
        queryFn: gamificationApi.getAchievementPassport,
    });

    const { data: monthlyBadges } = useQuery({
        queryKey: queryKeys.gamification.monthlyBadges(),
        queryFn: () => gamificationApi.getMonthlyBadges(),
    });

    const earnedMonthlyBadges = monthlyBadges?.badges.filter((b) => b.isEarned) ?? [];
    const totalCount = passport?.totalCount ?? 0;
    const unlockedCount = passport?.unlockedCount ?? 0;
    const overallPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

    return (
        <section className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden">
            {/* Passport Booklet Header */}
            <div className="p-5 sm:p-6 bg-[#0c0c0f] border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Stamp className="w-5 h-5 text-red-400" aria-hidden="true" />
                        <h2 className="font-display text-2xl font-extrabold tracking-wide text-white leading-none">
                            COCKTAIL PASSPORT
                        </h2>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300">
                            Lifetime
                        </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                        Permanent career stamps preserved forever, separate from monthly league badges.
                    </p>
                </div>

                {passport && (
                    <div className="flex items-center gap-3 self-start sm:self-auto bg-[#111114] border border-white/[0.08] px-3.5 py-2 rounded-xl">
                        <div className="text-right tabular-nums">
                            <span className="text-sm font-extrabold text-white block leading-none">
                                {unlockedCount}/{totalCount}
                            </span>
                            <span className="text-[11px] text-zinc-400 block mt-0.5">Stamped</span>
                        </div>
                        <div className="w-20 h-2 bg-white/[0.08] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-[width] duration-300"
                                style={{ width: `${overallPct}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Active Month Rolling Badges Ribbon */}
            {earnedMonthlyBadges.length > 0 && (
                <div className="px-5 py-3 bg-[#0e0e12] border-b border-white/[0.08] flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-300 mr-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                        <span>{monthlyBadges?.period} Badges:</span>
                    </span>
                    {earnedMonthlyBadges.map((badge) => (
                        <MonthlyBadgeChip key={badge.key} badge={badge} />
                    ))}
                </div>
            )}

            {/* Passport Stamp Ledger Grid */}
            {isLoading ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-zinc-400">
                    <Loader2 className="w-5 h-5 animate-spin text-red-500" aria-hidden="true" />
                    <span>Opening Cocktail Passport…</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:gap-px bg-white/[0.06]">
                    {passport?.achievements.map((item) => {
                        const Icon = PASSPORT_ICONS[item.icon] || Award;
                        const categoryTint =
                            CATEGORY_TINTS[item.category] ??
                            'bg-white/[0.06] border-white/15 text-zinc-200';

                        return (
                            <div
                                key={item.key}
                                className={`relative p-5 flex flex-col justify-between gap-4 ${
                                    item.isUnlocked
                                        ? 'bg-[#111114]'
                                        : 'bg-[#0c0c0f]'
                                }`}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        {/* Tactile Passport Stamp Seal */}
                                        <div
                                            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                item.isUnlocked
                                                    ? 'bg-emerald-500/12 border-emerald-400/65 border-dashed text-emerald-300 -rotate-6'
                                                    : 'bg-[#141418] border-white/10 text-zinc-500'
                                            }`}
                                        >
                                            <Icon className="w-5 h-5" aria-hidden="true" />
                                        </div>

                                        <span
                                            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${categoryTint}`}
                                        >
                                            {item.category}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-extrabold text-white leading-snug">
                                            {item.title}
                                        </h3>
                                        <p className="text-[11px] font-semibold text-zinc-400 mt-0.5">
                                            {item.subtitle}
                                        </p>
                                        <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>

                                {item.isUnlocked ? (
                                    <div className="pt-3 border-t border-dashed border-white/[0.10] flex items-center justify-between text-[11px]">
                                        <span className="inline-flex items-center gap-1 font-extrabold text-emerald-400">
                                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                            <span>Stamped</span>
                                        </span>
                                        {item.unlockedAtUtc && (
                                            <span className="text-zinc-400 tabular-nums">
                                                {new Date(item.unlockedAtUtc).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="pt-3 border-t border-white/[0.06] space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="inline-flex items-center gap-1 text-zinc-400 font-medium">
                                                <Lock className="w-3 h-3" aria-hidden="true" />
                                                <span>In Progress</span>
                                            </span>
                                            <span className="tabular-nums font-bold text-zinc-200">
                                                {item.currentProgress} / {item.targetProgress}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-[#16161b] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-red-600 rounded-full transition-[width] duration-300"
                                                style={{ width: `${item.progressPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
};
