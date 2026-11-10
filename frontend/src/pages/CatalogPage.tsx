import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { syncApi } from '@/api/sync.api';
import { useDoseModalStore } from '@/store/useDoseModalStore';
import { useAuthStore } from '@/store/useAuthStore';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import { DoseCustomizerModal } from '@/components/drink/DoseCustomizerModal';
import { DrinkDetailModal } from '@/components/drink/DrinkDetailModal';
import { CreateDrinkModal } from '@/components/drink/CreateDrinkModal';
import { CreateIngredientModal } from '@/components/drink/CreateIngredientModal';
import { CocktailDbSyncModal } from '@/components/admin/CocktailDbSyncModal';
import { DrinkCard } from '@/components/drink/DrinkCard';
import type { DrinkDetail } from '@/types';
import {
    Plus,
    Sparkles,
    Wine,
    Loader2,
    RefreshCw,
    AlertCircle,
} from 'lucide-react';
import { canManageCocktails, isAdmin } from '@/utils/auth';

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
    const pageSize = 12;

    const [loadingAction, setLoadingAction] = useState<{ id: string; mode: 'view' | 'drink' } | null>(
        null
    );
    const [actionError, setActionError] = useState<string | null>(null);
    const [viewedDrink, setViewedDrink] = useState<DrinkDetail | null>(null);

    // Create / Edit / Duplicate state
    const [isCreateDrinkOpen, setIsCreateDrinkOpen] = useState(false);
    const [createModalMode, setCreateModalMode] = useState<'create' | 'edit' | 'duplicate'>('create');
    const [initialDrinkForForm, setInitialDrinkForForm] = useState<DrinkDetail | null>(null);

    const [isCreateIngredientOpen, setIsCreateIngredientOpen] = useState(false);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    const { openModal } = useDoseModalStore();
    const { user } = useAuthStore();

    const hasAdminAccess = isAdmin(user);
    const canManageCatalog = canManageCocktails(user);

    // Debounce search query & spirit filters
    useEffect(() => {
        const timer = setTimeout(() => {
            const effectiveQuery = searchQuery.trim() || selectedSpirit;
            setDebouncedSearch(effectiveQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedSpirit]);

    // Check if background sync is actively running
    const { data: syncStatus } = useQuery({
        queryKey: ['cocktaildb-sync-status'],
        queryFn: syncApi.getCocktailDbSyncStatus,
        refetchInterval: (query) => (query.state.data?.isRunning ? 2000 : 15000),
        enabled: hasAdminAccess,
    });

    // Infinite Query for Drinks
    const {
        data: pagedDrinksData,
        isLoading,
        isError,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['drinks-catalog-infinite', debouncedSearch],
        queryFn: ({ pageParam = 1 }) =>
            drinksApi.getCatalog({
                pageNumber: Number(pageParam),
                pageSize,
                search: debouncedSearch.trim() || undefined,
            }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined,
    });

    const drinks = pagedDrinksData?.pages.flatMap((page) => page.items) ?? [];
    const totalCount = pagedDrinksData?.pages[0]?.totalCount ?? drinks.length;

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        const sentinel = loadMoreRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: '350px' }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleAction = async (drinkId: string, mode: 'view' | 'drink') => {
        try {
            setActionError(null);
            setLoadingAction({ id: drinkId, mode });
            const detail = await drinksApi.getById(drinkId);
            if (mode === 'view') {
                setViewedDrink(detail);
            } else {
                openModal(detail);
            }
        } catch (err) {
            console.error('Failed to load drink detail:', err);
            setActionError('Unable to load cocktail details. Please try again.');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleOpenCreateNew = () => {
        setInitialDrinkForForm(null);
        setCreateModalMode('create');
        setIsCreateDrinkOpen(true);
    };

    const handleOpenEdit = (drink: DrinkDetail) => {
        setInitialDrinkForForm(drink);
        setCreateModalMode('edit');
        setIsCreateDrinkOpen(true);
    };

    const handleOpenDuplicate = (drink: DrinkDetail) => {
        setInitialDrinkForForm(drink);
        setCreateModalMode('duplicate');
        setIsCreateDrinkOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Page Header & Search Controls */}
            <section className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
                            Cocktail Catalog
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                            Browse recipes, inspect ABV ratios, and customize pours directly to your BAC tracker.
                        </p>
                    </div>

                    {(hasAdminAccess || canManageCatalog) && (
                        <div className="flex flex-wrap items-center gap-2">
                            {hasAdminAccess && (
                                <button
                                    type="button"
                                    onClick={() => setIsSyncModalOpen(true)}
                                    className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border dose-press ${
                                        syncStatus?.isRunning
                                            ? 'bg-red-600/20 border-red-500/60 text-red-200'
                                            : 'bg-[#111114] hover:bg-[#18181d] border-white/[0.08] text-zinc-200'
                                    }`}
                                >
                                    <RefreshCw
                                        className={`w-3.5 h-3.5 ${
                                            syncStatus?.isRunning ? 'animate-spin text-red-400' : 'text-zinc-400'
                                        }`}
                                        aria-hidden="true"
                                    />
                                    <span>{syncStatus?.isRunning ? 'Syncing…' : 'Sync TheCocktailDB'}</span>
                                </button>
                            )}

                            {canManageCatalog && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleOpenCreateNew}
                                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-zinc-100 font-bold text-xs flex items-center gap-1.5 dose-press"
                                    >
                                        <Plus className="w-4 h-4 text-red-400" aria-hidden="true" />
                                        <span>New Drink</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateIngredientOpen(true)}
                                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-zinc-100 font-bold text-xs flex items-center gap-1.5 dose-press"
                                    >
                                        <Wine className="w-4 h-4 text-red-400" aria-hidden="true" />
                                        <span>New Ingredient</span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Search + Spirit Filter Strip */}
                <div className="p-4 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3">
                    <GlobalSearch
                        value={searchQuery}
                        onChange={(v) => {
                            setSearchQuery(v);
                            if (v) setSelectedSpirit('');
                        }}
                    />

                    <div
                        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
                        role="group"
                        aria-label="Filter by base spirit"
                    >
                        {BASE_SPIRITS.map((tab) => {
                            const isSelected = selectedSpirit === tab.query && !searchQuery;
                            return (
                                <button
                                    key={tab.label}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedSpirit(tab.query);
                                    }}
                                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 border dose-press ${
                                        isSelected
                                            ? 'bg-red-600 text-white border-red-500/60'
                                            : 'bg-[#0c0c0f] text-zinc-400 hover:text-zinc-100 border-white/[0.08]'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {actionError && (
                <div
                    role="alert"
                    className="p-3.5 rounded-2xl bg-red-950/60 border border-red-700/60 text-xs text-red-200 flex items-center justify-between gap-3"
                >
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
                        <span>{actionError}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setActionError(null)}
                        className="text-xs font-bold text-red-300 hover:text-white"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Skeleton Loading Grid */}
            {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" aria-busy="true" aria-label="Loading cocktails">
                    {Array.from({ length: 8 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden"
                        >
                            <div className="aspect-[4/3] w-full bg-[#0c0c0f]" />
                            <div className="p-4 space-y-2.5">
                                <div className="h-5 w-2/3 rounded-lg bg-white/[0.06]" />
                                <div className="h-3.5 w-full rounded bg-white/[0.04]" />
                                <div className="h-3.5 w-4/5 rounded bg-white/[0.04]" />
                                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06]">
                                    <div className="h-10 rounded-xl bg-white/[0.05]" />
                                    <div className="h-10 rounded-xl bg-red-600/20" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error State */}
            {!isLoading && isError && (
                <div className="py-16 px-6 text-center bg-[#111114] border border-white/[0.08] rounded-2xl space-y-3">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto" aria-hidden="true" />
                    <div className="space-y-1">
                        <h2 className="text-base font-extrabold text-white">Failed to load catalog</h2>
                        <p className="text-xs text-zinc-400">
                            Check your connection to the Dose server and retry.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold inline-flex items-center gap-1.5 dose-press"
                    >
                        <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Retry</span>
                    </button>
                </div>
            )}

            {/* Cocktail Grid */}
            {!isLoading && !isError && drinks.length > 0 && (
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
            {!isLoading && !isError && drinks.length === 0 && (
                <div className="py-16 px-6 text-center bg-[#111114] border border-white/[0.08] rounded-2xl space-y-3">
                    <Sparkles className="w-8 h-8 mx-auto text-zinc-500" aria-hidden="true" />
                    <div className="space-y-1">
                        <h2 className="text-base font-bold text-white">No cocktails found</h2>
                        <p className="text-xs text-zinc-400">
                            {debouncedSearch
                                ? `No recipes matched “${debouncedSearch}”. Try another spirit or clear filters.`
                                : 'Your bar catalog is currently empty.'}
                        </p>
                    </div>
                    {(searchQuery || selectedSpirit) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedSpirit('');
                            }}
                            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-xs font-bold text-zinc-200 dose-press"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            )}

            {/* Infinite Scroll Sentinel */}
            <div ref={loadMoreRef} className="h-4 w-full pointer-events-none" aria-hidden="true" />

            {isFetchingNextPage && (
                <div className="py-6 flex items-center justify-center gap-2 text-zinc-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" aria-hidden="true" />
                    <span>Loading more cocktails…</span>
                </div>
            )}

            {!isLoading && !isError && !hasNextPage && drinks.length > 0 && (
                <div className="py-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-3 tabular-nums">
                    <div className="h-px bg-white/[0.08] w-14 sm:w-28" aria-hidden="true" />
                    <span>End of catalog ({totalCount} cocktails)</span>
                    <div className="h-px bg-white/[0.08] w-14 sm:w-28" aria-hidden="true" />
                </div>
            )}

            {/* Modals */}
            <DrinkDetailModal
                drink={viewedDrink}
                isOpen={!!viewedDrink}
                onClose={() => setViewedDrink(null)}
                onDrinkNow={(detail) => openModal(detail)}
                onEdit={handleOpenEdit}
                onDuplicate={handleOpenDuplicate}
                onDeleted={() => refetch()}
            />
            <DoseCustomizerModal onSuccessLogged={() => refetch()} />
            <CreateDrinkModal
                isOpen={isCreateDrinkOpen}
                onClose={() => {
                    setIsCreateDrinkOpen(false);
                    setInitialDrinkForForm(null);
                }}
                initialDrink={initialDrinkForForm}
                mode={createModalMode}
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
