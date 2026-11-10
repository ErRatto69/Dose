import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDoseModalStore } from '@/store/useDoseModalStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useAuthStore } from '@/store/useAuthStore';
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
import { bacApi } from '@/api/bac.api';
import { drinksApi } from '@/api/drinks.api';
import { queryKeys } from '@/api/queryKeys';
import type { StomachState } from '@/types';
import {
    Minus,
    Plus,
    Check,
    Loader2,
    Trash2,
    Search,
    RefreshCw,
    AlertCircle,
    ChevronDown,
    SlidersHorizontal,
} from 'lucide-react';
import { matchesSearchQuery } from '@/utils/textSearch';

interface DoseCustomizerModalProps {
    onSuccessLogged?: () => void;
}

export const DoseCustomizerModal: React.FC<DoseCustomizerModalProps> = ({ onSuccessLogged }) => {
    const {
        isOpen,
        drink,
        components,
        selectedMultiplier,
        isNow,
        customConsumedAt,
        notes,
        closeModal,
        updateComponentDose,
        replaceComponentIngredient,
        addCustomComponent,
        removeComponent,
        applyMultiplier,
        setIsNow,
        setCustomConsumedAt,
        setNotes,
    } = useDoseModalStore();

    const { preferredUnit } = usePreferencesStore();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [stomachState, setStomachState] = useState<StomachState>('LightSnack');
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [showAddIngredient, setShowAddIngredient] = useState(false);
    const [ingredientSearch, setIngredientSearch] = useState('');
    const [prevDrinkId, setPrevDrinkId] = useState<string | null>(null);

    if (drink?.id && drink.id !== prevDrinkId) {
        setPrevDrinkId(drink.id);
        setIsOptionsOpen(false);
        setShowAddIngredient(false);
        setIngredientSearch('');
        setSubmitError(null);
    }

    const { data: allIngredients = [] } = useQuery({
        queryKey: ['all-ingredients'],
        queryFn: () => drinksApi.getAllIngredients(),
        enabled: isOpen && isOptionsOpen,
    });

    const filteredAddableIngredients = useMemo(() => {
        if (!ingredientSearch.trim()) return allIngredients.slice(0, 12);
        return allIngredients
            .filter((i) =>
                matchesSearchQuery(ingredientSearch, i.name, i.subCategory, i.flavor, i.category)
            )
            .slice(0, 12);
    }, [allIngredients, ingredientSearch]);

    const metrics = useMemo(() => {
        return calculateStrengthMetrics(
            components.map((c) => ({
                category: c.category,
                amountCl: c.amountCl,
                abvPercent: c.abv,
                ingredientName: c.name,
            }))
        );
    }, [components]);

    const deltaBacEstimate = useMemo(() => {
        if (!user) return 0;
        const normalizedSex = user.sex === 'Female' || String(user.sex) === '1' ? 'Female' : 'Male';
        return estimateDeltaBac(
            metrics.pureAlcoholGrams,
            user.weightKg,
            user.heightCm,
            normalizedSex,
            user.birthYear ?? undefined,
            stomachState
        );
    }, [metrics.pureAlcoholGrams, user, stomachState]);

    if (!drink) return null;

    const activeIngredientsCount = components.filter((c) => c.amountCl > 0).length;

    const getMatchingAlternatives = (subCategory: string, flavor?: string | null) => {
        return allIngredients.filter(
            (ing) =>
                (ing.subCategory || '').toLowerCase() === (subCategory || '').toLowerCase() &&
                (ing.flavor ?? '').toLowerCase() === (flavor ?? '').toLowerCase()
        );
    };

    const handleSubmit = async () => {
        try {
            setSubmitError(null);
            setIsSubmitting(true);
            const consumedAt = isNow
                ? new Date().toISOString()
                : (customConsumedAt.includes('T')
                    ? new Date(customConsumedAt).toISOString()
                    : new Date().toISOString());

            await bacApi.logDrink(drink.id, {
                consumedAt,
                notes: notes.trim() || undefined,
                stomachState,
                customComponents: components
                    .filter((c) => c.amountCl > 0)
                    .map((c) => ({
                        ingredientId: c.ingredientId,
                        amountCl: c.amountCl,
                    })),
            });

            queryClient.invalidateQueries({ queryKey: queryKeys.bac.me() });
            queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.monthly() });
            queryClient.invalidateQueries({ queryKey: queryKeys.gamification.monthlyBadges() });
            queryClient.invalidateQueries({ queryKey: queryKeys.gamification.passport() });
            onSuccessLogged?.();
            closeModal();
        } catch (err) {
            console.error('Failed to log dose:', err);
            setSubmitError('Could not log this pour. Please verify your connection and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const subheader = (
        <div className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
                <DrinkThumbnail
                    imageUrl={drink.imageUrl}
                    alt={drink.name}
                    sizeClass="w-10 h-10 rounded-xl"
                    iconClass="w-5 h-5"
                />
                <div className="min-w-0 text-xs tabular-nums">
                    <span className="text-zinc-400 block">Pour size</span>
                    <strong className="text-zinc-100 font-extrabold text-sm">
                        {formatVolume(metrics.totalVolumeCl, preferredUnit) || '0 cl'}
                        {metrics.abvPercent > 0 ? ` · ${metrics.abvPercent.toFixed(0)}% ABV` : ''}
                    </strong>
                </div>
            </div>

            <div className="text-right shrink-0 text-xs tabular-nums">
                <span className="text-zinc-400 block">Est. impact</span>
                <strong className="text-red-400 text-sm font-extrabold">
                    +{deltaBacEstimate.toFixed(2)} g/L
                </strong>
            </div>
        </div>
    );

    const footer = (
        <div className="space-y-2">
            <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || metrics.totalVolumeCl <= 0}
                className="w-full min-h-[50px] py-3 px-4 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-45 text-white font-extrabold text-sm flex items-center justify-center gap-2 border border-red-400/50 tabular-nums dose-press"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Logging Drink…</span>
                    </>
                ) : (
                    <>
                        <Check className="w-4 h-4 stroke-[2.75]" aria-hidden="true" />
                        <span>Log Drink (+{deltaBacEstimate.toFixed(2)} g/L)</span>
                    </>
                )}
            </button>
            <p className="text-[11px] text-zinc-500 text-center">
                Editable for 12h in My BAC · Never drive above 0.50 g/L.
            </p>
        </div>
    );

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={closeModal}
            title={drink.name}
            badge={
                <span className="text-xs font-bold text-red-400">
                    Ready to Log
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

                <PourSizeSelector
                    selectedMultiplier={selectedMultiplier}
                    onSelect={applyMultiplier}
                />

                <PourTimingSelector
                    isNow={isNow}
                    customConsumedAt={customConsumedAt}
                    onToggleNow={setIsNow}
                    onChangeTime={setCustomConsumedAt}
                />

                {/* Progressive Disclosure for Recipe Tweaks, Stomach & Notes */}
                <div className="rounded-2xl bg-[#0c0c0f] border border-white/[0.08] overflow-hidden">
                    <button
                        type="button"
                        aria-expanded={isOptionsOpen}
                        onClick={() => setIsOptionsOpen((v) => !v)}
                        className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#141418] transition-colors"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <SlidersHorizontal className="w-4 h-4 text-zinc-400 shrink-0" aria-hidden="true" />
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-zinc-100 block">
                                    Customize recipe &amp; stomach
                                </span>
                                <span className="text-[11px] text-zinc-400 tabular-nums block truncate">
                                    {activeIngredientsCount} ingredients · {getStomachLabel(stomachState)} · {metrics.estimatedKcal} kcal
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
                        <div className="p-4 pt-3 border-t border-white/[0.08] space-y-5">
                            <StomachSelector value={stomachState} onChange={setStomachState} />

                            <BottleStrengthMeter
                                score1To10={metrics.bottleScore1To10}
                                bottleRating={metrics.bottleVisualRating}
                                abvPercent={metrics.abvPercent}
                                compact
                            />

                            {/* Recipe Ingredients Fine-Tuning */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-zinc-200">
                                        Ingredients &amp; Brands
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddIngredient((v) => !v)}
                                        className="min-h-[36px] px-2.5 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-white/[0.04] flex items-center gap-1 dose-press"
                                    >
                                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                        <span>{showAddIngredient ? 'Close Search' : 'Add Ingredient'}</span>
                                    </button>
                                </div>

                                {showAddIngredient && (
                                    <div className="mb-3 p-3 rounded-xl bg-[#111114] border border-red-600/40 space-y-2">
                                        <div className="relative">
                                            <Search
                                                className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                                aria-hidden="true"
                                            />
                                            <input
                                                type="search"
                                                aria-label="Search ingredient to add"
                                                value={ingredientSearch}
                                                onChange={(e) => setIngredientSearch(e.target.value)}
                                                placeholder="Search spirit, liqueur, or mixer…"
                                                className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-xl text-xs dose-input"
                                            />
                                        </div>
                                        <div className="max-h-40 overflow-y-auto overscroll-contain space-y-1 pr-1">
                                            {filteredAddableIngredients.map((ing) => (
                                                <button
                                                    key={ing.id}
                                                    type="button"
                                                    onClick={() => {
                                                        addCustomComponent(ing);
                                                        setShowAddIngredient(false);
                                                        setIngredientSearch('');
                                                    }}
                                                    className="w-full min-h-[40px] px-2.5 py-2 rounded-xl hover:bg-white/[0.06] flex items-center justify-between text-left text-xs transition-colors"
                                                >
                                                    <div className="min-w-0 pr-2">
                                                        <span className="font-bold text-zinc-100">{ing.name}</span>
                                                        <span className="text-[11px] text-zinc-400 ml-1.5">
                                                            {ing.subCategory}
                                                            {ing.flavor ? ` · ${ing.flavor}` : ''}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] tabular-nums text-red-400 font-bold shrink-0">
                                                        {ing.abv > 0 ? `${ing.abv}%` : 'Mixer'}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2.5">
                                    {components.map((comp) => {
                                        const alternatives = getMatchingAlternatives(comp.subCategory, comp.flavor);
                                        return (
                                            <div
                                                key={comp.rowId}
                                                className="p-3 rounded-xl bg-[#111114] border border-white/[0.08] space-y-2"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                                                                {comp.name}
                                                            </span>
                                                            {comp.isCustomAdded && (
                                                                <span className="px-1.5 py-0.5 rounded bg-red-600/20 text-red-300 text-[10px] font-bold">
                                                                    Added
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                                                            <span>{comp.subCategory}</span>
                                                            {comp.flavor && (
                                                                <span className="text-red-300">({comp.flavor})</span>
                                                            )}
                                                            {comp.abv > 0 && <span className="tabular-nums">{comp.abv}% ABV</span>}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateComponentDose(comp.rowId, -0.5)}
                                                            disabled={comp.amountCl <= 0}
                                                            className="w-9 h-9 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] flex items-center justify-center text-zinc-200 disabled:opacity-40 dose-press"
                                                            aria-label={`Decrease ${comp.name}`}
                                                        >
                                                            <Minus className="w-4 h-4" aria-hidden="true" />
                                                        </button>
                                                        <span className="w-14 text-center tabular-nums font-extrabold text-xs sm:text-sm text-red-400">
                                                            {formatVolume(comp.amountCl, preferredUnit) || '0 cl'}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateComponentDose(comp.rowId, 0.5)}
                                                            className="w-9 h-9 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] flex items-center justify-center text-zinc-200 dose-press"
                                                            aria-label={`Increase ${comp.name}`}
                                                        >
                                                            <Plus className="w-4 h-4" aria-hidden="true" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeComponent(comp.rowId)}
                                                            className="w-9 h-9 rounded-xl bg-[#0c0c0f] hover:bg-red-950/60 border border-white/[0.08] text-zinc-400 hover:text-red-400 flex items-center justify-center ml-0.5 dose-press"
                                                            aria-label={`Remove ${comp.name}`}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {alternatives.length > 1 && (
                                                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs">
                                                        <label
                                                            htmlFor={`brand-select-${comp.rowId}`}
                                                            className="text-[11px] text-zinc-400 flex items-center gap-1 shrink-0"
                                                        >
                                                            <RefreshCw className="w-3 h-3 text-red-400" aria-hidden="true" />
                                                            <span>Brand</span>
                                                        </label>
                                                        <select
                                                            id={`brand-select-${comp.rowId}`}
                                                            value={comp.ingredientId}
                                                            onChange={(e) => {
                                                                const found = alternatives.find(
                                                                    (a) => a.id === e.target.value
                                                                );
                                                                if (found) replaceComponentIngredient(comp.rowId, found);
                                                            }}
                                                            className="min-h-[36px] max-w-[200px] bg-[#0c0c0f] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus-visible:border-red-500"
                                                        >
                                                            {alternatives.map((alt) => (
                                                                <option key={alt.id} value={alt.id}>
                                                                    {alt.name} ({alt.abv}% ABV)
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="dose-notes" className="text-xs font-bold text-zinc-200 block mb-1.5">
                                    Notes (optional)
                                </label>
                                <input
                                    id="dose-notes"
                                    type="text"
                                    placeholder="e.g., Bar name, party…"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full min-h-[42px] px-3.5 py-2 text-xs rounded-xl dose-input"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ModalShell>
    );
};
