import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { useDoseModalStore } from '@/store/useDoseModalStore';
import type { DrinkMatchResult } from '@/types';
import { BottleStrengthMeter } from '@/components/drink/BottleStrengthMeter';
import { DoseCustomizerModal } from '@/components/drink/DoseCustomizerModal';
import { Check, Sparkles, AlertCircle, Plus, Loader2 } from 'lucide-react';

export const CabinetMatcherPage: React.FC = () => {
    const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set());
    const [matchResults, setMatchResults] = useState<DrinkMatchResult[] | null>(null);
    const [isMatching, setIsMatching] = useState(false);
    const { openModal } = useDoseModalStore();

    const { data: ingredients = [], isLoading: isLoadingIngredients } = useQuery({
        queryKey: ['all-ingredients'],
        queryFn: drinksApi.getAllIngredients,
    });

    const toggleIngredient = (id: string) => {
        setSelectedIngredientIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleMatch = async () => {
        try {
            setIsMatching(true);
            const results = await drinksApi.matchCabinet(Array.from(selectedIngredientIds));
            setMatchResults(results);
        } catch (err) {
            console.error('Matching failed:', err);
        } finally {
            setIsMatching(false);
        }
    };

    const handleOpenDrink = async (drinkId: string) => {
        try {
            const detail = await drinksApi.getById(drinkId);
            openModal(detail);
        } catch (err) {
            console.error('Failed to load drink detail:', err);
        }
    };

    return (
        <div className="py-4 space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <h2 className="text-base font-bold text-white">What can I make?</h2>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                    Select what you have in your cabinet or on the bar counter. We will find exact matches and drinks missing just one item.
                </p>

                <button
                    type="button"
                    onClick={handleMatch}
                    disabled={isMatching || selectedIngredientIds.size === 0}
                    className="w-full mt-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    {isMatching ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Scanning Mixology Engine...
                        </>
                    ) : (
                        `Find Cocktails (${selectedIngredientIds.size} selected)`
                    )}
                </button>
            </div>

            {isLoadingIngredients ? (
                <div className="py-8 flex justify-center text-slate-500 text-xs gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    Loading ingredients...
                </div>
            ) : (
                <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-2">
                        Available Ingredients
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-1">
                        {ingredients.map((ing) => {
                            const isSelected = selectedIngredientIds.has(ing.id);
                            return (
                                <button
                                    key={ing.id}
                                    type="button"
                                    onClick={() => toggleIngredient(ing.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all active:scale-95 ${
                                        isSelected
                                            ? 'bg-amber-500/20 border-amber-500/80 text-amber-300'
                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    <span>{ing.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {matchResults && (
                <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-bold text-slate-300">
                        Matching Results ({matchResults.length})
                    </h3>

                    {matchResults.map((result) => {
                        const isExact = result.matchType === 'EXACT';
                        return (
                            <div
                                key={result.drinkId}
                                className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                                    isExact
                                        ? 'bg-emerald-950/20 border-emerald-800/60'
                                        : 'bg-slate-900/80 border-slate-800'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h4 className="text-base font-bold text-white">{result.name}</h4>
                                        <span
                                            className={`inline-flex items-center gap-1 mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                                isExact
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-amber-500/20 text-amber-400'
                                            }`}
                                        >
                      {isExact ? <Check className="w-3 h-3 stroke-[3]" /> : <AlertCircle className="w-3 h-3" />}
                                            {result.matchSummaryBadge}
                    </span>
                                    </div>

                                    <span className="text-xs font-mono font-bold text-slate-400">
                    {result.matchPercentage}% match
                  </span>
                                </div>

                                <BottleStrengthMeter
                                    score1To10={result.bottleScore1To10}
                                    abvPercent={result.cachedAbv}
                                    compact
                                />

                                <button
                                    type="button"
                                    onClick={() => handleOpenDrink(result.drinkId)}
                                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                                >
                                    <Plus className="w-4 h-4 stroke-[2.5]" />
                                    Drink / Customize
                                </button>
                            </div>
                        );
                    })}

                    {matchResults.length === 0 && (
                        <p className="text-xs text-center text-slate-500 py-6">
                            No matching cocktails found. Try selecting more spirits or mixers.
                        </p>
                    )}
                </div>
            )}

            <DoseCustomizerModal onSuccessLogged={handleMatch} />
        </div>
    );
};