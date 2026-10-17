import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { matchesSearchQuery } from '@/utils/textSearch';
import { calculateStrengthMetrics } from '@/utils/strengthCalc';
import { BottleStrengthMeter } from './BottleStrengthMeter';
import type { Ingredient, IngredientCategory } from '@/types';
import {
    X,
    Plus,
    Minus,
    Trash2,
    Check,
    Loader2,
    AlertCircle,
    Search,
} from 'lucide-react';

interface CreateDrinkModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface RecipeBuilderItem {
    ingredient: Ingredient;
    amountCl: number;
    displayUnitNote: string;
    isOptional: boolean;
}

const CATEGORY_FILTERS: Array<{ label: string; value: 'ALL' | IngredientCategory }> = [
    { label: 'All', value: 'ALL' },
    { label: 'Spirits', value: 'Spirit' },
    { label: 'Liqueurs', value: 'Liqueur' },
    { label: 'Wine', value: 'Wine' },
    { label: 'Beer', value: 'Beer' },
    { label: 'Mixers', value: 'Mixer' },
    { label: 'Syrups', value: 'Syrup' },
    { label: 'Garnishes', value: 'Garnish' },
];

const DOSE_CHIPS = [1.5, 3, 4.5, 6, 12];

export const CreateDrinkModal: React.FC<CreateDrinkModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();

    const { data: ingredients = [] } = useQuery({
        queryKey: ['all-ingredients'],
        queryFn: drinksApi.getAllIngredients,
        enabled: isOpen,
    });

    const [name, setName] = useState('');
    const [glassType, setGlassType] = useState('Highball');
    const [description, setDescription] = useState('');
    const [ingredientQuery, setIngredientQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<'ALL' | IngredientCategory>('ALL');
    const [selectedItems, setSelectedItems] = useState<RecipeBuilderItem[]>([]);
    const [steps, setSteps] = useState<string[]>([
        'Fill the glass with ice.',
        'Pour the ingredients and stir gently.',
    ]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const filteredPickerIngredients = useMemo(() => {
        return ingredients
            .filter((ing) => {
                if (activeCategory !== 'ALL' && ing.category !== activeCategory) return false;
                return matchesSearchQuery(
                    ingredientQuery,
                    ing.name,
                    ing.subCategory,
                    ing.flavor,
                    ing.category
                );
            })
            .slice(0, 14);
    }, [ingredients, ingredientQuery, activeCategory]);

    const addIngredientToRecipe = (ing: Ingredient) => {
        const defaultCl =
            ing.category === 'Garnish'
                ? 0
                : ing.category === 'Mixer'
                    ? 10
                    : ing.category === 'Syrup'
                        ? 1.5
                        : 4.5;

        setSelectedItems((prev) => {
            const exists = prev.find((x) => x.ingredient.id === ing.id);
            if (exists) {
                return prev.map((x) =>
                    x.ingredient.id === ing.id
                        ? { ...x, amountCl: Math.round((x.amountCl + 1.5) * 10) / 10 }
                        : x
                );
            }
            return [
                ...prev,
                {
                    ingredient: ing,
                    amountCl: defaultCl,
                    displayUnitNote: ing.category === 'Garnish' ? '1 piece' : '',
                    isOptional: ing.category === 'Garnish',
                },
            ];
        });
        setIngredientQuery('');
    };

    const updateAmount = (id: string, delta: number) => {
        setSelectedItems((prev) =>
            prev.map((x) =>
                x.ingredient.id === id
                    ? { ...x, amountCl: Math.max(0, Math.round((x.amountCl + delta) * 10) / 10) }
                    : x
            )
        );
    };

    const setExactAmount = (id: string, amountCl: number) => {
        setSelectedItems((prev) =>
            prev.map((x) => (x.ingredient.id === id ? { ...x, amountCl } : x))
        );
    };

    const updateItemField = (
        id: string,
        patch: Partial<Pick<RecipeBuilderItem, 'displayUnitNote' | 'isOptional'>>
    ) => {
        setSelectedItems((prev) =>
            prev.map((x) => (x.ingredient.id === id ? { ...x, ...patch } : x))
        );
    };

    const removeItem = (id: string) => {
        setSelectedItems((prev) => prev.filter((x) => x.ingredient.id !== id));
    };

    const previewMetrics = useMemo(() => {
        return calculateStrengthMetrics(
            selectedItems.map((x) => ({
                category: x.ingredient.category,
                amountCl: x.amountCl,
                abvPercent: x.ingredient.abv,
            }))
        );
    }, [selectedItems]);

    const createMutation = useMutation({
        mutationFn: async () => {
            setErrorMsg(null);
            if (selectedItems.length === 0) {
                throw new Error('Please select at least one ingredient for the recipe.');
            }
            return drinksApi.createDrink({
                name: name.trim(),
                description: description.trim(),
                glassType: glassType.trim() || undefined,
                preparationSteps: steps.map((s) => s.trim()).filter(Boolean),
                ingredients: selectedItems.map((r, idx) => ({
                    ingredientId: r.ingredient.id,
                    amountCl: r.amountCl,
                    displayUnitNote: r.displayUnitNote.trim() || undefined,
                    isOptional: r.isOptional,
                    sortOrder: idx + 1,
                })),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog'] });
            setName('');
            setDescription('');
            setSelectedItems([]);
            onClose();
        },
        onError: (err: unknown) => {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { detail?: string } } };
                setErrorMsg(axiosErr.response?.data?.detail || 'Failed to create drink recipe.');
            } else if (err instanceof Error) {
                setErrorMsg(err.message);
            } else {
                setErrorMsg('Failed to create drink recipe.');
            }
        },
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            Mixology Builder
                        </span>
                        <h2 className="text-lg font-black text-white">Create New Catalog Drink</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full bg-slate-800/70 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Live Recipe Metrics Bar */}
                <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs">
                    <div>
                        <span className="text-slate-400">Recipe Volume: </span>
                        <strong className="text-white">{previewMetrics.totalVolumeCl} cl</strong>
                    </div>
                    <div>
                        <span className="text-slate-400">Estimated ABV: </span>
                        <strong className="text-amber-400">{previewMetrics.abvPercent}%</strong>
                    </div>
                    <div>
                        <span className="text-slate-400">Pure Alcohol: </span>
                        <strong className="text-emerald-400">
                            {previewMetrics.pureAlcoholGrams.toFixed(1)}g
                        </strong>
                    </div>
                </div>

                {/* Scrollable Form */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        createMutation.mutate();
                    }}
                    className="p-5 overflow-y-auto space-y-5 flex-1"
                >
                    {errorMsg && (
                        <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <label className="text-xs font-semibold text-slate-300 block mb-1">
                                Cocktail Name
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Aperol Spritz, Jägerbomb, Daiquiri..."
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">
                                Glass Type
                            </label>
                            <input
                                type="text"
                                value={glassType}
                                onChange={(e) => setGlassType(e.target.value)}
                                placeholder="Highball, Coupe, Shot..."
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Description
                        </label>
                        <textarea
                            rows={2}
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the taste and style of this cocktail..."
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                    </div>

                    {/* Search & Tap Ingredient Picker */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                        <label className="text-xs font-bold text-amber-400 block">
                            1. Search &amp; Tap to Add Ingredients (Accent-insensitive: e.g., &quot;jager&quot;, &quot;vodka&quot;)
                        </label>

                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={ingredientQuery}
                                onChange={(e) => setIngredientQuery(e.target.value)}
                                placeholder="Type ingredient name, spirit type, or flavor..."
                                className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                            />
                            {ingredientQuery && (
                                <button
                                    type="button"
                                    onClick={() => setIngredientQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Category Quick Filters */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            {CATEGORY_FILTERS.map((cat) => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => setActiveCategory(cat.value)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
                                        activeCategory === cat.value
                                            ? 'bg-amber-500 text-slate-950'
                                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Matching Ingredient Chips */}
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-0.5">
                            {filteredPickerIngredients.map((ing) => {
                                const isAdded = selectedItems.some((x) => x.ingredient.id === ing.id);
                                return (
                                    <button
                                        key={ing.id}
                                        type="button"
                                        onClick={() => addIngredientToRecipe(ing)}
                                        className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all ${
                                            isAdded
                                                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                                                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                                        }`}
                                    >
                                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                                        <span className="font-semibold">{ing.name}</span>
                                        <span className="text-[10px] text-slate-400">
                                            ({ing.subCategory}
                                            {ing.flavor ? ` • ${ing.flavor}` : ''})
                                        </span>
                                    </button>
                                );
                            })}
                            {filteredPickerIngredients.length === 0 && (
                                <span className="text-xs text-slate-500 py-2">
                                    No ingredients found matching &quot;{ingredientQuery}&quot;.
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Selected Recipe Components */}
                    <div className="space-y-2.5">
                        <label className="text-xs font-bold text-slate-300 block">
                            2. Recipe Doses ({selectedItems.length} ingredients)
                        </label>

                        {selectedItems.length === 0 ? (
                            <div className="p-5 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                                Tap ingredients above to add them to this cocktail recipe.
                            </div>
                        ) : (
                            selectedItems.map(({ ingredient, amountCl, displayUnitNote, isOptional }) => (
                                <div
                                    key={ingredient.id}
                                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <div className="text-sm font-bold text-white">
                                                {ingredient.name}
                                            </div>
                                            <div className="text-[11px] text-slate-400">
                                                {ingredient.subCategory}
                                                {ingredient.flavor ? ` (${ingredient.flavor})` : ''}{' '}
                                                {ingredient.abv > 0 && `• ${ingredient.abv}% ABV`}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => updateAmount(ingredient.id, -0.5)}
                                                className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200"
                                            >
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="w-14 text-center font-mono font-bold text-xs text-amber-300">
                                                {amountCl} cl
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateAmount(ingredient.id, 0.5)}
                                                className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(ingredient.id)}
                                                className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center ml-1"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80">
                                        <div className="flex flex-wrap gap-1">
                                            {DOSE_CHIPS.map((cl) => (
                                                <button
                                                    key={cl}
                                                    type="button"
                                                    onClick={() => setExactAmount(ingredient.id, cl)}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                        amountCl === cl
                                                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                                                            : 'bg-slate-900 border-slate-700 text-slate-400'
                                                    }`}
                                                >
                                                    {cl} cl
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={displayUnitNote}
                                                onChange={(e) =>
                                                    updateItemField(ingredient.id, {
                                                        displayUnitNote: e.target.value,
                                                    })
                                                }
                                                placeholder="Note (e.g. Top up)"
                                                className="w-28 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-200"
                                            />
                                            <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isOptional}
                                                    onChange={(e) =>
                                                        updateItemField(ingredient.id, {
                                                            isOptional: e.target.checked,
                                                        })
                                                    }
                                                />
                                                Optional
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {selectedItems.length > 0 && (
                        <BottleStrengthMeter
                            score1To10={previewMetrics.bottleScore1To10}
                            bottleRating={previewMetrics.bottleVisualRating}
                            abvPercent={previewMetrics.abvPercent}
                            compact
                        />
                    )}

                    {/* Preparation Steps */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-300">
                                3. Preparation Steps
                            </label>
                            <button
                                type="button"
                                onClick={() => setSteps([...steps, ''])}
                                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Step
                            </button>
                        </div>

                        {steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 w-5">{idx + 1}.</span>
                                <input
                                    type="text"
                                    value={step}
                                    onChange={(e) => {
                                        const next = [...steps];
                                        next[idx] = e.target.value;
                                        setSteps(next);
                                    }}
                                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                                    className="text-slate-500 hover:text-rose-400"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || selectedItems.length === 0}
                            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                            Publish Drink
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};