import React, { useState, useEffect, useMemo } from 'react';
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
    const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<'ALL' | IngredientCategory>('ALL');
    const [matchResults, setMatchResults] = useState<DrinkMatchResult[] | null>(null);
    const [isMatching, setIsMatching] = useState(false);
    const [viewedDrink, setViewedDrink] = useState<DrinkDetail | null>(null);

    const { openModal } = useDoseModalStore();

    // Query ingredients using server-side filtering to avoid loading all items at once
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

    // Hydrate selected bottles from user's saved cabinet on load
    useEffect(() => {
        if (savedCabinet?.ingredients && savedCabinet.ingredients.length > 0) {
            const ids = savedCabinet.ingredients.map((i) => i.id);
            setSelectedIngredientIds(new Set(ids));
            drinksApi.matchCabinet(ids).then(setMatchResults).catch(console.error);
        }
    }, [savedCabinet]);

    const selectedIngredientsList = useMemo(() => {
        const idMap = new Map<string, string>();
        savedCabinet?.ingredients.forEach((i) => idMap.set(i.id, i.name));
        ingredients.forEach((i) => idMap.set(i.id, i.name));

        return Array.from(selectedIngredientIds).map((id) => ({
            id,
            name: idMap.get(id) || 'Selected Bottle',
        }));
    }, [ingredients, savedCabinet, selectedIngredientIds]);

    // Group ingredients by sub-category
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
            const ids = Array.from(selectedIngredientIds);
            await drinksApi.syncCabinet(ids);
            const results = await drinksApi.matchCabinet(ids);
            // Drinks with less than 50% match are already filtered out on backend
            setMatchResults(results);
        } catch (err) {
            console.error('Matching failed:', err);
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
            {/* Header Banner */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-red-500" />
                        <span>Bar Cabinet Matcher</span>
                    </h1>
                    <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                        Select the bottles and mixers you have on hand. Cocktails with at least 50% matching ingredients will be displayed.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleMatch}
                    disabled={isMatching || selectedIngredientIds.size === 0}
                    className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 shadow-lg shadow-red-600/25"
                >
                    {isMatching ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Matching...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            <span>Find Drinks ({selectedIngredientIds.size})</span>
                        </>
                    )}
                </button>
            </div>

            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Bottle Selection */}
                <div className="lg:col-span-7 space-y-4">
                    {/* Selected Bottles Capsule Bar */}
                    <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
                        <div className="flex items-center justify-between mb-2.5">
                            <span className="text-xs font-bold text-neutral-300">
                                Selected Ingredients ({selectedIngredientsList.length})
                            </span>
                            {selectedIngredientsList.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedIngredientIds(new Set());
                                        setMatchResults(null);
                                    }}
                                    className="text-xs text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Clear</span>
                                </button>
                            )}
                        </div>

                        {selectedIngredientsList.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                {selectedIngredientsList.map((ing) => (
                                    <span
                                        key={ing.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-red-600/15 border border-red-600/40 text-red-200"
                                    >
                                        <span>{ing.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => toggleIngredient(ing.id)}
                                            className="hover:text-white"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-neutral-500">
                                No bottles selected yet. Pick ingredients from below.
                            </p>
                        )}
                    </div>

                    {/* Search & Category Filter Box */}
                    <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                        <div className="relative">
                            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter ingredients (e.g., Gin, Bourbon, Vermouth)..."
                                className="w-full pl-10 pr-9 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Category Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            <Filter className="w-3.5 h-3.5 text-neutral-500 shrink-0 mr-1" />
                            {CATEGORY_TABS.map((tab) => (
                                <button
                                    key={tab.value}
                                    type="button"
                                    onClick={() => setActiveCategory(tab.value)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                                        activeCategory === tab.value
                                            ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                                            : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Ingredients Grouped List */}
                        {isLoadingIngredients ? (
                            <div className="py-12 flex justify-center text-neutral-500 text-xs gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                                <span>Loading ingredients...</span>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                                {groupedBySubCategory.map(([subCategory, items]) => (
                                    <div key={subCategory} className="space-y-2">
                                        <div className="flex items-center justify-between border-b border-neutral-800 pb-1">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                                                {subCategory}
                                            </h4>
                                            <span className="text-[10px] text-neutral-500">
                                                {items.length} item(s)
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {items.map((ing) => {
                                                const isSelected = selectedIngredientIds.has(ing.id);

                                                return (
                                                    <button
                                                        key={ing.id}
                                                        type="button"
                                                        onClick={() => toggleIngredient(ing.id)}
                                                        className={`p-3 rounded-xl text-left border flex items-center justify-between gap-2 transition-all active:scale-[0.99] ${
                                                            isSelected
                                                                ? 'bg-red-600/15 border-red-600 text-white shadow-sm'
                                                                : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                                                        }`}
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold truncate">
                                                                {ing.name}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-neutral-400">
                                                                {ing.flavor && (
                                                                    <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-300 font-semibold">
                                                                        {ing.flavor}
                                                                    </span>
                                                                )}
                                                                {ing.abv > 0 && (
                                                                    <span className="text-red-400 font-mono">
                                                                        {ing.abv}%
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div
                                                            className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border ${
                                                                isSelected
                                                                    ? 'bg-red-600 border-red-600 text-white'
                                                                    : 'border-neutral-700 bg-neutral-900'
                                                            }`}
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
                                    <p className="text-xs text-center text-neutral-500 py-8">
                                        No ingredients match your filter.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Matching Cocktails (>= 50%) */}
                <div className="lg:col-span-5 space-y-3">
                    <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
                        <h3 className="text-sm font-bold text-white mb-3">
                            Available Cocktails {matchResults ? `(${matchResults.length})` : ''}
                        </h3>

                        {!matchResults ? (
                            <div className="py-16 text-center text-neutral-500 text-xs space-y-2">
                                <Sparkles className="w-7 h-7 mx-auto text-neutral-600" />
                                <p>Select your bottles and click &quot;Find Drinks&quot;.</p>
                            </div>
                        ) : matchResults.length === 0 ? (
                            <div className="py-16 text-center text-neutral-500 text-xs">
                                No cocktails found with at least 50% match. Try adding a few more spirits or mixers!
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                                {matchResults.map((result) => {
                                    const isExact = result.matchType === 'EXACT';

                                    return (
                                        <div
                                            key={result.drinkId}
                                            className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                                                isExact
                                                    ? 'bg-emerald-950/25 border-emerald-700/60'
                                                    : 'bg-neutral-950 border-neutral-800'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h4 className="text-base font-bold text-white">
                                                        {result.name}
                                                    </h4>
                                                    <span
                                                        className={`inline-flex items-center gap-1 mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                                            isExact
                                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                                : 'bg-red-500/20 text-red-400'
                                                        }`}
                                                    >
                                                        {isExact ? (
                                                            <Check className="w-3 h-3 stroke-[3]" />
                                                        ) : (
                                                            <AlertCircle className="w-3 h-3" />
                                                        )}
                                                        {result.matchSummaryBadge}
                                                    </span>
                                                </div>

                                                <span className="text-xs font-mono font-bold text-neutral-400">
                                                    {result.matchPercentage}% match
                                                </span>
                                            </div>

                                            <BottleStrengthMeter
                                                score1To10={result.bottleScore1To10}
                                                abvPercent={result.cachedAbv}
                                                compact
                                            />

                                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-800/80">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDrink(result.drinkId, 'view')}
                                                    className="py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>View Recipe</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDrink(result.drinkId, 'drink')}
                                                    className="py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-red-600/20"
                                                >
                                                    <Plus className="w-4 h-4 stroke-[2.5]" />
                                                    <span>Drink Now</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
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