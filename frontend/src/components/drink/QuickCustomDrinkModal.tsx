import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { bacApi } from '@/api/bac.api';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/store/useAuthStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { formatVolume } from '@/utils/units';
import { calculateStrengthMetrics, estimateDeltaBac } from '@/utils/strengthCalc';
import { BottleStrengthMeter } from './BottleStrengthMeter';
import { DrinkThumbnail } from './DrinkThumbnail';
import {
    PourSizeSelector,
    PourTimingSelector,
    StomachSelector,
} from './DrinkPourControls';
import { getStomachLabel } from './drinkPourOptions';
import { ModalShell } from '@/components/common/ModalShell';
import type { DrinkDetail, Ingredient, IngredientCategory, StomachState } from '@/types';
import {
    Search,
    Plus,
    Minus,
    Trash2,
    Zap,
    Check,
    Loader2,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    SlidersHorizontal,
    ArrowLeft,
    X,
} from 'lucide-react';
import { matchesSearchQuery } from '@/utils/textSearch';

interface QuickCustomDrinkModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SelectedCustomComponent {
    ingredient: Ingredient;
    amountCl: number;
}

interface EditableMenuComponent {
    ingredientId: string;
    name: string;
    category: IngredientCategory;
    abv: number;
    amountCl: number;
    baseAmountCl: number;
}

type BottleCategoryFilter = 'ALL' | 'BEER' | 'WINE' | 'SPIRIT' | 'MIXER';

const BOTTLE_FILTERS: ReadonlyArray<{ id: BottleCategoryFilter; label: string }> = [
    { id: 'ALL', label: 'All' },
    { id: 'BEER', label: 'Beer' },
    { id: 'WINE', label: 'Wine' },
    { id: 'SPIRIT', label: 'Spirits & Shots' },
    { id: 'MIXER', label: 'Mixers' },
];

const isAlcoholicCategory = (cat: IngredientCategory) =>
    cat === 'Spirit' || cat === 'Liqueur' || cat === 'Wine' || cat === 'Beer';

const getServingPresetsForCategory = (category: IngredientCategory): ReadonlyArray<{ name: string; cl: number }> => {
    if (category === 'Beer') {
        return [
            { name: 'Small', cl: 33 },
            { name: 'Medium', cl: 40 },
            { name: 'Pint', cl: 50 },
        ];
    }
    if (category === 'Wine') {
        return [
            { name: 'Small', cl: 12 },
            { name: 'Glass', cl: 15 },
            { name: 'Large', cl: 20 },
        ];
    }
    if (category === 'Spirit' || category === 'Liqueur') {
        return [
            { name: 'Mini', cl: 2 },
            { name: 'Shot', cl: 4 },
            { name: 'Heavy', cl: 6 },
            { name: 'Double', cl: 8 },
        ];
    }
    return [
        { name: 'Splash', cl: 5 },
        { name: 'Half', cl: 10 },
        { name: 'Tall', cl: 15 },
        { name: 'Full', cl: 25 },
    ];
};

const getDefaultServingCl = (category: IngredientCategory): number => {
    if (category === 'Beer') return 33;
    if (category === 'Wine') return 15;
    if (category === 'Spirit' || category === 'Liqueur') return 4;
    return 10;
};

const matchesBottleFilter = (category: IngredientCategory, filter: BottleCategoryFilter): boolean => {
    if (filter === 'ALL') return true;
    if (filter === 'BEER') return category === 'Beer';
    if (filter === 'WINE') return category === 'Wine';
    if (filter === 'SPIRIT') return category === 'Spirit' || category === 'Liqueur';
    return category === 'Mixer' || category === 'Syrup' || category === 'Pantry';
};

const pickBalancedSampler = (list: Ingredient[]): Ingredient[] => {
    const pick = (cats: IngredientCategory[], limit: number) =>
        list.filter((i) => cats.includes(i.category)).slice(0, limit);
    const sampler = [
        ...pick(['Beer'], 4),
        ...pick(['Wine'], 4),
        ...pick(['Spirit', 'Liqueur'], 6),
        ...pick(['Mixer'], 4),
    ];
    return sampler.length >= 8 ? sampler : list.slice(0, 16);
};

export const QuickCustomDrinkModal: React.FC<QuickCustomDrinkModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { user } = useAuthStore();
    const { preferredUnit } = usePreferencesStore();
    const queryClient = useQueryClient();

    const [mode, setMode] = useState<'custom' | 'menu'>('custom');
    const [bottleFilter, setBottleFilter] = useState<BottleCategoryFilter>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [customName, setCustomName] = useState('');
    const [items, setItems] = useState<SelectedCustomComponent[]>([]);
    const [stomachState, setStomachState] = useState<StomachState>('LightSnack');
    const [isNow, setIsNow] = useState(true);
    const [customConsumedAt, setCustomConsumedAt] = useState('');
    const [notes, setNotes] = useState('');
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);

    // Inline Menu Cocktail state
    const [menuSearch, setMenuSearch] = useState('');
    const [selectedMenuDrink, setSelectedMenuDrink] = useState<DrinkDetail | null>(null);
    const [menuComponents, setMenuComponents] = useState<EditableMenuComponent[]>([]);
    const [menuMultiplier, setMenuMultiplier] = useState<number | null>(1);
    const [loadingMenuDrinkId, setLoadingMenuDrinkId] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const { data: allIngredients = [], isLoading: isLoadingIngredients } = useQuery({
        queryKey: ['all-ingredients'],
        queryFn: () => drinksApi.getAllIngredients(),
        enabled: isOpen && mode === 'custom',
    });

    const { data: menuCatalogPage, isLoading: isLoadingMenu } = useQuery({
        queryKey: ['quick-menu-drinks', menuSearch],
        queryFn: () =>
            drinksApi.getCatalog({
                search: menuSearch.trim() || undefined,
                pageSize: 12,
            }),
        enabled: isOpen && mode === 'menu' && !selectedMenuDrink,
    });

    const filteredIngredients = useMemo(() => {
        const nonGarnishes = allIngredients.filter(
            (i) => i.category !== 'Garnish' && matchesBottleFilter(i.category, bottleFilter)
        );
        if (!searchQuery.trim()) {
            return bottleFilter === 'ALL'
                ? pickBalancedSampler(nonGarnishes)
                : nonGarnishes.slice(0, 16);
        }
        return nonGarnishes
            .filter((i) =>
                matchesSearchQuery(searchQuery, i.name, i.subCategory, i.flavor, i.category)
            )
            .slice(0, 16);
    }, [allIngredients, bottleFilter, searchQuery]);

    const selectedIds = useMemo(() => new Set(items.map((x) => x.ingredient.id)), [items]);

    const customMetrics = useMemo(() => {
        return calculateStrengthMetrics(
            items.map((x) => ({
                category: x.ingredient.category,
                amountCl: x.amountCl,
                abvPercent: x.ingredient.abv,
                ingredientName: x.ingredient.name,
            }))
        );
    }, [items]);

    const menuMetrics = useMemo(() => {
        return calculateStrengthMetrics(
            menuComponents.map((c) => ({
                category: c.category,
                amountCl: c.amountCl,
                abvPercent: c.abv,
                ingredientName: c.name,
            }))
        );
    }, [menuComponents]);

    const activeMetrics = mode === 'menu' && selectedMenuDrink ? menuMetrics : customMetrics;

    const deltaBacEstimate = useMemo(() => {
        if (!user) return 0;
        const normalizedSex = user.sex === 'Female' || String(user.sex) === '1' ? 'Female' : 'Male';
        return estimateDeltaBac(
            activeMetrics.pureAlcoholGrams,
            user.weightKg,
            user.heightCm,
            normalizedSex,
            user.birthYear ?? undefined,
            stomachState
        );
    }, [activeMetrics.pureAlcoholGrams, user, stomachState]);

    const resetAndClose = () => {
        if (isSubmitting) return;
        setSearchQuery('');
        setBottleFilter('ALL');
        setItems([]);
        setCustomName('');
        setNotes('');
        setIsNow(true);
        setIsOptionsOpen(false);
        setSelectedMenuDrink(null);
        setMenuComponents([]);
        setMenuMultiplier(1);
        setMenuSearch('');
        setSubmitError(null);
        onClose();
    };

    const addOrIncrementIngredient = (ing: Ingredient) => {
        const defaultCl = getDefaultServingCl(ing.category);
        setItems((prev) => {
            const existing = prev.find((x) => x.ingredient.id === ing.id);
            if (existing) {
                return prev.map((x) =>
                    x.ingredient.id === ing.id
                        ? { ...x, amountCl: Math.round((x.amountCl + 2) * 10) / 10 }
                        : x
                );
            }
            return [...prev, { ingredient: ing, amountCl: defaultCl }];
        });
        setSearchQuery('');
    };

    const updateDose = (id: string, deltaCl: number) => {
        setItems((prev) =>
            prev.map((x) =>
                x.ingredient.id === id
                    ? { ...x, amountCl: Math.max(0.5, Math.round((x.amountCl + deltaCl) * 10) / 10) }
                    : x
            )
        );
    };

    const setExactDose = (id: string, cl: number) => {
        setItems((prev) =>
            prev.map((x) => (x.ingredient.id === id ? { ...x, amountCl: cl } : x))
        );
    };

    const removeItem = (id: string) => {
        setItems((prev) => prev.filter((x) => x.ingredient.id !== id));
    };

    const handlePickMenuDrink = async (drinkId: string) => {
        try {
            setSubmitError(null);
            setLoadingMenuDrinkId(drinkId);
            const detail = await drinksApi.getById(drinkId);
            setSelectedMenuDrink(detail);
            setMenuComponents(
                detail.ingredients.map((ing) => ({
                    ingredientId: ing.ingredientId,
                    name: ing.name,
                    category: ing.category,
                    abv: ing.abv,
                    amountCl: ing.amountCl,
                    baseAmountCl: ing.amountCl,
                }))
            );
            setMenuMultiplier(1);
            setIsNow(true);
            setCustomConsumedAt('');
        } catch (err) {
            console.error('Failed to load cocktail:', err);
            setSubmitError('Could not load cocktail details. Please try again.');
        } finally {
            setLoadingMenuDrinkId(null);
        }
    };

    const handleSelectMenuMultiplier = (mult: number) => {
        setMenuMultiplier(mult);
        setMenuComponents((prev) =>
            prev.map((comp) => ({
                ...comp,
                amountCl: isAlcoholicCategory(comp.category)
                    ? Math.max(0, Math.round(comp.baseAmountCl * mult * 10) / 10)
                    : comp.amountCl,
            }))
        );
    };

    const handleSubmit = async () => {
        const consumedAt = isNow
            ? new Date().toISOString()
            : (customConsumedAt.includes('T')
                ? new Date(customConsumedAt).toISOString()
                : new Date().toISOString());

        try {
            setSubmitError(null);
            setIsSubmitting(true);

            if (mode === 'menu') {
                if (!selectedMenuDrink || menuMetrics.totalVolumeCl <= 0) return;
                await bacApi.logDrink(selectedMenuDrink.id, {
                    consumedAt,
                    notes: notes.trim() || undefined,
                    stomachState,
                    customComponents: menuComponents
                        .filter((c) => c.amountCl > 0)
                        .map((c) => ({
                            ingredientId: c.ingredientId,
                            amountCl: c.amountCl,
                        })),
                });
            } else {
                if (items.length === 0 || customMetrics.totalVolumeCl <= 0) return;
                await bacApi.logCustomDrink({
                    customName: customName.trim() || undefined,
                    consumedAt,
                    notes: notes.trim() || undefined,
                    stomachState,
                    components: items.map((x) => ({
                        ingredientId: x.ingredient.id,
                        amountCl: x.amountCl,
                    })),
                });
            }

            queryClient.invalidateQueries({ queryKey: queryKeys.bac.me() });
            queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.monthly() });
            queryClient.invalidateQueries({ queryKey: queryKeys.gamification.monthlyBadges() });
            queryClient.invalidateQueries({ queryKey: queryKeys.gamification.passport() });
            setIsSubmitting(false);
            setSearchQuery('');
            setBottleFilter('ALL');
            setItems([]);
            setCustomName('');
            setNotes('');
            setIsNow(true);
            setIsOptionsOpen(false);
            setSelectedMenuDrink(null);
            setMenuComponents([]);
            setMenuMultiplier(1);
            setMenuSearch('');
            onClose();
        } catch (err) {
            console.error('Failed to log drink:', err);
            setSubmitError('Could not log drink. Check your network and try again.');
            setIsSubmitting(false);
        }
    };

    const hasReadySelection =
        mode === 'custom'
            ? items.length > 0 && customMetrics.totalVolumeCl > 0
            : Boolean(selectedMenuDrink) && menuMetrics.totalVolumeCl > 0;

    const subheader = hasReadySelection ? (
        <div className="px-5 py-2.5 flex items-center justify-between gap-3 text-xs tabular-nums">
            <div>
                <span className="text-zinc-400">In your glass: </span>
                <strong className="text-zinc-100 font-extrabold">
                    {formatVolume(activeMetrics.totalVolumeCl, preferredUnit) || '0 cl'}
                </strong>
                {activeMetrics.abvPercent > 0 && (
                    <span className="text-zinc-400"> · {activeMetrics.abvPercent.toFixed(0)}% ABV</span>
                )}
            </div>
            <div>
                <span className="text-zinc-400">Est. </span>
                <strong className="text-red-400 font-extrabold text-sm">
                    +{deltaBacEstimate.toFixed(2)} g/L
                </strong>
            </div>
        </div>
    ) : undefined;

    const footer = (
        <div className="space-y-2">
            <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !hasReadySelection}
                className="w-full min-h-[50px] py-3 px-4 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-extrabold text-sm flex items-center justify-center gap-2 border border-red-400/50 tabular-nums dose-press"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Logging Drink…</span>
                    </>
                ) : hasReadySelection ? (
                    <>
                        <Check className="w-4 h-4 stroke-[2.75]" aria-hidden="true" />
                        <span>Log Drink (+{deltaBacEstimate.toFixed(2)} g/L)</span>
                    </>
                ) : (
                    <span>{mode === 'menu' ? 'Pick a cocktail above' : 'Pick a drink above'}</span>
                )}
            </button>
            <p className="text-[11px] text-zinc-500 text-center">
                Editable for 12h in My BAC · Never drive above 0.50 g/L.
            </p>
        </div>
    );

    const menuItems = menuCatalogPage?.items ?? [];

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={resetAndClose}
            title="Log a Drink"
            badge={
                <span className="text-xs font-bold text-red-400 inline-flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-red-400" aria-hidden="true" />
                    <span>Quick Beer, Wine, Shot or Cocktail</span>
                </span>
            }
            subheader={subheader}
            footer={footer}
            closeDisabled={isSubmitting}
        >
            <div className="space-y-5">
                {submitError && (
                    <div
                        role="alert"
                        className="p-3 rounded-xl bg-red-950/60 border border-red-700/60 text-xs text-red-200 flex items-center gap-2"
                    >
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
                        <span>{submitError}</span>
                    </div>
                )}

                {/* Clear 2-Way Mode Selector */}
                <div
                    className="grid grid-cols-2 p-1 rounded-xl bg-[#0c0c0f] border border-white/[0.08]"
                    role="group"
                    aria-label="Drink log mode"
                >
                    <button
                        type="button"
                        aria-pressed={mode === 'custom'}
                        onClick={() => {
                            setMode('custom');
                            setSubmitError(null);
                        }}
                        className={`min-h-[40px] px-3 rounded-lg text-xs font-extrabold dose-press ${
                            mode === 'custom'
                                ? 'bg-red-600 text-white'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        Beer, Wine &amp; Mix
                    </button>
                    <button
                        type="button"
                        aria-pressed={mode === 'menu'}
                        onClick={() => {
                            setMode('menu');
                            setSubmitError(null);
                        }}
                        className={`min-h-[40px] px-3 rounded-lg text-xs font-extrabold dose-press ${
                            mode === 'menu'
                                ? 'bg-red-600 text-white'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        From Menu
                    </button>
                </div>

                {mode === 'custom' ? (
                    <>
                        {/* Step 1: Pick drink(s) */}
                        <div className="space-y-3">
                            <span className="text-xs font-bold text-zinc-200 block">
                                1. What are you drinking?
                            </span>

                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                                {BOTTLE_FILTERS.map((f) => {
                                    const isActive = bottleFilter === f.id;
                                    return (
                                        <button
                                            key={f.id}
                                            type="button"
                                            aria-pressed={isActive}
                                            onClick={() => setBottleFilter(f.id)}
                                            className={`min-h-[36px] px-3 rounded-full text-xs font-bold shrink-0 border dose-press ${
                                                isActive
                                                    ? 'bg-red-600/20 border-red-500/70 text-red-200'
                                                    : 'bg-[#0c0c0f] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="relative">
                                <Search
                                    className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                    aria-hidden="true"
                                />
                                <input
                                    id="quick-pour-search"
                                    type="search"
                                    aria-label="Search drink or bottle"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search beer, wine, vodka, gin…"
                                    className="w-full min-h-[44px] pl-10 pr-10 py-2 rounded-xl text-sm dose-input"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        aria-label="Clear search"
                                        className="w-9 h-9 rounded-lg flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                                    >
                                        <X className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                )}
                            </div>

                            {isLoadingIngredients ? (
                                <div className="py-6 flex items-center justify-center gap-2 text-xs text-zinc-400">
                                    <Loader2 className="w-4 h-4 animate-spin text-red-500" aria-hidden="true" />
                                    <span>Loading drinks…</span>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto overscroll-contain p-0.5">
                                    {filteredIngredients.map((ing) => {
                                        const isPicked = selectedIds.has(ing.id);
                                        return (
                                            <button
                                                key={ing.id}
                                                type="button"
                                                onClick={() => addOrIncrementIngredient(ing)}
                                                className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 dose-press ${
                                                    isPicked
                                                        ? 'bg-red-600/20 border-red-500/70 text-white'
                                                        : 'bg-[#0c0c0f] hover:bg-[#18181d] border-white/[0.08] text-zinc-100'
                                                }`}
                                            >
                                                {isPicked ? (
                                                    <Check className="w-3.5 h-3.5 text-red-400 stroke-[2.75]" aria-hidden="true" />
                                                ) : (
                                                    <Plus className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                                                )}
                                                <span className="font-bold">{ing.name}</span>
                                                {ing.abv > 0 && (
                                                    <span className="text-[11px] tabular-nums text-red-400 font-bold">
                                                        {ing.abv}%
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                    {filteredIngredients.length === 0 && (
                                        <p className="text-xs text-zinc-400 py-3">
                                            No matching drinks or mixers found.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Step 2: How much? (shown prominently once tapped) */}
                        {items.length > 0 && (
                            <div className="space-y-3">
                                <span className="text-xs font-bold text-zinc-200 block">
                                    2. How much? ({items.length} selected)
                                </span>
                                {items.map(({ ingredient, amountCl }) => {
                                    const presets = getServingPresetsForCategory(ingredient.category);
                                    return (
                                        <div
                                            key={ingredient.id}
                                            className="p-3.5 rounded-2xl bg-[#0c0c0f] border border-white/[0.08] space-y-3"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-white truncate">
                                                        {ingredient.name}
                                                    </div>
                                                    <div className="text-[11px] text-zinc-400">
                                                        {ingredient.subCategory}
                                                        {ingredient.abv > 0 && (
                                                            <span className="tabular-nums"> · {ingredient.abv}% ABV</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateDose(ingredient.id, -0.5)}
                                                        aria-label={`Decrease ${ingredient.name}`}
                                                        className="w-10 h-10 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] flex items-center justify-center text-zinc-200 dose-press"
                                                    >
                                                        <Minus className="w-4 h-4" aria-hidden="true" />
                                                    </button>
                                                    <span className="w-16 text-center tabular-nums font-extrabold text-sm text-red-400">
                                                        {formatVolume(amountCl, preferredUnit)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateDose(ingredient.id, 0.5)}
                                                        aria-label={`Increase ${ingredient.name}`}
                                                        className="w-10 h-10 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] flex items-center justify-center text-zinc-200 dose-press"
                                                    >
                                                        <Plus className="w-4 h-4" aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(ingredient.id)}
                                                        aria-label={`Remove ${ingredient.name}`}
                                                        className="w-10 h-10 rounded-xl bg-[#111114] hover:bg-red-950/60 border border-white/[0.08] text-zinc-400 hover:text-red-400 flex items-center justify-center ml-0.5 dose-press"
                                                    >
                                                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.06]">
                                                {presets.map((preset) => (
                                                    <button
                                                        key={preset.cl}
                                                        type="button"
                                                        onClick={() => setExactDose(ingredient.id, preset.cl)}
                                                        className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border tabular-nums dose-press ${
                                                            amountCl === preset.cl
                                                                ? 'bg-red-600 text-white border-red-400/70'
                                                                : 'bg-[#111114] border-white/[0.08] text-zinc-300 hover:text-white'
                                                        }`}
                                                    >
                                                        {formatVolume(preset.cl, preferredUnit)} · {preset.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                <PourTimingSelector
                                    label="3. When did you drink it?"
                                    isNow={isNow}
                                    customConsumedAt={customConsumedAt}
                                    onToggleNow={setIsNow}
                                    onChangeTime={setCustomConsumedAt}
                                />
                            </div>
                        )}
                    </>
                ) : selectedMenuDrink ? (
                    <>
                        {/* Selected Menu Cocktail Streamlined Pour */}
                        <div className="p-3 rounded-2xl bg-[#0c0c0f] border border-white/[0.08] flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <DrinkThumbnail
                                    imageUrl={selectedMenuDrink.imageUrl}
                                    alt={selectedMenuDrink.name}
                                    sizeClass="w-12 h-12 rounded-xl"
                                    iconClass="w-5 h-5"
                                />
                                <div className="min-w-0">
                                    <h3 className="font-display text-xl font-bold text-white leading-tight truncate">
                                        {selectedMenuDrink.name}
                                    </h3>
                                    <p className="text-[11px] text-zinc-400 tabular-nums">
                                        {selectedMenuDrink.ingredients.length} ingredients
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedMenuDrink(null);
                                    setMenuComponents([]);
                                }}
                                className="min-h-[38px] px-3 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-xs font-bold text-zinc-200 inline-flex items-center gap-1.5 shrink-0 dose-press"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Change</span>
                            </button>
                        </div>

                        <PourSizeSelector
                            selectedMultiplier={menuMultiplier}
                            onSelect={handleSelectMenuMultiplier}
                        />

                        <PourTimingSelector
                            isNow={isNow}
                            customConsumedAt={customConsumedAt}
                            onToggleNow={setIsNow}
                            onChangeTime={setCustomConsumedAt}
                        />
                    </>
                ) : (
                    /* Search Menu Cocktails */
                    <div className="space-y-3">
                        <span className="text-xs font-bold text-zinc-200 block">
                            1. Pick a cocktail from the menu
                        </span>

                        <div className="relative">
                            <Search
                                className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                aria-hidden="true"
                            />
                            <input
                                type="search"
                                aria-label="Search cocktail menu"
                                value={menuSearch}
                                onChange={(e) => setMenuSearch(e.target.value)}
                                placeholder="Search Negroni, Spritz, Mojito…"
                                className="w-full min-h-[44px] pl-10 pr-10 py-2 rounded-xl text-sm dose-input"
                            />
                            {menuSearch && (
                                <button
                                    type="button"
                                    onClick={() => setMenuSearch('')}
                                    aria-label="Clear menu search"
                                    className="w-9 h-9 rounded-lg flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" aria-hidden="true" />
                                </button>
                            )}
                        </div>

                        {isLoadingMenu ? (
                            <div className="py-10 flex items-center justify-center gap-2 text-xs text-zinc-400">
                                <Loader2 className="w-4 h-4 animate-spin text-red-500" aria-hidden="true" />
                                <span>Loading menu cocktails…</span>
                            </div>
                        ) : menuItems.length === 0 ? (
                            <p className="text-xs text-zinc-400 text-center py-8">
                                No cocktails match &ldquo;{menuSearch}&rdquo;. Try another search or switch to Beer, Wine &amp; Mix.
                            </p>
                        ) : (
                            <div className="rounded-2xl bg-[#0c0c0f] border border-white/[0.08] divide-y divide-white/[0.06] max-h-72 overflow-y-auto overscroll-contain">
                                {menuItems.map((drink) => {
                                    const isRowLoading = loadingMenuDrinkId === drink.id;
                                    return (
                                        <button
                                            key={drink.id}
                                            type="button"
                                            onClick={() => handlePickMenuDrink(drink.id)}
                                            disabled={loadingMenuDrinkId !== null}
                                            className="w-full p-2.5 flex items-center justify-between gap-3 text-left hover:bg-[#141418] transition-colors disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <DrinkThumbnail
                                                    imageUrl={drink.imageUrl}
                                                    alt={drink.name}
                                                    sizeClass="w-12 h-12 rounded-xl"
                                                    iconClass="w-5 h-5"
                                                />
                                                <div className="min-w-0">
                                                    <div className="font-display text-lg font-bold text-white leading-tight truncate">
                                                        {drink.name}
                                                    </div>
                                                    <div className="text-[11px] text-zinc-400 tabular-nums mt-0.5">
                                                        {formatVolume(drink.totalVolumeCl, preferredUnit)} · {drink.abvPercent.toFixed(1)}% ABV
                                                    </div>
                                                </div>
                                            </div>
                                            {isRowLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-red-400 shrink-0" aria-hidden="true" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" aria-hidden="true" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Collapsible Extras: Stomach Fullness, Label & Strength */}
                {hasReadySelection && (
                    <div className="rounded-2xl bg-[#0c0c0f] border border-white/[0.08] overflow-hidden">
                        <button
                            type="button"
                            aria-expanded={isOptionsOpen}
                            onClick={() => setIsOptionsOpen((v) => !v)}
                            className="w-full min-h-[50px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#141418] transition-colors"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <SlidersHorizontal className="w-4 h-4 text-zinc-400 shrink-0" aria-hidden="true" />
                                <div className="min-w-0">
                                    <span className="text-xs font-bold text-zinc-100 block">
                                        More options (stomach &amp; label)
                                    </span>
                                    <span className="text-[11px] text-zinc-400 tabular-nums block truncate">
                                        {getStomachLabel(stomachState)} · {activeMetrics.estimatedKcal} kcal
                                    </span>
                                </div>
                            </div>
                            <ChevronDown
                                className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-150 ${
                                    isOptionsOpen ? 'rotate-180' : ''
                                }`}
                                aria-hidden="true"
                            />
                        </button>

                        {isOptionsOpen && (
                            <div className="p-4 pt-3 border-t border-white/[0.08] space-y-4">
                                <StomachSelector value={stomachState} onChange={setStomachState} />

                                <BottleStrengthMeter
                                    score1To10={activeMetrics.bottleScore1To10}
                                    bottleRating={activeMetrics.bottleVisualRating}
                                    abvPercent={activeMetrics.abvPercent}
                                    compact
                                />

                                {mode === 'custom' && (
                                    <div>
                                        <label
                                            htmlFor="quick-pour-label"
                                            className="text-xs font-bold text-zinc-200 block mb-1.5"
                                        >
                                            Custom Name (optional)
                                        </label>
                                        <input
                                            id="quick-pour-label"
                                            type="text"
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value)}
                                            placeholder="e.g., Double Vodka, Draft Pint…"
                                            className="w-full min-h-[42px] px-3.5 py-2 text-xs rounded-xl dose-input"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label
                                        htmlFor="quick-pour-notes"
                                        className="text-xs font-bold text-zinc-200 block mb-1.5"
                                    >
                                        Notes (optional)
                                    </label>
                                    <input
                                        id="quick-pour-notes"
                                        type="text"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="e.g., Bar name, party…"
                                        className="w-full min-h-[42px] px-3.5 py-2 text-xs rounded-xl dose-input"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </ModalShell>
    );
};
