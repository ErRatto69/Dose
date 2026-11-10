import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDoseModalStore } from '@/store/useDoseModalStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatVolume } from '@/utils/units';
import { calculateStrengthMetrics, estimateDeltaBac } from '@/utils/strengthCalc';
import { BottleStrengthMeter } from './BottleStrengthMeter';
import { RecentTimePicker } from '@/components/common/RecentTimePicker';
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
    AlertTriangle,
    AlertCircle,
    Flame,
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [showAddIngredient, setShowAddIngredient] = useState(false);
    const [ingredientSearch, setIngredientSearch] = useState('');

    const { data: allIngredients = [] } = useQuery({
        queryKey: ['all-ingredients'],
        queryFn: () => drinksApi.getAllIngredients(),
        enabled: isOpen,
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
                : (customConsumedAt.includes('T') ? new Date(customConsumedAt).toISOString() : new Date().toISOString());

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
        <div className="px-5 py-3 grid grid-cols-4 gap-2 text-xs">
            <div>
                <span className="text-zinc-400 block">Volume</span>
                <strong className="text-zinc-100 text-sm font-extrabold tabular-nums">
                    {formatVolume(metrics.totalVolumeCl, preferredUnit)}
                </strong>
            </div>
            <div className="text-center">
                <span className="text-zinc-400 block">Ethanol</span>
                <strong className="text-white text-sm font-extrabold tabular-nums">
                    {metrics.pureAlcoholGrams.toFixed(1)} g
                </strong>
            </div>
            <div className="text-center">
                <span className="text-zinc-400 flex items-center justify-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" aria-hidden="true" />
                    <span>Calories</span>
                </span>
                <strong className="text-amber-300 text-sm font-extrabold tabular-nums">
                    {metrics.estimatedKcal} kcal
                </strong>
            </div>
            <div className="text-right">
                <span className="text-zinc-400 block">Est. +BAC</span>
                <strong className="text-red-400 text-sm font-extrabold tabular-nums">
                    +{deltaBacEstimate.toFixed(2)} g/L
                </strong>
            </div>
        </div>
    );

    const footer = (
        <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || metrics.totalVolumeCl <= 0}
            className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 border border-red-500/50 dose-press"
        >
            {isSubmitting ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Logging Dose…</span>
                </>
            ) : (
                <>
                    <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                    <span>Drink &amp; Log Dose</span>
                </>
            )}
        </button>
    );

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={closeModal}
            title={drink.name}
            badge={
                <span className="text-xs font-bold text-red-400">
                    Customize &amp; Log Dose
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

                <BottleStrengthMeter
                    score1To10={metrics.bottleScore1To10}
                    bottleRating={metrics.bottleVisualRating}
                    abvPercent={metrics.abvPercent}
                    compact
                />

                {/* Stomach State Metabolic Selector */}
                <div>
                    <span className="text-xs font-bold text-zinc-200 block mb-2">
                        Stomach Fullness (Absorption Rate)
                    </span>
                    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Stomach fullness">
                        {(
                            [
                                { value: 'Empty', label: 'Empty', desc: '+10% peak' },
                                { value: 'LightSnack', label: 'Light Snack', desc: 'Standard' },
                                { value: 'FullMeal', label: 'Full Meal', desc: '-22% peak' },
                            ] as const
                        ).map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                aria-pressed={stomachState === item.value}
                                onClick={() => setStomachState(item.value)}
                                className={`min-h-[48px] py-2 px-2.5 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-0.5 dose-press ${
                                    stomachState === item.value
                                        ? 'bg-red-600 text-white border-red-500/70'
                                        : 'bg-[#0c0c0f] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                <span>{item.label}</span>
                                <span className="text-[11px] font-medium opacity-80">{item.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick Multipliers */}
                <div>
                    <span className="text-xs font-bold text-zinc-200 block mb-2">
                        Scale Alcoholic Pours
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { label: '0.5×', text: 'Light', mult: 0.5 },
                            { label: '1.0×', text: 'Standard', mult: 1.0 },
                            { label: '1.5×', text: 'Generous', mult: 1.5 },
                            { label: '2.0×', text: 'Double', mult: 2.0 },
                        ].map((item) => (
                            <button
                                key={item.mult}
                                type="button"
                                onClick={() => applyMultiplier(item.mult)}
                                className="min-h-[48px] py-2 px-2 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-xs font-medium text-zinc-200 flex flex-col items-center justify-center dose-press"
                            >
                                <span className="font-extrabold text-red-400 tabular-nums">{item.label}</span>
                                <span className="text-[11px] text-zinc-400">{item.text}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ingredients Steppers */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-200">
                            Recipe Components
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
                        <div className="mb-3 p-3.5 rounded-2xl bg-[#0c0c0f] border border-red-600/40 space-y-2.5">
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
                                    placeholder="Search spirit, liqueur, mixer, or flavor…"
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
                                    className="p-3.5 rounded-2xl bg-[#0c0c0f] border border-white/[0.08] space-y-2.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold text-zinc-100 truncate">
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
                                                className="w-9 h-9 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] flex items-center justify-center text-zinc-200 disabled:opacity-40 dose-press"
                                                aria-label={`Decrease ${comp.name}`}
                                            >
                                                <Minus className="w-4 h-4" aria-hidden="true" />
                                            </button>
                                            <span className="w-16 text-center tabular-nums font-extrabold text-sm text-red-400">
                                                {formatVolume(comp.amountCl, preferredUnit) || '0 cl'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateComponentDose(comp.rowId, 0.5)}
                                                className="w-9 h-9 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] flex items-center justify-center text-zinc-200 dose-press"
                                                aria-label={`Increase ${comp.name}`}
                                            >
                                                <Plus className="w-4 h-4" aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeComponent(comp.rowId)}
                                                className="w-9 h-9 rounded-xl bg-[#111114] hover:bg-red-950/60 border border-white/[0.08] text-zinc-400 hover:text-red-400 flex items-center justify-center ml-0.5 dose-press"
                                                aria-label={`Remove ${comp.name}`}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>

                                    {alternatives.length > 1 && (
                                        <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs">
                                            <label
                                                htmlFor={`brand-select-${comp.rowId}`}
                                                className="text-[11px] text-zinc-400 flex items-center gap-1 shrink-0"
                                            >
                                                <RefreshCw className="w-3 h-3 text-red-400" aria-hidden="true" />
                                                <span>Bottle brand</span>
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
                                                className="min-h-[36px] max-w-[220px] bg-[#111114] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus-visible:border-red-500"
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

                {/* Time Picker */}
                <RecentTimePicker
                    value={customConsumedAt}
                    onChange={(isoStr) => setCustomConsumedAt(isoStr)}
                    isNow={isNow}
                    onToggleNow={(now) => setIsNow(now)}
                    label="When was this consumed?"
                />

                {/* Notes */}
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

                {/* Safety Notice */}
                <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-700/50 text-xs text-red-100 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="leading-relaxed">
                        <strong>Responsible Drinking:</strong> Never drive above 0.50 g/L. Logged drinks can be edited or removed for 12 hours from <strong>My BAC</strong>.
                    </div>
                </div>
            </div>
        </ModalShell>
    );
};
