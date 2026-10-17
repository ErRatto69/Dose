import React, { useState, useMemo } from 'react';
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
import type { DrinkDetail } from '@/types';
import { Plus, Star, Sparkles, Eye, Zap, Wine, Loader2 } from 'lucide-react';
import { matchesSearchQuery } from '@/utils/textSearch';

export const CatalogPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
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

    const { data: drinks = [], isLoading, refetch } = useQuery({
        queryKey: ['drinks-catalog'],
        queryFn: drinksApi.getCatalog,
    });

    const filteredDrinks = useMemo(() => {
        return drinks.filter((d) =>
            matchesSearchQuery(searchQuery, d.name, d.description, d.glassType)
        );
    }, [drinks, searchQuery]);

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
            {/* Page Header, Search & Action Buttons */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                            Mixology Index
                        </span>
                        <h1 className="text-2xl font-black text-white">Cocktail Catalog</h1>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Explore craft recipes, or log a quick shot, beer, or custom mix on the fly.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsQuickPourOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
                        >
                            <Zap className="w-4 h-4" />
                            Quick Shot / Custom Pour
                        </button>

                        {canManageCatalog && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateDrinkOpen(true)}
                                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
                                >
                                    <Plus className="w-4 h-4 text-amber-400" />
                                    New Drink
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateIngredientOpen(true)}
                                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
                                >
                                    <Wine className="w-4 h-4 text-amber-400" />
                                    New Ingredient
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <GlobalSearch value={searchQuery} onChange={setSearchQuery} />
            </div>

            {isLoading && (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
                    <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                    <span className="text-xs">Loading craft catalog...</span>
                </div>
            )}

            {/* Responsive Multi-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDrinks.map((drink) => {
                    const isViewing =
                        loadingAction?.id === drink.id && loadingAction.mode === 'view';
                    const isDrinking =
                        loadingAction?.id === drink.id && loadingAction.mode === 'drink';

                    return (
                        <div
                            key={drink.id}
                            onClick={() => handleAction(drink.id, 'view')}
                            className="cursor-pointer p-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-4 shadow-md group"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors leading-tight">
                                                {drink.name}
                                            </h3>
                                            {drink.glassType && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                                                    {drink.glassType}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
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
                                className="grid grid-cols-2 gap-2 pt-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleAction(drink.id, 'view')}
                                    disabled={isViewing || isDrinking}
                                    className="py-2.5 px-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                                >
                                    {isViewing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                    View Recipe
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleAction(drink.id, 'drink')}
                                    disabled={isViewing || isDrinking}
                                    className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                                >
                                    {isDrinking ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4 stroke-[2.5]" />
                                    )}
                                    Drink Now
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {!isLoading && filteredDrinks.length === 0 && (
                <div className="py-16 text-center text-slate-500 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No drinks found matching your query.</p>
                </div>
            )}

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