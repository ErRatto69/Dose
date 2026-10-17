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
import { matchesSearchQuery } from '@/utils/textSearch';

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

    const { data: ingredients = [], isLoading: isLoadingIngredients } = useQuery({
        queryKey: ['all-ingredients'],
        queryFn: drinksApi.getAllIngredients,
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
        return ingredients.filter((i) => selectedIngredientIds.has(i.id));
    }, [ingredients, selectedIngredientIds]);

    const filteredIngredients = useMemo(() => {
        return ingredients.filter((ing) => {
            const matchesCat = activeCategory === 'ALL' || ing.category === activeCategory;
            if (!matchesCat) return false;
            return matchesSearchQuery(searchQuery, ing.name, ing.subCategory, ing.flavor);
        });
    }, [ingredients, searchQuery, activeCategory]);

    // Group filtered ingredients by SubCategory (e.g., Vodka, Gin, White Rum, Liqueur...)
    const groupedBySubCategory = useMemo(() => {
        const groups: Record<string, typeof filteredIngredients> = {};
        for (const ing of filteredIngredients) {
            const key = ing.subCategory || ing.category;
            if (!groups[key]) groups[key] = [];
            groups[key].push(ing);
        }
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [filteredIngredients]);

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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <h1 className="text-xl font-black text-white">Bar Cabinet &amp; Drink Matcher</h1>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                        Search and select the bottles, spirits, and mixers you have on hand. Our engine matches recipes by spirit type (e.g., any neutral Vodka) and specific flavor (e.g., Peach vs Coffee).
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleMatch}
                    disabled={isMatching || selectedIngredientIds.size === 0}
                    className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shrink-0 shadow-lg shadow-amber-500/20"
                >
                    {isMatching ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Matching Recipes...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Find Drinks ({selectedIngredientIds.size} selected)
                        </>
                    )}
                </button>
            </div>

            {/* Desktop 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Search, Filter & Select Ingredients */}
                <div className="lg:col-span-7 space-y-4">
                    {/* Selected Bottles Bar */}
                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                        <div className="flex items-center justify-between mb-2.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                My Selected Bottles &amp; Mixers ({selectedIngredientsList.length})
                            </span>
                            {selectedIngredientsList.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedIngredientIds(new Set());
                                        setMatchResults(null);
                                    }}
                                    className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Clear all
                                </button>
                            )}
                        </div>

                        {selectedIngredientsList.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {selectedIngredientsList.map((ing) => (
                                    <span
                                        key={ing.id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-500/15 border border-amber-500/50 text-amber-300"
                                    >
                                        <span>{ing.name}</span>
                                        {ing.flavor && (
                                            <span className="text-[10px] text-amber-200/80">
                                                ({ing.flavor})
                                            </span>
                                        )}
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
                            <p className="text-xs text-slate-500">
                                No bottles selected yet. Use the search bar below to add what you have.
                            </p>
                        )}
                    </div>

                    {/* Search & Category Filter Box */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, spirit type (Vodka, Gin, Rum...) or flavor (Peach, Coffee)..."
                                className="w-full pl-10 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Category Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
                            {CATEGORY_TABS.map((tab) => (
                                <button
                                    key={tab.value}
                                    type="button"
                                    onClick={() => setActiveCategory(tab.value)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                                        activeCategory === tab.value
                                            ? 'bg-amber-500 text-slate-950'
                                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Grouped Ingredients List */}
                        {isLoadingIngredients ? (
                            <div className="py-12 flex justify-center text-slate-500 text-xs gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                Loading bar inventory...
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                                {groupedBySubCategory.map(([subCategory, items]) => (
                                    <div key={subCategory} className="space-y-2">
                                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                                {subCategory}
                                            </h4>
                                            <span className="text-[10px] text-slate-500">
                                                {items.length} option(s)
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
                                                                ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                                                                : 'bg-slate-950/70 border-slate-800/90 text-slate-300 hover:border-slate-700'
                                                        }`}
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold truncate">
                                                                {ing.name}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                                                                {ing.flavor ? (
                                                                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold">
                                                                        {ing.flavor}
                                                                    </span>
                                                                ) : (
                                                                    <span>Classic / Neutral</span>
                                                                )}
                                                                {ing.abv > 0 && (
                                                                    <span className="text-amber-400 font-mono">
                                                                        • {ing.abv}%
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div
                                                            className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border ${
                                                                isSelected
                                                                    ? 'bg-amber-500 border-amber-500 text-slate-950'
                                                                    : 'border-slate-700 bg-slate-900'
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
                                    <p className="text-xs text-center text-slate-500 py-8">
                                        No ingredients match your search filter.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Matching Cocktails */}
                <div className="lg:col-span-5 space-y-3">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                        <h3 className="text-sm font-bold text-white mb-3">
                            Matching Cocktails {matchResults ? `(${matchResults.length})` : ''}
                        </h3>

                        {!matchResults ? (
                            <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                                <Sparkles className="w-7 h-7 mx-auto text-slate-600" />
                                <p>
                                    Select your bottles on the left and click <strong>Find Drinks</strong> to see what you can mix.
                                </p>
                            </div>
                        ) : matchResults.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 text-xs">
                                No matching cocktails found with max 2 missing ingredients. Try selecting a few more spirits or mixers!
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                                {matchResults.map((result) => {
                                    const isExact = result.matchType === 'EXACT';
                                    return (
                                        <div
                                            key={result.drinkId}
                                            className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                                                isExact
                                                    ? 'bg-emerald-950/20 border-emerald-700/60'
                                                    : 'bg-slate-950/80 border-slate-800'
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
                                                                : 'bg-amber-500/20 text-amber-400'
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
                                                <span className="text-xs font-mono font-bold text-slate-400">
                                                    {result.matchPercentage}% match
                                                </span>
                                            </div>

                                            <BottleStrengthMeter
                                                score1To10={result.bottleScore1To10}
                                                abvPercent={result.cachedAbv}
                                                compact
                                            />

                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDrink(result.drinkId, 'view')}
                                                    className="py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    View Recipe
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDrink(result.drinkId, 'drink')}
                                                    className="py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                                                >
                                                    <Plus className="w-4 h-4 stroke-[2.5]" />
                                                    Drink / Customize
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