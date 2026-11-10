import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { queryKeys } from '@/api/queryKeys';
import { matchesSearchQuery } from '@/utils/textSearch';
import { calculateStrengthMetrics } from '@/utils/strengthCalc';
import { BottleStrengthMeter } from './BottleStrengthMeter';
import { ModalShell } from '@/components/common/ModalShell';
import type { DrinkDetail, Ingredient, IngredientCategory } from '@/types';
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
    UploadCloud,
    Lock,
    Unlock,
    Copy,
    Edit3,
} from 'lucide-react';

interface CreateDrinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDrink?: DrinkDetail | null;
    mode?: 'create' | 'edit' | 'duplicate';
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

interface CreateDrinkBodyProps {
    initialDrink: DrinkDetail | null;
    mode: 'create' | 'edit' | 'duplicate';
    onClose: () => void;
    onPendingChange: (pending: boolean) => void;
}

const CreateDrinkBody: React.FC<CreateDrinkBodyProps> = ({
    initialDrink,
    mode,
    onClose,
    onPendingChange,
}) => {
    const queryClient = useQueryClient();

    const [name, setName] = useState(() =>
        initialDrink
            ? mode === 'duplicate'
                ? `${initialDrink.name} (Remix)`
                : initialDrink.name
            : ''
    );
    const [glassType, setGlassType] = useState(() => initialDrink?.glassType || 'Highball');
    const [glassSearch, setGlassSearch] = useState('');
    const [isGlassDropdownOpen, setIsGlassDropdownOpen] = useState(false);
    const glassDropdownRef = useRef<HTMLDivElement>(null);

    const [description, setDescription] = useState(() => initialDrink?.description || '');
    const [ingredientQuery, setIngredientQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<'ALL' | IngredientCategory>('ALL');
    const [selectedItems, setSelectedItems] = useState<RecipeBuilderItem[]>(() =>
        initialDrink
            ? initialDrink.ingredients.map((di) => ({
                  ingredient: {
                      id: di.ingredientId,
                      name: di.name,
                      category: di.category as IngredientCategory,
                      subCategory: di.subCategory,
                      flavor: di.flavor,
                      abv: di.abv,
                      isAvailableInBar: true,
                  },
                  amountCl: di.amountCl,
                  displayUnitNote: di.displayUnitNote || '',
                  isOptional: di.isOptional,
              }))
            : []
    );
    const [steps, setSteps] = useState<string[]>(() =>
        initialDrink?.preparationSteps?.length
            ? initialDrink.preparationSteps
            : ['Fill the glass with ice.', 'Pour the ingredients and stir gently.']
    );
    const [isLockedByCreator, setIsLockedByCreator] = useState(() =>
        initialDrink?.isLockedByCreator || false
    );

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(() => initialDrink?.imageUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const { data: ingredients = [] } = useQuery({
        queryKey: ['all-ingredients'],
        queryFn: () => drinksApi.getAllIngredients(),
    });

    const { data: glassTypes = [] } = useQuery({
        queryKey: ['glass-types', glassSearch],
        queryFn: () => drinksApi.getGlassTypes(glassSearch),
    });

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (glassDropdownRef.current && !glassDropdownRef.current.contains(e.target as Node)) {
                setIsGlassDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setErrorMsg('Image size cannot exceed 5 MB.');
            return;
        }

        setImageFile(file);
        const objectUrl = URL.createObjectURL(file);
        setImagePreview(objectUrl);
        setErrorMsg(null);
    };

    const handleRemoveImage = () => {
        if (imageFile && imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

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

    const saveMutation = useMutation({
        mutationFn: async () => {
            setErrorMsg(null);
            onPendingChange(true);
            if (selectedItems.length === 0) {
                throw new Error('Please select at least one ingredient for the recipe.');
            }

            let finalImageUrl = imagePreview || undefined;
            if (imageFile) {
                const uploadRes = await drinksApi.uploadDrinkImage(imageFile);
                finalImageUrl = uploadRes.imageUrl;
            }

            const effectiveDescription =
                description.trim() ||
                `Craft cocktail recipe featuring ${selectedItems.map((i) => i.ingredient.name).join(', ')}.`;

            const payload = {
                name: name.trim(),
                description: effectiveDescription,
                glassType: glassType.trim() || undefined,
                imageUrl: finalImageUrl,
                isLockedByCreator,
                preparationSteps: steps.map((s) => s.trim()).filter(Boolean),
                ingredients: selectedItems.map((r, idx) => ({
                    ingredientId: r.ingredient.id,
                    amountCl: r.amountCl,
                    displayUnitNote: r.displayUnitNote.trim() || undefined,
                    isOptional: r.isOptional,
                    sortOrder: idx + 1,
                })),
            };

            if (mode === 'edit' && initialDrink) {
                return drinksApi.updateDrink(initialDrink.id, payload);
            }
            return drinksApi.createDrink(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog-infinite'] });
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog'] });
            if (mode !== 'edit') {
                queryClient.invalidateQueries({ queryKey: queryKeys.gamification.passport() });
            }
            if (initialDrink) {
                queryClient.invalidateQueries({ queryKey: ['drink-detail', initialDrink.id] });
            }
            onClose();
        },
        onError: (err: unknown) => {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as {
                    response?: {
                        data?: {
                            detail?: string;
                            error?: string;
                            errors?: Record<string, string[]>;
                        };
                    };
                };

                const validationErrors = axiosErr.response?.data?.errors;
                if (validationErrors) {
                    const messages = Object.values(validationErrors).flat().join(' ');
                    setErrorMsg(messages);
                    return;
                }

                setErrorMsg(
                    axiosErr.response?.data?.error ||
                    axiosErr.response?.data?.detail ||
                    'Failed to save drink recipe.'
                );
            } else if (err instanceof Error) {
                setErrorMsg(err.message);
            } else {
                setErrorMsg('Failed to save drink recipe.');
            }
        },
        onSettled: () => {
            onPendingChange(false);
        },
    });

    const submitBtnLabel =
        mode === 'edit'
            ? 'Save Changes'
            : mode === 'duplicate'
                ? 'Create Remix'
                : 'Publish Drink';

    return (
        <form
            id="create-drink-form"
            onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
            }}
            className="space-y-6"
        >
            {/* Live Metrics Readout Strip */}
            <div className="px-4 py-2.5 rounded-xl bg-[#0c0c0f] border border-white/[0.08] flex items-center justify-between text-xs tabular-nums">
                <div>
                    <span className="text-zinc-400">Volume: </span>
                    <strong className="text-white">{previewMetrics.totalVolumeCl} cl</strong>
                </div>
                <div>
                    <span className="text-zinc-400">Est. ABV: </span>
                    <strong className="text-red-400">{previewMetrics.abvPercent}%</strong>
                </div>
                <div>
                    <span className="text-zinc-400">Ethanol: </span>
                    <strong className="text-white">{previewMetrics.pureAlcoholGrams.toFixed(1)} g</strong>
                </div>
            </div>

            {errorMsg && (
                <div
                    role="alert"
                    className="p-3 rounded-xl bg-red-950/60 border border-red-700/60 text-red-200 text-xs flex items-center gap-2"
                >
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" aria-hidden="true" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5 flex flex-col">
                    <span className="text-xs font-bold text-zinc-200 block mb-1.5">
                        Cocktail Photo (Optional)
                    </span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    {imagePreview ? (
                        <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0c0c0f]">
                            <img
                                src={imagePreview}
                                alt="Cocktail preview"
                                width={320}
                                height={240}
                                className="w-full h-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                aria-label="Remove cocktail photo"
                                className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-[#09090b]/85 hover:bg-red-600 text-zinc-200 hover:text-white flex items-center justify-center backdrop-blur-sm dose-press"
                            >
                                <X className="w-4 h-4" aria-hidden="true" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-[4/3] w-full rounded-2xl border-2 border-dashed border-white/15 hover:border-red-500/60 bg-[#0c0c0f] flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-zinc-200 p-3 dose-press"
                        >
                            <div className="w-10 h-10 rounded-xl bg-[#111114] border border-white/[0.08] flex items-center justify-center text-red-400">
                                <UploadCloud className="w-5 h-5" aria-hidden="true" />
                            </div>
                            <div className="text-center">
                                <span className="text-xs font-bold block">Upload Photo</span>
                                <span className="text-[11px] text-zinc-400">JPG, PNG, WebP up to 5 MB</span>
                            </div>
                        </button>
                    )}
                </div>

                <div className="md:col-span-7 space-y-3.5">
                    <div>
                        <label htmlFor="drink-name-input" className="text-xs font-bold text-zinc-200 block mb-1">
                            Cocktail Name *
                        </label>
                        <input
                            id="drink-name-input"
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Boulevardier, Penicillin…"
                            className="w-full min-h-[42px] px-3.5 py-2 rounded-xl text-sm dose-input"
                        />
                    </div>

                    <div className="relative" ref={glassDropdownRef}>
                        <span className="text-xs font-bold text-zinc-200 block mb-1">
                            Glass Type
                        </span>
                        <button
                            type="button"
                            aria-expanded={isGlassDropdownOpen}
                            onClick={() => setIsGlassDropdownOpen((prev) => !prev)}
                            className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0c0c0f] border border-white/[0.08] text-sm text-white flex items-center justify-between dose-press"
                        >
                            <span>{glassType}</span>
                            <ChevronDown className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                        </button>

                        {isGlassDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-20 p-2 rounded-2xl bg-[#111114] border border-white/12 shadow-2xl space-y-1 max-h-52 overflow-y-auto overscroll-contain">
                                <div className="relative mb-1">
                                    <Search
                                        className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                        aria-hidden="true"
                                    />
                                    <input
                                        type="search"
                                        aria-label="Filter glass types"
                                        value={glassSearch}
                                        onChange={(e) => setGlassSearch(e.target.value)}
                                        placeholder="Search glass…"
                                        className="w-full min-h-[36px] pl-8 pr-2.5 py-1.5 text-xs rounded-lg dose-input"
                                    />
                                </div>
                                {glassTypes.map((g) => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => {
                                            setGlassType(g);
                                            setIsGlassDropdownOpen(false);
                                        }}
                                        className="w-full min-h-[36px] text-left px-2.5 py-1.5 text-xs rounded-lg text-zinc-200 hover:bg-white/[0.06] flex items-center justify-between transition-colors"
                                    >
                                        <span>{g}</span>
                                        {glassType === g && <Check className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="drink-desc-input" className="text-xs font-bold text-zinc-200 block mb-1">
                            Description &amp; Tasting Notes
                        </label>
                        <textarea
                            id="drink-desc-input"
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Flavor profile, aromatic highlights, or background…"
                            className="w-full px-3.5 py-2 rounded-xl text-xs dose-input resize-none"
                        />
                    </div>
                </div>
            </div>

            <label className="p-3.5 rounded-2xl bg-[#0c0c0f] border border-white/[0.08] flex items-center justify-between gap-3 cursor-pointer">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isLockedByCreator ? 'bg-amber-500/15 text-amber-400' : 'bg-[#111114] text-zinc-400'}`}>
                        {isLockedByCreator ? <Lock className="w-4 h-4" aria-hidden="true" /> : <Unlock className="w-4 h-4" aria-hidden="true" />}
                    </div>
                    <div className="min-w-0">
                        <span className="text-xs font-bold text-white block">
                            Lock Recipe (Creator Only)
                        </span>
                        <span className="text-[11px] text-zinc-400 block">
                            Visible to all guests, editable only by you and the host.
                        </span>
                    </div>
                </div>
                <div className="relative inline-flex items-center shrink-0">
                    <input
                        type="checkbox"
                        checked={isLockedByCreator}
                        onChange={(e) => setIsLockedByCreator(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-red-600 peer-focus-visible:ring-2 peer-focus-visible:ring-red-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5" />
                </div>
            </label>

            {selectedItems.length > 0 && (
                <BottleStrengthMeter
                    score1To10={previewMetrics.bottleScore1To10}
                    bottleRating={previewMetrics.bottleVisualRating}
                    abvPercent={previewMetrics.abvPercent}
                    compact
                />
            )}

            <div className="p-4 rounded-2xl bg-[#0c0c0f] border border-white/[0.08] space-y-3">
                <label htmlFor="recipe-ing-search" className="text-xs font-bold text-zinc-100 block">
                    Add Ingredients
                </label>

                <div className="relative">
                    <Search
                        className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                    />
                    <input
                        id="recipe-ing-search"
                        type="search"
                        value={ingredientQuery}
                        onChange={(e) => setIngredientQuery(e.target.value)}
                        placeholder="Search by name, spirit type, or flavor…"
                        className="w-full min-h-[40px] pl-9 pr-9 py-2 rounded-xl text-xs dose-input"
                    />
                    {ingredientQuery && (
                        <button
                            type="button"
                            onClick={() => setIngredientQuery('')}
                            aria-label="Clear ingredient filter"
                            className="w-8 h-8 rounded-lg flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                        >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {CATEGORY_FILTERS.map((cat) => (
                        <button
                            key={cat.value}
                            type="button"
                            aria-pressed={activeCategory === cat.value}
                            onClick={() => setActiveCategory(cat.value)}
                            className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 border dose-press ${
                                activeCategory === cat.value
                                    ? 'bg-red-600 text-white border-red-500/70'
                                    : 'bg-[#111114] text-zinc-400 hover:text-zinc-200 border-white/[0.08]'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto overscroll-contain pt-0.5">
                    {filteredPickerIngredients.map((ing) => {
                        const isAdded = selectedItems.some((x) => x.ingredient.id === ing.id);

                        return (
                            <button
                                key={ing.id}
                                type="button"
                                onClick={() => addIngredientToRecipe(ing)}
                                className={`min-h-[36px] px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 dose-press ${
                                    isAdded
                                        ? 'bg-red-600/20 border-red-500/60 text-red-200'
                                        : 'bg-[#111114] hover:bg-[#18181d] border-white/[0.08] text-zinc-200'
                                }`}
                            >
                                <Plus className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                                <span className="font-bold">{ing.name}</span>
                                <span className="text-[11px] text-zinc-400">
                                    {ing.subCategory}
                                    {ing.flavor ? ` · ${ing.flavor}` : ''}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-2.5">
                <span className="text-xs font-bold text-zinc-100 block">
                    Adjust Quantities ({selectedItems.length} selected)
                </span>

                {selectedItems.length === 0 ? (
                    <div className="p-5 rounded-xl bg-[#0c0c0f] border border-dashed border-white/15 text-center text-xs text-zinc-400">
                        Tap ingredients above to add them to this recipe.
                    </div>
                ) : (
                    selectedItems.map(({ ingredient, amountCl, displayUnitNote, isOptional }) => (
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
                                        {ingredient.flavor ? ` (${ingredient.flavor})` : ''}
                                        {ingredient.abv > 0 && <span className="tabular-nums"> · {ingredient.abv}% ABV</span>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => updateAmount(ingredient.id, -0.5)}
                                        aria-label={`Decrease ${ingredient.name}`}
                                        className="w-8 h-8 rounded-lg bg-[#111114] border border-white/[0.08] flex items-center justify-center text-zinc-200 dose-press"
                                    >
                                        <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                    <span className="w-14 text-center tabular-nums font-extrabold text-xs text-red-400">
                                        {amountCl} cl
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => updateAmount(ingredient.id, 0.5)}
                                        aria-label={`Increase ${ingredient.name}`}
                                        className="w-8 h-8 rounded-lg bg-[#111114] border border-white/[0.08] flex items-center justify-center text-zinc-200 dose-press"
                                    >
                                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(ingredient.id)}
                                        aria-label={`Remove ${ingredient.name}`}
                                        className="w-8 h-8 rounded-lg bg-[#111114] hover:bg-red-950/60 border border-white/[0.08] text-zinc-400 hover:text-red-400 flex items-center justify-center ml-0.5 dose-press"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                                <div className="flex flex-wrap gap-1">
                                    {DOSE_CHIPS.map((cl) => (
                                        <button
                                            key={cl}
                                            type="button"
                                            onClick={() => setExactAmount(ingredient.id, cl)}
                                            className={`min-h-[30px] px-2 py-0.5 rounded-lg text-[11px] font-bold border tabular-nums dose-press ${
                                                amountCl === cl
                                                    ? 'bg-red-600 text-white border-red-500/70'
                                                    : 'bg-[#111114] border-white/[0.08] text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            {cl} cl
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2.5">
                                    <input
                                        type="text"
                                        aria-label={`Unit note for ${ingredient.name}`}
                                        value={displayUnitNote}
                                        onChange={(e) =>
                                            updateItemField(ingredient.id, {
                                                displayUnitNote: e.target.value,
                                            })
                                        }
                                        placeholder="Note (e.g. Top up)…"
                                        className="w-28 min-h-[32px] px-2 py-1 rounded-lg text-[11px] dose-input"
                                    />
                                    <label className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer min-h-[32px]">
                                        <input
                                            type="checkbox"
                                            checked={isOptional}
                                            onChange={(e) =>
                                                updateItemField(ingredient.id, {
                                                    isOptional: e.target.checked,
                                                })
                                            }
                                            className="rounded border-white/20 accent-red-600"
                                        />
                                        <span>Optional</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-100">
                        Preparation Steps
                    </span>
                    <button
                        type="button"
                        onClick={() => setSteps([...steps, ''])}
                        className="min-h-[34px] px-2.5 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-white/[0.04] flex items-center gap-1 dose-press"
                    >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Add Step</span>
                    </button>
                </div>

                {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-400 w-5 tabular-nums">
                            {idx + 1}.
                        </span>
                        <input
                            type="text"
                            aria-label={`Preparation step ${idx + 1}`}
                            value={step}
                            onChange={(e) => {
                                const next = [...steps];
                                next[idx] = e.target.value;
                                setSteps(next);
                            }}
                            className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl text-xs dose-input"
                        />
                        {steps.length > 1 && (
                            <button
                                type="button"
                                onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                                aria-label={`Remove step ${idx + 1}`}
                                className="w-9 h-9 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-white/[0.05] flex items-center justify-center dose-press"
                            >
                                <X className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Sticky Submit Actions rendered inline at bottom of form or linked via footer */}
            <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={saveMutation.isPending}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-zinc-300 text-xs font-bold dose-press"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saveMutation.isPending || selectedItems.length === 0}
                    className="min-h-[42px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-extrabold flex items-center gap-1.5 border border-red-500/50 dose-press"
                >
                    {saveMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                    )}
                    <span>{submitBtnLabel}</span>
                </button>
            </div>
        </form>
    );
};

export const CreateDrinkModal: React.FC<CreateDrinkModalProps> = ({
    isOpen,
    onClose,
    initialDrink = null,
    mode = 'create',
}) => {
    const [isPending, setIsPending] = useState(false);

    const modalTitle =
        mode === 'edit'
            ? 'Edit Cocktail Recipe'
            : mode === 'duplicate'
                ? 'Duplicate & Remix Cocktail'
                : 'Create Cocktail Recipe';

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            badge={
                mode === 'edit' ? (
                    <span className="text-xs font-bold text-red-400 inline-flex items-center gap-1">
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Recipe Editor</span>
                    </span>
                ) : mode === 'duplicate' ? (
                    <span className="text-xs font-bold text-red-400 inline-flex items-center gap-1">
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Recipe Remix</span>
                    </span>
                ) : undefined
            }
            maxWidthClass="max-w-2xl"
            closeDisabled={isPending}
        >
            {isOpen && (
                <CreateDrinkBody
                    key={`${mode}-${initialDrink?.id ?? 'new'}`}
                    initialDrink={initialDrink}
                    mode={mode}
                    onClose={onClose}
                    onPendingChange={setIsPending}
                />
            )}
        </ModalShell>
    );
};
