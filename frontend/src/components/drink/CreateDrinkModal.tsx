import React, { useState, useMemo, useEffect, useRef } from 'react';
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
    ChevronDown,
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

    const [name, setName] = useState('');
    const [glassType, setGlassType] = useState('Highball');
    const [glassSearch, setGlassSearch] = useState('');
    const [isGlassDropdownOpen, setIsGlassDropdownOpen] = useState(false);
    const glassDropdownRef = useRef<HTMLDivElement>(null);

    const [description, setDescription] = useState('');
    const [ingredientQuery, setIngredientQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<'ALL' | IngredientCategory>('ALL');
    const [selectedItems, setSelectedItems] = useState<RecipeBuilderItem[]>([]);
    const [steps, setSteps] = useState<string[]>([
        'Fill the glass with ice.',
        'Pour the ingredients and stir gently.',
    ]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const { data: ingredients = [] } = useQuery({
        queryKey: ['all-ingredients'],
        queryFn: () => drinksApi.getAllIngredients(),
        enabled: isOpen,
    });

    const { data: glassTypes = [] } = useQuery({
        queryKey: ['glass-types', glassSearch],
        queryFn: () => drinksApi.getGlassTypes(glassSearch),
        enabled: isOpen,
    });

    // Handle click outside glass dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (glassDropdownRef.current && !glassDropdownRef.current.contains(e.target as Node)) {
                setIsGlassDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-neutral-950/80 backdrop-blur-md">
            <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
                    <h2 className="text-xl font-black text-white">Create Cocktail Recipe</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Metrics Preview Bar */}
                <div className="px-5 py-2.5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between text-xs">
                    <div>
                        <span className="text-neutral-400">Total Volume: </span>
                        <strong className="text-white">{previewMetrics.totalVolumeCl} cl</strong>
                    </div>
                    <div>
                        <span className="text-neutral-400">Estimated ABV: </span>
                        <strong className="text-red-400 font-mono">{previewMetrics.abvPercent}%</strong>
                    </div>
                    <div>
                        <span className="text-neutral-400">Pure Alcohol: </span>
                        <strong className="text-white font-mono">
                            {previewMetrics.pureAlcoholGrams.toFixed(1)}g
                        </strong>
                    </div>
                </div>

                {/* Form Body */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        createMutation.mutate();
                    }}
                    className="p-5 overflow-y-auto space-y-5 flex-1"
                >
                    {errorMsg && (
                        <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Name & Searchable Glass Type Dropdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                Cocktail Name
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Boulevardier, Penicillin..."
                                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-red-600"
                            />
                        </div>

                        {/* Searchable Glass Dropdown */}
                        <div ref={glassDropdownRef} className="relative">
                            <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                Glass Type
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsGlassDropdownOpen(!isGlassDropdownOpen)}
                                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-left text-white flex items-center justify-between focus:outline-none focus:border-red-600"
                            >
                                <span className="truncate">{glassType || 'Select glass'}</span>
                                <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0 ml-1" />
                            </button>

                            {isGlassDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1.5 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1 max-h-48 overflow-y-auto">
                                    <input
                                        type="text"
                                        value={glassSearch}
                                        onChange={(e) => setGlassSearch(e.target.value)}
                                        placeholder="Search glass type..."
                                        className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 mb-1"
                                    />
                                    {glassTypes.map((g) => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => {
                                                setGlassType(g);
                                                setIsGlassDropdownOpen(false);
                                                setGlassSearch('');
                                            }}
                                            className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                                                glassType === g
                                                    ? 'bg-red-600 text-white font-bold'
                                                    : 'text-neutral-300 hover:bg-neutral-800'
                                            }`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                            Description
                        </label>
                        <textarea
                            rows={2}
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Briefly describe flavor profile and style..."
                            className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-red-600"
                        />
                    </div>

                    {/* Step 1: Ingredient Picker (Clean labels without technical text) */}
                    <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                        <label className="text-xs font-bold text-neutral-200 block">
                            1. Add Ingredients
                        </label>

                        <div className="relative">
                            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={ingredientQuery}
                                onChange={(e) => setIngredientQuery(e.target.value)}
                                placeholder="Search by name, spirit type, or flavor..."
                                className="w-full pl-9 pr-8 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                            />
                            {ingredientQuery && (
                                <button
                                    type="button"
                                    onClick={() => setIngredientQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
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
                                            ? 'bg-red-600 text-white'
                                            : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Chips list */}
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
                                                ? 'bg-red-600/20 border-red-600/60 text-red-300'
                                                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200'
                                        }`}
                                    >
                                        <Plus className="w-3.5 h-3.5 text-red-500" />
                                        <span className="font-semibold">{ing.name}</span>
                                        <span className="text-[10px] text-neutral-400">
                                            ({ing.subCategory}
                                            {ing.flavor ? ` • ${ing.flavor}` : ''})
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 2: Doses and Adjustments */}
                    <div className="space-y-2.5">
                        <label className="text-xs font-bold text-neutral-200 block">
                            2. Adjust Quantities ({selectedItems.length} selected)
                        </label>

                        {selectedItems.length === 0 ? (
                            <div className="p-5 rounded-xl bg-neutral-950 border border-dashed border-neutral-800 text-center text-xs text-neutral-500">
                                Tap ingredients above to add them to this recipe.
                            </div>
                        ) : (
                            selectedItems.map(({ ingredient, amountCl, displayUnitNote, isOptional }) => (
                                <div
                                    key={ingredient.id}
                                    className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <div className="text-sm font-bold text-white">
                                                {ingredient.name}
                                            </div>
                                            <div className="text-[11px] text-neutral-400">
                                                {ingredient.subCategory}
                                                {ingredient.flavor ? ` (${ingredient.flavor})` : ''}
                                                {ingredient.abv > 0 && ` • ${ingredient.abv}% ABV`}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => updateAmount(ingredient.id, -0.5)}
                                                className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-200"
                                            >
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="w-14 text-center font-mono font-bold text-xs text-red-400">
                                                {amountCl} cl
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateAmount(ingredient.id, 0.5)}
                                                className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-200"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(ingredient.id)}
                                                className="w-7 h-7 rounded-lg bg-neutral-900 hover:bg-red-950/60 border border-neutral-800 text-neutral-400 hover:text-red-400 flex items-center justify-center ml-1 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-neutral-800">
                                        <div className="flex flex-wrap gap-1">
                                            {DOSE_CHIPS.map((cl) => (
                                                <button
                                                    key={cl}
                                                    type="button"
                                                    onClick={() => setExactAmount(ingredient.id, cl)}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                                        amountCl === cl
                                                            ? 'bg-red-600 text-white border-red-600'
                                                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
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
                                                className="w-28 px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-200"
                                            />
                                            <label className="flex items-center gap-1 text-[11px] text-neutral-400 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isOptional}
                                                    onChange={(e) =>
                                                        updateItemField(ingredient.id, {
                                                            isOptional: e.target.checked,
                                                        })
                                                    }
                                                    className="rounded border-neutral-700"
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

                    {/* Step 3: Preparation Steps */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-neutral-300">
                                3. Preparation Steps
                            </label>
                            <button
                                type="button"
                                onClick={() => setSteps([...steps, ''])}
                                className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Step
                            </button>
                        </div>

                        {steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs font-bold text-neutral-500 w-5">
                                    {idx + 1}.
                                </span>
                                <input
                                    type="text"
                                    value={step}
                                    onChange={(e) => {
                                        const next = [...steps];
                                        next[idx] = e.target.value;
                                        setSteps(next);
                                    }}
                                    className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                                    className="text-neutral-500 hover:text-red-400"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold hover:bg-neutral-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || selectedItems.length === 0}
                            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/25 transition-all"
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                            <span>Publish Drink</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};