import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { syncApi } from '@/api/sync.api';
import { useDoseModalStore } from '@/store/useDoseModalStore';
import { useAuthStore } from '@/store/useAuthStore';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import { DoseCustomizerModal } from '@/components/drink/DoseCustomizerModal';
import { DrinkDetailModal } from '@/components/drink/DrinkDetailModal';
import { QuickCustomDrinkModal } from '@/components/drink/QuickCustomDrinkModal';
import { CreateDrinkModal } from '@/components/drink/CreateDrinkModal';
import { CreateIngredientModal } from '@/components/drink/CreateIngredientModal';
import { CocktailDbSyncModal } from '@/components/admin/CocktailDbSyncModal';
import { PaginationControls } from '@/components/common/PaginationControls';
import { DrinkCard } from '@/components/drink/DrinkCard';
import type { DrinkDetail } from '@/types';
import {
    Plus,
    Sparkles,
    Zap,
    Wine,
    Loader2,
    RefreshCw,
} from 'lucide-react';

const BASE_SPIRITS = [
    { label: 'All', query: '' },
    { label: 'Vodka', query: 'vodka' },
    { label: 'Gin', query: 'gin' },
    { label: 'Rum', query: 'rum' },
    { label: 'Tequila', query: 'tequila' },
    { label: 'Whiskey', query: 'whiskey' },
    { label: 'Cognac', query: 'cognac' },
    { label: 'Wine & Spritz', query: 'spritz' },
];

export const CatalogPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSpirit, setSelectedSpirit] = useState('');
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
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

    const { openModal } = useDoseModalStore();
    const { user } = useAuthStore();

    const isAdmin = user?.role === 'Admin' || String(user?.role) === '0';
    const canManageCatalog = isAdmin || user?.role === 'Bartender' || String(user?.role) === '1';

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            const effectiveQuery = searchQuery.trim() || selectedSpirit;
            setDebouncedSearch(effectiveQuery);
            setPageNumber(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedSpirit]);

    // Check if background sync is actively running for header indicator
    const { data: syncStatus } = useQuery({
        queryKey: ['cocktaildb-sync-status'],
        queryFn: syncApi.getCocktailDbSyncStatus,
        refetchInterval: (query) => (query.state.data?.isRunning ? 2000 : 15000),
        enabled: isAdmin,
    });

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
            {/* Header Control Panel */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white">Cocktail Catalog</h1>
                        <p className="text-xs text-neutral-400 mt-1">
                            Curated cocktail recipes, ABV calculations, and custom pouring.
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

                        {/* Admin Sync Button */}
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => setIsSyncModalOpen(true)}
                                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                                    syncStatus?.isRunning
                                        ? 'bg-red-600/20 border-red-600 text-red-300'
                                        : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-200'
                                }`}
                                title="Harvest cocktails from TheCocktailDB"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus?.isRunning ? 'animate-spin text-red-500' : 'text-neutral-400'}`} />
                                <span>{syncStatus?.isRunning ? 'Syncing...' : 'Sync TheCocktailDB'}</span>
                            </button>
                        )}

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

                {/* Instant Search Bar */}
                <GlobalSearch value={searchQuery} onChange={(v) => { setSearchQuery(v); if (v) setSelectedSpirit(''); }} />

                {/* Quick Spirit Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
                    {BASE_SPIRITS.map((tab) => {
                        const isSelected = selectedSpirit === tab.query && !searchQuery;
                        return (
                            <button
                                key={tab.label}
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedSpirit(tab.query);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                                    isSelected
                                        ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                                        : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="py-24 flex flex-col items-center justify-center text-neutral-500 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                    <span className="text-xs">Loading craft catalog...</span>
                </div>
            )}

            {/* Dark Editorial Cocktail Grid */}
            {!isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {drinks.map((drink) => (
                        <DrinkCard
                            key={drink.id}
                            drink={drink}
                            onView={(id) => handleAction(id, 'view')}
                            onDrink={(id) => handleAction(id, 'drink')}
                            isViewing={loadingAction?.id === drink.id && loadingAction.mode === 'view'}
                            isDrinking={loadingAction?.id === drink.id && loadingAction.mode === 'drink'}
                        />
                    ))}
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
            <CocktailDbSyncModal
                isOpen={isSyncModalOpen}
                onClose={() => {
                    setIsSyncModalOpen(false);
                    refetch();
                }}
            />
        </div>
    );
};