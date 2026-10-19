import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDoseModalStore } from '@/store/useDoseModalStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatVolume } from '@/utils/units';
import { calculateStrengthMetrics, estimateDeltaBac } from '@/utils/strengthCalc';
import { BottleStrengthMeter } from './BottleStrengthMeter';
import { bacApi } from '@/api/bac.api';
import { drinksApi } from '@/api/drinks.api';
import {
    X,
    Minus,
    Plus,
    Clock,
    Check,
    Loader2,
    Trash2,
    Search,
    RefreshCw,
    AlertTriangle,
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

    const [isSubmitting, setIsSubmitting] = useState(false);
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
            user.birthYear ?? undefined
        );
    }, [metrics.pureAlcoholGrams, user]);

    if (!isOpen || !drink) return null;

    const getMatchingAlternatives = (subCategory: string, flavor?: string | null) => {
        return allIngredients.filter(
            (ing) =>
                (ing.subCategory || '').toLowerCase() === (subCategory || '').toLowerCase() &&
                (ing.flavor ?? '').toLowerCase() === (flavor ?? '').toLowerCase()
        );
    };

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            const consumedAt = isNow
                ? new Date().toISOString()
                : new Date(customConsumedAt).toISOString();

            await bacApi.logDrink(drink.id, {
                consumedAt,
                notes: notes.trim() || undefined,
                customComponents: components
                    .filter((c) => c.amountCl > 0)
                    .map((c) => ({
                        ingredientId: c.ingredientId,
                        amountCl: c.amountCl,
                    })),
            });

            queryClient.invalidateQueries({ queryKey: ['my-bac-status'] });
            queryClient.invalidateQueries({ queryKey: ['monthly-leaderboard'] });
            onSuccessLogged?.();
            closeModal();
        } catch (err) {
            console.error('Failed to log dose:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-neutral-950/80 backdrop-blur-md">
            <div
                className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-200"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                            Customize &amp; Log Dose
                        </span>
                        <h2 className="text-xl font-black text-white leading-tight">{drink.name}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={closeModal}
                        className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Real-time Telemetry Bar */}
                <div className="px-5 py-3 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between text-xs">
                    <div>
                        <span className="text-neutral-400 block">Total Volume</span>
                        <strong className="text-neutral-200 text-sm font-mono">
                            {formatVolume(metrics.totalVolumeCl, preferredUnit)}
                        </strong>
                    </div>
                    <div className="text-center">
                        <span className="text-neutral-400 block">Pure Alcohol</span>
                        <strong className="text-white text-sm font-mono">
                            {metrics.pureAlcoholGrams.toFixed(1)}g
                        </strong>
                    </div>
                    <div className="text-right">
                        <span className="text-neutral-400 block">Estimated +BAC</span>
                        <strong className="text-red-400 text-sm font-mono">
                            +{deltaBacEstimate.toFixed(2)} g/L
                        </strong>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="p-5 overflow-y-auto space-y-5 flex-1">
                    <BottleStrengthMeter
                        score1To10={metrics.bottleScore1To10}
                        bottleRating={metrics.bottleVisualRating}
                        abvPercent={metrics.abvPercent}
                        compact
                    />

                    {/* Quick Multiplier Presets */}
                    <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-2">
                            Quick Multipliers (Alcoholic Components)
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: '0.5x', text: 'Light', mult: 0.5 },
                                { label: '1.0x', text: 'Standard', mult: 1.0 },
                                { label: '1.5x', text: 'Generous', mult: 1.5 },
                                { label: '2.0x', text: 'Double', mult: 2.0 },
                            ].map((item) => (
                                <button
                                    key={item.mult}
                                    type="button"
                                    onClick={() => applyMultiplier(item.mult)}
                                    className="py-2 px-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 flex flex-col items-center active:scale-95 transition-all"
                                >
                                    <span className="font-bold text-red-500">{item.label}</span>
                                    <span className="text-[10px] text-neutral-400">{item.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Ingredients Steppers */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-neutral-300">
                                Recipe Components
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowAddIngredient((v) => !v)}
                                className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {showAddIngredient ? 'Close Search' : 'Add Ingredient'}
                            </button>
                        </div>

                        {/* Add Extra Ingredient Drawer */}
                        {showAddIngredient && (
                            <div className="mb-3 p-3.5 rounded-2xl bg-neutral-950 border border-red-600/40 space-y-2.5">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={ingredientSearch}
                                        onChange={(e) => setIngredientSearch(e.target.value)}
                                        placeholder="Search spirit, liqueur, mixer, or flavor..."
                                        className="w-full pl-8 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                                    />
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                                    {filteredAddableIngredients.map((ing) => (
                                        <button
                                            key={ing.id}
                                            type="button"
                                            onClick={() => {
                                                addCustomComponent(ing);
                                                setShowAddIngredient(false);
                                                setIngredientSearch('');
                                            }}
                                            className="w-full px-2.5 py-1.5 rounded-xl hover:bg-neutral-800 flex items-center justify-between text-left text-xs transition-colors"
                                        >
                                            <div>
                                                <span className="font-semibold text-neutral-200">
                                                    {ing.name}
                                                </span>
                                                <span className="text-[10px] text-neutral-400 ml-1.5">
                                                    ({ing.subCategory}
                                                    {ing.flavor ? ` • ${ing.flavor}` : ''})
                                                </span>
                                            </div>
                                            <span className="text-[11px] font-mono text-red-400 font-bold">
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
                                        className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-semibold text-neutral-200 truncate">
                                                        {comp.name}
                                                    </span>
                                                    {comp.isCustomAdded && (
                                                        <span className="px-1.5 py-0.5 rounded bg-red-600/20 text-red-300 text-[10px] font-bold">
                                                            Added
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-neutral-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                                                    <span>{comp.subCategory}</span>
                                                    {comp.flavor && (
                                                        <span className="text-red-300">({comp.flavor})</span>
                                                    )}
                                                    {comp.abv > 0 && <span>• {comp.abv}% ABV</span>}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => updateComponentDose(comp.rowId, -0.5)}
                                                    disabled={comp.amountCl <= 0}
                                                    className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 disabled:opacity-40 active:scale-95 transition-all"
                                                    aria-label={`Decrease ${comp.name}`}
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="w-16 text-center font-mono font-bold text-sm text-red-400">
                                                    {formatVolume(comp.amountCl, preferredUnit) || '0 cl'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateComponentDose(comp.rowId, 0.5)}
                                                    className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 active:scale-95 transition-all"
                                                    aria-label={`Increase ${comp.name}`}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeComponent(comp.rowId)}
                                                    className="w-8 h-8 rounded-xl bg-neutral-900 hover:bg-red-950/70 border border-neutral-800 text-neutral-400 hover:text-red-400 flex items-center justify-center transition-colors ml-1"
                                                    title="Remove ingredient"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Brand Switcher */}
                                        {alternatives.length > 1 && (
                                            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2 text-xs">
                                                <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                                                    <RefreshCw className="w-3 h-3 text-red-500" />
                                                    Switch bottle brand:
                                                </span>
                                                <select
                                                    value={comp.ingredientId}
                                                    onChange={(e) => {
                                                        const found = alternatives.find(
                                                            (a) => a.id === e.target.value
                                                        );
                                                        if (found) replaceComponentIngredient(comp.rowId, found);
                                                    }}
                                                    className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-red-600"
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

                    {/* Consumption Time */}
                    <div>
                        <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5 mb-2">
                            <Clock className="w-3.5 h-3.5 text-red-500" />
                            When was this consumed?
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                type="button"
                                onClick={() => setIsNow(true)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                                    isNow
                                        ? 'bg-red-600/20 border-red-600 text-red-300'
                                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                                }`}
                            >
                                {isNow && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                Now (Default)
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsNow(false)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                                    !isNow
                                        ? 'bg-red-600/20 border-red-600 text-red-300'
                                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                                }`}
                            >
                                Choose Custom Time
                            </button>
                            {!isNow && (
                                <input
                                    type="datetime-local"
                                    value={customConsumedAt}
                                    max={new Date().toISOString().slice(0, 16)}
                                    onChange={(e) => setCustomConsumedAt(e.target.value)}
                                    className="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-red-600"
                                />
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <input
                            type="text"
                            placeholder="Add quick notes (e.g., bar name, party)..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                        />
                    </div>

                    {/* Alcohol Safety Disclaimer */}
                    <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-xs text-red-200 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                            <strong>Responsible Drinking:</strong> Do not drive if your BAC exceeds 0.50 g/L. Any drink logged here can be edited or deleted within 12 hours from your <strong>My BAC</strong> telemetry page.
                        </div>
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="p-4 sm:p-5 bg-neutral-900 border-t border-neutral-800">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || metrics.totalVolumeCl <= 0}
                        className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-[0.99] transition-all"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Logging Dose...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>Drink &amp; Log Dose</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};