import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { useDoseModalStore } from '@/store/useDoseModalStore';
import type { DrinkDetail, DrinkMatchResult, IngredientCategory } from '@/types';
import { BottleStrengthMeter } from '@/components/drink/BottleStrengthMeter';
import { DrinkThumbnail } from '@/components/drink/DrinkThumbnail';
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
    const [mobilePane, setMobilePane] = useState<'shelf' | 'matches'>('shelf');

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
            setMobilePane('matches');
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
        <div className="space-y-5">
            {/* Open Page Header */}
            <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-wide leading-none">
                        BAR CABINET
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1.5">
                        Check off the bottles on your shelf to surface recipes with ≥50% match.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleMatch}
                    disabled={isMatching || selectedIngredientIds.size === 0}
                    className="min-h-[44px] px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 border border-red-400/40 shrink-0 tabular-nums dose-press"
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

            {/* Mobile Pane Switcher (Eliminates scrolling 600px down on phone) */}
            <div
                className="lg:hidden grid grid-cols-2 p-1 rounded-xl bg-[#111114] border border-white/[0.08]"
                role="tablist"
                aria-label="Cabinet view"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={mobilePane === 'shelf'}
                    onClick={() => setMobilePane('shelf')}
                    className={`min-h-[40px] rounded-lg text-xs font-bold tabular-nums dose-press ${
                        mobilePane === 'shelf'
                            ? 'bg-red-600 text-white'
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    My Shelf ({selectedIngredientIds.size})
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={mobilePane === 'matches'}
                    onClick={() => setMobilePane('matches')}
                    className={`min-h-[40px] rounded-lg text-xs font-bold tabular-nums dose-press ${
                        mobilePane === 'matches'
                            ? 'bg-red-600 text-white'
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    Matches ({matchResults?.length ?? 0})
                </button>
            </div>

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
                {/* Left Pane: Bottle Inventory */}
                <div className={`lg:col-span-7 space-y-4 ${mobilePane === 'shelf' ? 'block' : 'hidden lg:block'}`}>
                    {/* Selected Shelf Strip */}
                    {selectedIngredientsList.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-[#111114] border border-white/[0.08]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-zinc-200 tabular-nums">
                                    Selected ({selectedIngredientsList.length})
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedOverride(new Set());
                                        setManualMatchResults(null);
                                    }}
                                    className="min-h-[30px] px-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-red-400 flex items-center gap-1 dose-press"
                                >
                                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Clear</span>
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto overscroll-contain">
                                {selectedIngredientsList.map((ing) => (
                                    <span
                                        key={ing.id}
                                        className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs font-semibold bg-red-600/15 border border-red-500/40 text-red-100"
                                    >
                                        <span>{ing.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => toggleIngredient(ing.id)}
                                            aria-label={`Remove ${ing.name} from shelf`}
                                            className="w-6 h-6 rounded-full hover:bg-red-500/30 flex items-center justify-center text-red-200 hover:text-white"
                                        >
                                            <X className="w-3 h-3" aria-hidden="true" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Direct Search + Underline Category Bar + Checklist */}
                    <div className="space-y-3">
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
                                placeholder="Filter bottles (e.g., Gin, Bourbon, Vermouth)…"
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

                        <div
                            className="border-b border-white/[0.08] flex items-center gap-4 overflow-x-auto no-scrollbar"
                            role="group"
                            aria-label="Ingredient category"
                        >
                            {CATEGORY_TABS.map((tab) => {
                                const isActive = activeCategory === tab.value;
                                return (
                                    <button
                                        key={tab.value}
                                        type="button"
                                        aria-pressed={isActive}
                                        onClick={() => setActiveCategory(tab.value)}
                                        className={`relative min-h-[40px] py-2 text-xs font-bold shrink-0 whitespace-nowrap transition-colors ${
                                            isActive
                                                ? 'text-white'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        {isActive && (
                                            <span
                                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {isLoadingIngredients ? (
                            <div className="py-12 flex justify-center items-center text-zinc-400 text-xs gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-red-500" aria-hidden="true" />
                                <span>Loading shelf inventory…</span>
                            </div>
                        ) : (
                            <div className="rounded-2xl bg-[#111114] border border-white/[0.08] divide-y divide-white/[0.06] max-h-[540px] overflow-y-auto overscroll-contain">
                                {groupedBySubCategory.map(([subCategory, items]) => (
                                    <div key={subCategory} className="p-3.5 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xs font-extrabold text-zinc-200">
                                                {subCategory}
                                            </h2>
                                            <span className="text-[11px] text-zinc-400 tabular-nums">
                                                {items.length}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            {items.map((ing) => {
                                                const isSelected = selectedIngredientIds.has(ing.id);
                                                return (
                                                    <button
                                                        key={ing.id}
                                                        type="button"
                                                        aria-pressed={isSelected}
                                                        onClick={() => toggleIngredient(ing.id)}
                                                        className={`min-h-[44px] px-3 py-2 rounded-xl text-left border flex items-center justify-between gap-2 dose-press ${
                                                            isSelected
                                                                ? 'bg-red-600/15 border-red-500/65 text-white'
                                                                : 'bg-[#0c0c0f] border-white/[0.06] text-zinc-300 hover:border-white/20'
                                                        }`}
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold truncate">
                                                                {ing.name}
                                                            </div>
                                                            {(ing.flavor || ing.abv > 0) && (
                                                                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                                                                    {ing.flavor && (
                                                                        <span className="text-red-300 font-medium">
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
                                                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {groupedBySubCategory.length === 0 && (
                                    <p className="text-xs text-center text-zinc-400 py-10">
                                        No ingredients match your filter.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane: Matched Cocktails */}
                <div className={`lg:col-span-5 ${mobilePane === 'matches' ? 'block' : 'hidden lg:block'}`}>
                    <section className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden">
                        <div className="px-4 py-3.5 border-b border-white/[0.08] bg-[#0c0c0f] flex items-center justify-between">
                            <h2 className="text-sm font-extrabold text-white tabular-nums">
                                Available Cocktails {matchResults ? `(${matchResults.length})` : ''}
                            </h2>
                            <span className="text-[11px] text-zinc-400">≥50% match</span>
                        </div>

                        {!matchResults ? (
                            <div className="py-16 px-4 text-center text-zinc-400 text-xs space-y-2">
                                <Sparkles className="w-7 h-7 mx-auto text-zinc-500" aria-hidden="true" />
                                <p>Pick your bottles on the shelf and press &ldquo;Find Drinks&rdquo;.</p>
                            </div>
                        ) : matchResults.length === 0 ? (
                            <div className="py-16 px-4 text-center text-zinc-400 text-xs leading-relaxed">
                                No cocktails reached 50% match. Add a spirit or mixer and try again.
                            </div>
                        ) : (
                            <div className="divide-y divide-white/[0.06] max-h-[640px] overflow-y-auto overscroll-contain">
                                {matchResults.map((result) => {
                                    const isExact = result.matchType === 'EXACT';

                                    return (
                                        <div
                                            key={result.drinkId}
                                            className={`p-4 space-y-3 ${
                                                isExact ? 'bg-emerald-950/15' : ''
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDrink(result.drinkId, 'view')}
                                                    aria-label={`View ${result.name} recipe`}
                                                    className="rounded-xl shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dose-press"
                                                >
                                                    <DrinkThumbnail
                                                        imageUrl={result.imageUrl}
                                                        alt={result.name}
                                                        sizeClass="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl"
                                                        iconClass="w-6 h-6"
                                                    />
                                                </button>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenDrink(result.drinkId, 'view')}
                                                            className="text-left min-w-0 hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                                                        >
                                                            <h3 className="font-display text-xl font-bold tracking-wide text-white leading-tight truncate">
                                                                {result.name}
                                                            </h3>
                                                        </button>
                                                        <span className="text-xs tabular-nums font-extrabold text-zinc-200 shrink-0 pt-0.5">
                                                            {result.matchPercentage}%
                                                        </span>
                                                    </div>

                                                    <span
                                                        className={`inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
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
                                            </div>

                                            <BottleStrengthMeter
                                                score1To10={result.bottleScore1To10}
                                                abvPercent={result.cachedAbv}
                                                compact
                                            />

                                            <div className="flex items-center justify-between gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDrink(result.drinkId, 'view')}
                                                    className="min-h-[38px] px-3.5 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-zinc-200 font-bold text-xs flex items-center gap-1.5 dose-press"
                                                >
                                                    <Eye className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                                                    <span>Recipe</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDrink(result.drinkId, 'drink')}
                                                    className="min-h-[38px] px-4 rounded-full bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center gap-1.5 border border-red-400/40 dose-press"
                                                >
                                                    <Plus className="w-3.5 h-3.5 stroke-[2.75]" aria-hidden="true" />
                                                    <span>Pour</span>
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
