import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { Trophy, Flame, Award, Sparkles, Crown, Loader2 } from 'lucide-react';

const TIER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    glass: Sparkles,
    sparkles: Sparkles,
    flame: Flame,
    crown: Crown,
    eye: Award,
};

export const LeaderboardPage: React.FC = () => {
    const { preferredUnit } = usePreferencesStore();

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
        return preferredUnit === 'cl' ? `${cl.toFixed(1)} cl` : `${grams.toFixed(1)} g`;
    };

    return (
        <div className="py-4 space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-center justify-between">
                <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Monthly Standings
          </span>
                    <h2 className="text-lg font-black text-white">{leaderboard.period} League</h2>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Trophy className="w-5 h-5" />
                </div>
            </div>

            <div className="space-y-2.5">
                {leaderboard.entries.map((entry) => {
                    const IconComponent = TIER_ICONS[entry.currentTier.badgeIcon] || Award;

                    return (
                        <div
                            key={entry.userId}
                            className={`p-4 rounded-2xl border transition-all ${
                                entry.rank === 1
                                    ? 'bg-amber-950/20 border-amber-500/40'
                                    : 'bg-slate-900 border-slate-800'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
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
                                        <h3 className="text-sm font-bold text-white leading-tight">
                                            {entry.username}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span
                          className="font-semibold flex items-center gap-1"
                          style={{ color: entry.currentTier.colorHex }}
                      >
                        <IconComponent className="w-3 h-3" />
                          {entry.currentTier.name}
                      </span>
                                            <span>• {entry.drinksCount} drinks</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                  <span className="text-sm font-black text-amber-400">
                    {formatAlcoholTotal(entry.monthlyPureAlcoholGrams, entry.monthlyPureAlcoholCl)}
                  </span>
                                    <p className="text-[10px] text-slate-500 font-medium">pure alc.</p>
                                </div>
                            </div>

                            {entry.gramsToNextTier > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-800/80">
                                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                        <span>Progress to next tier</span>
                                        <span className="font-mono">{entry.nextTierProgressPercent}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
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
                    <p className="text-xs text-center text-slate-500 py-10">
                        No drinks logged yet this month. Be the first to start the board!
                    </p>
                )}
            </div>
        </div>
    );
};