import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { useDoseModalStore } from '@/store/useDoseModalStore';
import type { DrinkDetail, DrinkMatchResult, IngredientCategory } from '@/types';
import { BottleStrengthMeter } from '@/components/drink/BottleStrengthMeter';
import { DoseCustomizerModal } from '@/components/drink/DoseCustomizerModal';
import { DrinkDetailModal } from '@/components/drink/DrinkDetailModal';
import {
    Check,
    Sparkles,
    AlertCircle,
    Plus,
    Search,
    X,
    Eye,
    Loader2,
    Filter,
    Trash2,
} from 'lucide-react';

const CATEGORY_TABS: Array<{ label: string; value: 'ALL' | IngredientCategory }> = [
    { label: 'All', value: 'ALL' },
    { label: 'Spirits', value: 'Spirit' },
    { label: 'Liqueurs', value: 'Liqueur' },
    { label: 'Wine', value: 'Wine' },
    { label: 'Beer', value: 'Beer' },
    { label: 'Mixers', value: 'Mixer' },
    { label: 'Syrups', value: 'Syrup' },
];

export const CabinetMatcherPage: React.FC = () => {
    const [selectedOverride, setSelectedOverride] = useState<Set<string> | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<'ALL' | IngredientCategory>('ALL');
    const [manualMatchResults, setManualMatchResults] = useState<DrinkMatchResult[] | null>(null);
    const [isMatching, setIsMatching] = useState(false);
    const [matchError, setMatchError] = useState<string | null>(null);
    const [viewedDrink, setViewedDrink] = useState<DrinkDetail | null>(null);

    const { openModal } = useDoseModalStore();

    const { data: ingredients = [], isLoading: isLoadingIngredients } = useQuery({
        queryKey: ['cabinet-ingredients', activeCategory, searchQuery],
        queryFn: () =>
            drinksApi.getAllIngredients({
                category: activeCategory === 'ALL' ? undefined : activeCategory,
                search: searchQuery.trim() || undefined,
                limit: 100,
            }),
    });

    const { data: savedCabinet } = useQuery({
        queryKey: ['my-cabinet'],
        queryFn: drinksApi.getMyCabinet,
    });

    const savedIds = useMemo(
        () => savedCabinet?.ingredients.map((i) => i.id) ?? [],
        [savedCabinet]
    );

    const selectedIngredientIds = useMemo(() => {
        if (selectedOverride !== null) return selectedOverride;
        return new Set(savedIds);
    }, [selectedOverride, savedIds]);

    const { data: initialMatchResults = null } = useQuery({
        queryKey: ['my-cabinet-initial-match', savedIds],
        queryFn: () => drinksApi.matchCabinet(savedIds),
        enabled: savedIds.length > 0 && selectedOverride === null && manualMatchResults === null,
    });

    const matchResults = manualMatchResults ?? (selectedOverride === null ? initialMatchResults : null);

    const selectedIngredientsList = useMemo(() => {
        const idMap = new Map<string, string>();
        savedCabinet?.ingredients.forEach((i) => idMap.set(i.id, i.name));
        ingredients.forEach((i) => idMap.set(i.id, i.name));

        return Array.from(selectedIngredientIds).map((id) => ({
            id,
            name: idMap.get(id) || 'Selected Bottle',
        }));
    }, [ingredients, savedCabinet, selectedIngredientIds]);

    const groupedBySubCategory = useMemo(() => {
        const groups: Record<string, typeof ingredients> = {};
        for (const ing of ingredients) {
            const key = ing.subCategory || ing.category;
            if (!groups[key]) groups[key] = [];
            groups[key].push(ing);
        }
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [ingredients]);

    const toggleIngredient = (id: string) => {
        const next = new Set(selectedIngredientIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedOverride(next);
    };

    const handleMatch = async () => {
        try {
            setMatchError(null);
            setIsMatching(true);
            const ids = Array.from(selectedIngredientIds);
            await drinksApi.syncCabinet(ids);
            const results = await drinksApi.matchCabinet(ids);
            setManualMatchResults(results);
        } catch (err) {
            console.error('Matching failed:', err);
            setMatchError('Unable to match your cabinet right now. Please try again.');
        } finally {
            setIsMatching(false);
        }
    };

    const handleOpenDrink = async (drinkId: string, mode: 'view' | 'drink') => {
        try {
            const detail = await drinksApi.getById(drinkId);
            if (mode === 'view') setViewedDrink(detail);
            else openModal(detail);
        } catch (err) {
            console.error('Failed to load drink detail:', err);
        }
    };

    return (
        <div className="space-y-6">
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
                        Bar Cabinet Matcher
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
                        Pick the bottles and mixers on your shelf. Cocktails with at least 50% matching ingredients appear on the right.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleMatch}
                    disabled={isMatching || selectedIngredientIds.size === 0}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-extrabold text-sm flex items-center justify-center gap-2 border border-red-500/50 shrink-0 tabular-nums dose-press"
                >
                    {isMatching ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            <span>Matching…</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" aria-hidden="true" />
                            <span>Find Drinks ({selectedIngredientIds.size})</span>
                        </>
                    )}
                </button>
            </section>

            {matchError && (
                <div
                    role="alert"
                    className="p-3.5 rounded-2xl bg-red-950/60 border border-red-700/60 text-xs text-red-200 flex items-center gap-2"
                >
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
                    <span>{matchError}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-4">
                    <section className="p-4 rounded-2xl bg-[#111114] border border-white/[0.08]">
                        <div className="flex items-center justify-between mb-2.5">
                            <h2 className="text-xs font-bold text-zinc-200 tabular-nums">
                                On Your Shelf ({selectedIngredientsList.length})
                            </h2>
                            {selectedIngredientsList.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedOverride(new Set());
                                        setManualMatchResults(null);
                                    }}
                                    className="min-h-[32px] px-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-red-400 flex items-center gap-1 dose-press"
                                >
                                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Clear all</span>
                                </button>
                            )}
                        </div>

                        {selectedIngredientsList.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto overscroll-contain">
                                {selectedIngredientsList.map((ing) => (
                                    <span
                                        key={ing.id}
                                        className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-xl text-xs font-semibold bg-red-600/15 border border-red-500/40 text-red-100"
                                    >
                                        <span>{ing.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => toggleIngredient(ing.id)}
                                            aria-label={`Remove ${ing.name} from shelf`}
                                            className="w-6 h-6 rounded-lg hover:bg-red-500/30 flex items-center justify-center text-red-200 hover:text-white"
                                        >
                                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-zinc-400">
                                No bottles selected yet. Choose spirits and mixers below.
                            </p>
                        )}
                    </section>

                    <section className="p-4 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-4">
                        <div className="relative">
                            <Search
                                className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                aria-hidden="true"
                            />
                            <input
                                type="search"
                                aria-label="Filter cabinet ingredients"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter ingredients (e.g., Gin, Bourbon, Vermouth)…"
                                className="w-full min-h-[44px] pl-10 pr-10 py-2.5 rounded-xl text-sm dose-input"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Clear ingredient filter"
                                    className="w-9 h-9 rounded-lg flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" aria-hidden="true" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar" role="group" aria-label="Ingredient category">
                            <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0 mr-1" aria-hidden="true" />
                            {CATEGORY_TABS.map((tab) => (
                                <button
                                    key={tab.value}
                                    type="button"
                                    aria-pressed={activeCategory === tab.value}
                                    onClick={() => setActiveCategory(tab.value)}
                                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border dose-press ${
                                        activeCategory === tab.value
                                            ? 'bg-red-600 text-white border-red-500/70'
                                            : 'bg-[#0c0c0f] text-zinc-400 hover:text-zinc-100 border-white/[0.08]'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {isLoadingIngredients ? (
                            <div className="py-12 flex justify-center items-center text-zinc-400 text-xs gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-red-500" aria-hidden="true" />
                                <span>Loading ingredients…</span>
                            </div>
                        ) : (
                            <div className="space-y-5 max-h-[520px] overflow-y-auto overscroll-contain pr-1">
                                {groupedBySubCategory.map(([subCategory, items]) => (
                                    <div key={subCategory} className="space-y-2">
                                        <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                                            <h3 className="text-xs font-bold text-zinc-200">
                                                {subCategory}
                                            </h3>
                                            <span className="text-[11px] text-zinc-400 tabular-nums">
                                                {items.length} items
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {items.map((ing) => {
                                                const isSelected = selectedIngredientIds.has(ing.id);

                                                return (
                                                    <button
                                                        key={ing.id}
                                                        type="button"
                                                        aria-pressed={isSelected}
                                                        onClick={() => toggleIngredient(ing.id)}
                                                        className={`min-h-[48px] p-3 rounded-xl text-left border flex items-center justify-between gap-2 dose-press ${
                                                            isSelected
                                                                ? 'bg-red-600/15 border-red-500/70 text-white'
                                                                : 'bg-[#0c0c0f] border-white/[0.08] text-zinc-300 hover:border-white/20'
                                                        }`}
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold truncate">
                                                                {ing.name}
                                                            </div>
                                                            {(ing.flavor || ing.abv > 0) && (
                                                                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400">
                                                                    {ing.flavor && (
                                                                        <span className="px-1.5 py-0.2 rounded bg-red-950/70 text-red-300 font-semibold text-[10px]">
                                                                            {ing.flavor}
                                                                        </span>
                                                                    )}
                                                                    {ing.abv > 0 && (
                                                                        <span className="text-red-400 tabular-nums font-semibold">
                                                                            {ing.abv}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div
                                                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                                                                isSelected
                                                                    ? 'bg-red-600 border-red-500 text-white'
                                                                    : 'border-white/15 bg-[#111114]'
                                                            }`}
                                                            aria-hidden="true"
                                                        >
                                                            {isSelected && (
                                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {groupedBySubCategory.length === 0 && (
                                    <p className="text-xs text-center text-zinc-400 py-8">
                                        No ingredients match your filter.
                                    </p>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                <div className="lg:col-span-5">
                    <section className="p-4 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3">
                        <h2 className="text-sm font-extrabold text-white tabular-nums">
                            Available Cocktails {matchResults ? `(${matchResults.length})` : ''}
                        </h2>

                        {!matchResults ? (
                            <div className="py-16 text-center text-zinc-400 text-xs space-y-2">
                                <Sparkles className="w-7 h-7 mx-auto text-zinc-500" aria-hidden="true" />
                                <p>Select your bottles and press &ldquo;Find Drinks&rdquo;.</p>
                            </div>
                        ) : matchResults.length === 0 ? (
                            <div className="py-16 text-center text-zinc-400 text-xs leading-relaxed px-4">
                                No cocktails found with at least 50% ingredient match. Try adding a core spirit or mixer.
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[640px] overflow-y-auto overscroll-contain pr-1">
                                {matchResults.map((result) => {
                                    const isExact = result.matchType === 'EXACT';

                                    return (
                                        <div
                                            key={result.drinkId}
                                            className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                                                isExact
                                                    ? 'bg-emerald-950/20 border-emerald-600/45'
                                                    : 'bg-[#0c0c0f] border-white/[0.08]'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h3 className="text-base font-extrabold text-white truncate">
                                                        {result.name}
                                                    </h3>
                                                    <span
                                                        className={`inline-flex items-center gap-1 mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                                            isExact
                                                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                                                : 'bg-red-500/15 text-red-300 border border-red-500/30'
                                                        }`}
                                                    >
                                                        {isExact ? (
                                                            <Check className="w-3 h-3 stroke-[2.5]" aria-hidden="true" />
                                                        ) : (
                                                            <AlertCircle className="w-3 h-3" aria-hidden="true" />
                                                        )}
                                                        <span>{result.matchSummaryBadge}</span>
                                                    </span>
                                                </div>

                                                <span className="text-xs tabular-nums font-bold text-zinc-300 shrink-0">
                                                    {result.matchPercentage}% match
                                                </span>
                                            </div>

                                            <BottleStrengthMeter
                                                score1To10={result.bottleScore1To10}
                                                abvPercent={result.cachedAbv}
                                                compact
                                            />

                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDrink(result.drinkId, 'view')}
                                                    className="min-h-[42px] rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 dose-press"
                                                >
                                                    <Eye className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                                                    <span>View Recipe</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDrink(result.drinkId, 'drink')}
                                                    className="min-h-[42px] rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-red-500/40 dose-press"
                                                >
                                                    <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                                                    <span>Drink Now</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <DrinkDetailModal
                drink={viewedDrink}
                isOpen={!!viewedDrink}
                onClose={() => setViewedDrink(null)}
                onDrinkNow={(detail) => openModal(detail)}
            />
            <DoseCustomizerModal onSuccessLogged={handleMatch} />
        </div>
    );
};
