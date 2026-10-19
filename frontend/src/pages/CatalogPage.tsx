import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { useDoseModalStore } from '@/store/useDoseModalStore';
import { useAuthStore } from '@/store/useAuthStore';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import { BottleStrengthMeter } from '@/components/drink/BottleStrengthMeter';
import { DoseCustomizerModal } from '@/components/drink/DoseCustomizerModal';
import { DrinkDetailModal } from '@/components/drink/DrinkDetailModal';
import { QuickCustomDrinkModal } from '@/components/drink/QuickCustomDrinkModal';
import { CreateDrinkModal } from '@/components/drink/CreateDrinkModal';
import { CreateIngredientModal } from '@/components/drink/CreateIngredientModal';
import { PaginationControls } from '@/components/common/PaginationControls';
import type { DrinkDetail } from '@/types';
import { Plus, Star, Sparkles, Eye, Zap, Wine, Loader2 } from 'lucide-react';

export const CatalogPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pageNumber, setPageNumber] = useState(1);
    const pageSize = 12;

    const [loadingAction, setLoadingAction] = useState<{ id: string; mode: 'view' | 'drink' } | null>(
        null
    );
    const [viewedDrink, setViewedDrink] = useState<DrinkDetail | null>(null);
    const [isQuickPourOpen, setIsQuickPourOpen] = useState(false);
    const [isCreateDrinkOpen, setIsCreateDrinkOpen] = useState(false);
    const [isCreateIngredientOpen, setIsCreateIngredientOpen] = useState(false);

    const { openModal } = useDoseModalStore();
    const { user } = useAuthStore();

    const canManageCatalog =
        user?.role === 'Admin' ||
        user?.role === 'Bartender' ||
        String(user?.role) === '0' ||
        String(user?.role) === '1';

    // Debounce search query to prevent excessive server requests
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPageNumber(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { data: pagedDrinks, isLoading, refetch } = useQuery({
        queryKey: ['drinks-catalog', pageNumber, debouncedSearch],
        queryFn: () =>
            drinksApi.getCatalog({
                pageNumber,
                pageSize,
                search: debouncedSearch.trim() || undefined,
            }),
    });

    const drinks = pagedDrinks?.items ?? [];

    const handleAction = async (drinkId: string, mode: 'view' | 'drink') => {
        try {
            setLoadingAction({ id: drinkId, mode });
            const detail = await drinksApi.getById(drinkId);
            if (mode === 'view') {
                setViewedDrink(detail);
            } else {
                openModal(detail);
            }
        } catch (err) {
            console.error('Failed to load drink detail:', err);
        } finally {
            setLoadingAction(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Quick Action Bar */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white">Cocktail Catalog</h1>
                        <p className="text-xs text-neutral-400 mt-1">
                            Browse recipes, check alcohol strength, or record custom doses.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsQuickPourOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/25 transition-all active:scale-95"
                        >
                            <Zap className="w-4 h-4 fill-white" />
                            <span>Quick Pour</span>
                        </button>

                        {canManageCatalog && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateDrinkOpen(true)}
                                    className="px-3.5 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
                                >
                                    <Plus className="w-4 h-4 text-red-500" />
                                    <span>New Drink</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateIngredientOpen(true)}
                                    className="px-3.5 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
                                >
                                    <Wine className="w-4 h-4 text-red-500" />
                                    <span>New Ingredient</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <GlobalSearch value={searchQuery} onChange={setSearchQuery} />
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="py-24 flex flex-col items-center justify-center text-neutral-500 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                    <span className="text-xs">Loading drinks...</span>
                </div>
            )}

            {/* Cocktail Grid */}
            {!isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {drinks.map((drink) => {
                        const isViewing =
                            loadingAction?.id === drink.id && loadingAction.mode === 'view';
                        const isDrinking =
                            loadingAction?.id === drink.id && loadingAction.mode === 'drink';

                        return (
                            <div
                                key={drink.id}
                                onClick={() => handleAction(drink.id, 'view')}
                                className="cursor-pointer p-5 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-red-600/50 transition-all flex flex-col justify-between gap-4 shadow-md group"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors leading-tight truncate">
                                                    {drink.name}
                                                </h3>
                                                {drink.glassType && (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-950 border border-neutral-800 text-neutral-400">
                                                        {drink.glassType}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-neutral-400 line-clamp-2 mt-1.5 leading-relaxed">
                                                {drink.description}
                                            </p>
                                        </div>

                                        {drink.averageRating > 0 && (
                                            <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg shrink-0">
                                                <Star className="w-3.5 h-3.5 fill-amber-400" />
                                                <span>{drink.averageRating}</span>
                                            </div>
                                        )}
                                    </div>

                                    <BottleStrengthMeter
                                        score1To10={drink.bottleScore1To10}
                                        abvPercent={drink.abvPercent}
                                        compact
                                    />
                                </div>

                                <div
                                    className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-800/80"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleAction(drink.id, 'view')}
                                        disabled={isViewing || isDrinking}
                                        className="py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                                    >
                                        {isViewing ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                        <span>View Recipe</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleAction(drink.id, 'drink')}
                                        disabled={isViewing || isDrinking}
                                        className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-red-600/20"
                                    >
                                        {isDrinking ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Plus className="w-4 h-4 stroke-[2.5]" />
                                        )}
                                        <span>Drink Now</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && drinks.length === 0 && (
                <div className="py-20 text-center text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-3xl">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-neutral-400" />
                    <p className="text-sm font-medium">No drinks found matching your query.</p>
                </div>
            )}

            {/* Pagination Controls */}
            {pagedDrinks && (
                <PaginationControls
                    pageNumber={pagedDrinks.pageNumber}
                    totalPages={pagedDrinks.totalPages}
                    totalCount={pagedDrinks.totalCount}
                    hasPreviousPage={pagedDrinks.hasPreviousPage}
                    hasNextPage={pagedDrinks.hasNextPage}
                    onPageChange={(page) => setPageNumber(page)}
                    itemLabel="cocktails"
                />
            )}

            {/* Modals */}
            <DrinkDetailModal
                drink={viewedDrink}
                isOpen={!!viewedDrink}
                onClose={() => setViewedDrink(null)}
                onDrinkNow={(detail) => openModal(detail)}
            />
            <DoseCustomizerModal onSuccessLogged={() => refetch()} />
            <QuickCustomDrinkModal
                isOpen={isQuickPourOpen}
                onClose={() => setIsQuickPourOpen(false)}
            />
            <CreateDrinkModal
                isOpen={isCreateDrinkOpen}
                onClose={() => setIsCreateDrinkOpen(false)}
            />
            <CreateIngredientModal
                isOpen={isCreateIngredientOpen}
                onClose={() => setIsCreateIngredientOpen(false)}
            />
        </div>
    );
};