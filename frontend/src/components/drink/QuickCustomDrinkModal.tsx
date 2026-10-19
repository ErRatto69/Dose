import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { bacApi } from '@/api/bac.api';
import { useAuthStore } from '@/store/useAuthStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { formatVolume } from '@/utils/units';
import { calculateStrengthMetrics, estimateDeltaBac } from '@/utils/strengthCalc';
import { BottleStrengthMeter } from './BottleStrengthMeter';
import type { Ingredient } from '@/types';
import {
    X,
    Search,
    Plus,
    Minus,
    Trash2,
    Zap,
    Clock,
    Check,
    Loader2,
    AlertTriangle,
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

const getLocalDateTimeInputValue = (date: Date = new Date()): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const QUICK_POUR_PRESETS = [
    { label: '2 cl (Mini Shot)', cl: 2 },
    { label: '4 cl (Std Shot)', cl: 4 },
    { label: '15 cl (Wine Glass)', cl: 15 },
    { label: '33 cl (Small Beer)', cl: 33 },
    { label: '50 cl (Pint)', cl: 50 },
];

export const QuickCustomDrinkModal: React.FC<QuickCustomDrinkModalProps> = ({
                                                                                isOpen,
                                                                                onClose,
                                                                            }) => {
    const { user } = useAuthStore();
    const { preferredUnit } = usePreferencesStore();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [customName, setCustomName] = useState('');
    const [items, setItems] = useState<SelectedCustomComponent[]>([]);
    const [isNow, setIsNow] = useState(true);
    const [customConsumedAt, setCustomConsumedAt] = useState(getLocalDateTimeInputValue());
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: allIngredients = [] } = useQuery({
        queryKey: ['all-ingredients'],
        queryFn: () => drinksApi.getAllIngredients(),
        enabled: isOpen,
    });

    const filteredIngredients = useMemo(() => {
        const nonGarnishes = allIngredients.filter((i) => i.category !== 'Garnish');
        if (!searchQuery.trim()) return nonGarnishes.slice(0, 12);
        return nonGarnishes
            .filter((i) =>
                matchesSearchQuery(searchQuery, i.name, i.subCategory, i.flavor, i.category)
            )
            .slice(0, 12);
    }, [allIngredients, searchQuery]);

    const addOrIncrementIngredient = (ing: Ingredient) => {
        const defaultCl =
            ing.category === 'Beer'
                ? 33
                : ing.category === 'Wine'
                    ? 15
                    : ing.category === 'Mixer'
                        ? 10
                        : 4; // 4cl standard shot for Spirits/Liqueurs

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

    const metrics = useMemo(() => {
        return calculateStrengthMetrics(
            items.map((x) => ({
                category: x.ingredient.category,
                amountCl: x.amountCl,
                abvPercent: x.ingredient.abv,
            }))
        );
    }, [items]);

    const deltaBacEstimate = useMemo(() => {
        if (!user) return 0;
        return estimateDeltaBac(
            metrics.pureAlcoholGrams,
            user.weightKg,
            user.heightCm,
            user.sex,
            user.birthYear
        );
    }, [metrics.pureAlcoholGrams, user]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (items.length === 0) return;

        try {
            setIsSubmitting(true);
            const consumedAt = isNow
                ? new Date().toISOString()
                : new Date(customConsumedAt).toISOString();

            await bacApi.logCustomDrink({
                customName: customName.trim() || undefined,
                consumedAt,
                notes: notes.trim() || undefined,
                components: items.map((x) => ({
                    ingredientId: x.ingredient.id,
                    amountCl: x.amountCl,
                })),
            });

            queryClient.invalidateQueries({ queryKey: ['my-bac-status'] });
            queryClient.invalidateQueries({ queryKey: ['monthly-leaderboard'] });
            setItems([]);
            setCustomName('');
            setNotes('');
            onClose();
        } catch (err) {
            console.error('Failed to log custom pour:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-neutral-950/80 backdrop-blur-md">
            <div
                className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 fill-red-500" />
                            Instant Custom Pour
                        </span>
                        <h2 className="text-xl font-black text-white">Quick Shot, Beer or Mix</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Live Telemetry Bar */}
                <div className="px-5 py-3 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between text-xs">
                    <div>
                        <span className="text-neutral-400 block">Total Volume</span>
                        <strong className="text-neutral-200 text-sm font-mono">
                            {formatVolume(metrics.totalVolumeCl, preferredUnit) || '0 cl'}
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

                {/* Body */}
                <div className="p-5 overflow-y-auto space-y-5 flex-1">
                    {/* Search & Select Bottles */}
                    <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                            1. Select what you are drinking
                        </label>
                        <div className="relative">
                            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search spirit, beer, wine, or mixer..."
                                className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                            />
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2.5 max-h-32 overflow-y-auto p-0.5">
                            {filteredIngredients.map((ing) => (
                                <button
                                    key={ing.id}
                                    type="button"
                                    onClick={() => addOrIncrementIngredient(ing)}
                                    className="px-2.5 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-red-600/50 text-xs text-neutral-200 flex items-center gap-1.5 transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5 text-red-500" />
                                    <span className="font-semibold">{ing.name}</span>
                                    {ing.abv > 0 && (
                                        <span className="text-[10px] font-mono text-red-400 font-bold">
                                            {ing.abv}%
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Adjust Doses & Quick Presets */}
                    <div className="space-y-2.5">
                        <label className="text-xs font-semibold text-neutral-300 block">
                            2. Adjust Dose ({items.length} selected)
                        </label>
                        {items.length === 0 ? (
                            <div className="p-6 rounded-2xl bg-neutral-950 border border-dashed border-neutral-800 text-center text-xs text-neutral-500">
                                Tap one or more bottles above to add them to your glass.
                            </div>
                        ) : (
                            items.map(({ ingredient, amountCl }) => (
                                <div
                                    key={ingredient.id}
                                    className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <div className="text-sm font-bold text-white">
                                                {ingredient.name}
                                            </div>
                                            <div className="text-[11px] text-neutral-400">
                                                {ingredient.subCategory}
                                                {ingredient.abv > 0 && ` • ${ingredient.abv}% ABV`}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => updateDose(ingredient.id, -0.5)}
                                                className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-200"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-16 text-center font-mono font-bold text-sm text-red-400">
                                                {formatVolume(amountCl, preferredUnit)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateDose(ingredient.id, 0.5)}
                                                className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-200"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(ingredient.id)}
                                                className="w-8 h-8 rounded-xl bg-neutral-900 hover:bg-red-950/70 border border-neutral-800 text-neutral-400 hover:text-red-400 flex items-center justify-center ml-1 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Presets */}
                                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-neutral-800/80">
                                        {QUICK_POUR_PRESETS.map((preset) => (
                                            <button
                                                key={preset.cl}
                                                type="button"
                                                onClick={() => setExactDose(ingredient.id, preset.cl)}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                                    amountCl === preset.cl
                                                        ? 'bg-red-600 text-white border-red-600'
                                                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {items.length > 0 && (
                        <BottleStrengthMeter
                            score1To10={metrics.bottleScore1To10}
                            bottleRating={metrics.bottleVisualRating}
                            abvPercent={metrics.abvPercent}
                            compact
                        />
                    )}

                    {/* Custom Label & Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                Optional Label
                            </label>
                            <input
                                type="text"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                placeholder="e.g., Shot, Double Vodka..."
                                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1 mb-1">
                                <Clock className="w-3.5 h-3.5 text-red-500" />
                                Time
                            </label>
                            <div className="flex gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setIsNow(true)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                                        isNow
                                            ? 'bg-red-600/20 border-red-600 text-red-300'
                                            : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                                    }`}
                                >
                                    Now
                                </button>
                                <input
                                    type="datetime-local"
                                    value={customConsumedAt}
                                    onChange={(e) => {
                                        setCustomConsumedAt(e.target.value);
                                        setIsNow(false);
                                    }}
                                    className="flex-1 px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-red-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Safety Disclaimer Callout */}
                    <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-xs text-red-200 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                            <strong>Responsible Drinking:</strong> Do not drive if your BAC exceeds 0.50 g/L. Any drink logged here can be edited or deleted within 12 hours from your <strong>My BAC</strong> telemetry page.
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 bg-neutral-900 border-t border-neutral-800">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || items.length === 0 || metrics.totalVolumeCl <= 0}
                        className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-[0.99] transition-all"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Logging...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>Drink &amp; Log Custom Pour</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};