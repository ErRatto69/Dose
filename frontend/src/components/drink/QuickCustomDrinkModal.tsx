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
import { RecentTimePicker } from '@/components/common/RecentTimePicker';
import { ModalShell } from '@/components/common/ModalShell';
import type { Ingredient, StomachState } from '@/types';
import {
    Search,
    Plus,
    Minus,
    Trash2,
    Zap,
    Check,
    Loader2,
    AlertTriangle,
    AlertCircle,
    Flame,
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

const QUICK_POUR_PRESETS = [
    { name: 'Mini Shot', cl: 2 },
    { name: 'Std Shot', cl: 4 },
    { name: 'Wine', cl: 15 },
    { name: 'Small Beer', cl: 33 },
    { name: 'Pint', cl: 50 },
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
    const [stomachState, setStomachState] = useState<StomachState>('LightSnack');
    const [isNow, setIsNow] = useState(true);
    const [customConsumedAt, setCustomConsumedAt] = useState(() => new Date().toISOString());
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

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
                        : 4;

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
                ingredientName: x.ingredient.name,
            }))
        );
    }, [items]);

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

    const handleSubmit = async () => {
        if (items.length === 0) return;
        try {
            setSubmitError(null);
            setIsSubmitting(true);
            const consumedAt = isNow
                ? new Date().toISOString()
                : (customConsumedAt.includes('T') ? new Date(customConsumedAt).toISOString() : new Date().toISOString());

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

            queryClient.invalidateQueries({ queryKey: queryKeys.bac.me() });
            queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.monthly() });
            queryClient.invalidateQueries({ queryKey: queryKeys.gamification.monthlyBadges() });
            queryClient.invalidateQueries({ queryKey: queryKeys.gamification.passport() });
            setItems([]);
            setCustomName('');
            setNotes('');
            setIsNow(true);
            onClose();
        } catch (err) {
            console.error('Failed to log custom pour:', err);
            setSubmitError('Could not log custom pour. Check your network and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const subheader = (
        <div className="px-5 py-3 grid grid-cols-4 gap-2 text-xs">
            <div>
                <span className="text-zinc-400 block">Volume</span>
                <strong className="text-zinc-100 text-sm font-extrabold tabular-nums">
                    {formatVolume(metrics.totalVolumeCl, preferredUnit) || '0 cl'}
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
            disabled={isSubmitting || items.length === 0 || metrics.totalVolumeCl <= 0}
            className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-extrabold text-sm flex items-center justify-center gap-2 border border-red-500/50 dose-press"
        >
            {isSubmitting ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Logging Pour…</span>
                </>
            ) : (
                <>
                    <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                    <span>Drink &amp; Log Custom Pour</span>
                </>
            )}
        </button>
    );

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Quick Shot, Beer or Mix"
            badge={
                <span className="text-xs font-bold text-red-400 inline-flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-red-400" aria-hidden="true" />
                    <span>Instant Custom Pour</span>
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

                {/* Stomach State */}
                <div>
                    <span className="text-xs font-bold text-zinc-200 block mb-2">
                        Stomach Fullness (Absorption Rate)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
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

                {/* Search & Select Bottles */}
                <div>
                    <label htmlFor="quick-pour-search" className="text-xs font-bold text-zinc-200 block mb-1.5">
                        Pick Bottles or Mixers
                    </label>
                    <div className="relative">
                        <Search
                            className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                            aria-hidden="true"
                        />
                        <input
                            id="quick-pour-search"
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search spirit, beer, wine, or mixer…"
                            className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm dose-input"
                        />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2.5 max-h-36 overflow-y-auto overscroll-contain p-0.5">
                        {filteredIngredients.map((ing) => (
                            <button
                                key={ing.id}
                                type="button"
                                onClick={() => addOrIncrementIngredient(ing)}
                                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] hover:border-red-500/45 text-xs text-zinc-100 flex items-center gap-1.5 dose-press"
                            >
                                <Plus className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                                <span className="font-bold">{ing.name}</span>
                                {ing.abv > 0 && (
                                    <span className="text-[11px] tabular-nums text-red-400 font-bold">
                                        {ing.abv}%
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Selected Pours */}
                <div className="space-y-2.5">
                    <span className="text-xs font-bold text-zinc-200 block">
                        Pour Amounts ({items.length} selected)
                    </span>
                    {items.length === 0 ? (
                        <div className="p-6 rounded-2xl bg-[#0c0c0f] border border-dashed border-white/15 text-center text-xs text-zinc-400">
                            Tap one or more bottles above to build your pour.
                        </div>
                    ) : (
                        items.map(({ ingredient, amountCl }) => (
                            <div
                                key={ingredient.id}
                                className="p-3.5 rounded-2xl bg-[#0c0c0f] border border-white/[0.08] space-y-2.5"
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
                                            className="w-9 h-9 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] flex items-center justify-center text-zinc-200 dose-press"
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
                                            className="w-9 h-9 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] flex items-center justify-center text-zinc-200 dose-press"
                                        >
                                            <Plus className="w-4 h-4" aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(ingredient.id)}
                                            aria-label={`Remove ${ingredient.name}`}
                                            className="w-9 h-9 rounded-xl bg-[#111114] hover:bg-red-950/60 border border-white/[0.08] text-zinc-400 hover:text-red-400 flex items-center justify-center ml-0.5 dose-press"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.06]">
                                    {QUICK_POUR_PRESETS.map((preset) => (
                                        <button
                                            key={preset.cl}
                                            type="button"
                                            onClick={() => setExactDose(ingredient.id, preset.cl)}
                                            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold border tabular-nums dose-press ${
                                                amountCl === preset.cl
                                                    ? 'bg-red-600 text-white border-red-500/70'
                                                    : 'bg-[#111114] border-white/[0.08] text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            {formatVolume(preset.cl, preferredUnit)} ({preset.name})
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

                <div>
                    <label htmlFor="quick-pour-label" className="text-xs font-bold text-zinc-200 block mb-1.5">
                        Optional Label
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

                <RecentTimePicker
                    value={customConsumedAt}
                    onChange={(isoStr) => setCustomConsumedAt(isoStr)}
                    isNow={isNow}
                    onToggleNow={(now) => setIsNow(now)}
                    label="Time Consumed"
                />

                <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-700/50 text-xs text-red-100 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="leading-relaxed">
                        <strong>Responsible Drinking:</strong> Do not drive if your BAC exceeds 0.50 g/L. Logged entries stay editable for 12 hours on <strong>My BAC</strong>.
                    </div>
                </div>
            </div>
        </ModalShell>
    );
};
