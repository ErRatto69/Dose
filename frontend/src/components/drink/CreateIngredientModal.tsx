import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { ModalShell } from '@/components/common/ModalShell';
import type { IngredientCategory } from '@/types';
import { Check, Loader2, AlertCircle } from 'lucide-react';

interface CreateIngredientModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES: IngredientCategory[] = [
    'Spirit',
    'Liqueur',
    'Wine',
    'Beer',
    'Mixer',
    'Syrup',
    'Garnish',
    'Pantry',
];

const DEFAULT_SUBCATEGORY_BY_CAT: Record<IngredientCategory, string> = {
    Spirit: 'Vodka',
    Liqueur: 'Liqueur',
    Wine: 'Sparkling Wine',
    Beer: 'Lager Beer',
    Mixer: 'Soda',
    Syrup: 'Sugar Syrup',
    Garnish: 'Citrus Garnish',
    Pantry: 'Spices',
};

export const CreateIngredientModal: React.FC<CreateIngredientModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();

    const [name, setName] = useState('');
    const [category, setCategory] = useState<IngredientCategory>('Spirit');
    const [subCategory, setSubCategory] = useState('Vodka');
    const [flavor, setFlavor] = useState('');
    const [abv, setAbv] = useState('40');
    const [description, setDescription] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const isNonAlcoholic =
        category === 'Mixer' || category === 'Syrup' || category === 'Garnish' || category === 'Pantry';

    const createMutation = useMutation({
        mutationFn: async () => {
            setErrorMsg(null);
            return drinksApi.createIngredient({
                name: name.trim(),
                category,
                subCategory: subCategory.trim(),
                flavor: flavor.trim() ? flavor.trim() : null,
                abv: isNonAlcoholic ? 0 : Number(abv),
                isAvailableInBar: true,
                description: description.trim() || undefined,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-ingredients'] });
            setName('');
            setFlavor('');
            setDescription('');
            onClose();
        },
        onError: (err: unknown) => {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { detail?: string } } };
                setErrorMsg(
                    axiosErr.response?.data?.detail ||
                    'Could not create ingredient. Verify name is unique and ABV matches category.'
                );
            } else {
                setErrorMsg('Failed to create ingredient.');
            }
        },
    });

    const footer = (
        <div className="flex justify-end gap-2">
            <button
                type="button"
                onClick={onClose}
                disabled={createMutation.isPending}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-zinc-300 text-xs font-bold dose-press"
            >
                Cancel
            </button>
            <button
                type="submit"
                form="create-ingredient-form"
                disabled={createMutation.isPending}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1.5 border border-red-500/50 dose-press"
            >
                {createMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                )}
                <span>Save Ingredient</span>
            </button>
        </div>
    );

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Ingredient"
            subtitle="Register a spirit, liqueur, mixer, or garnish for cocktail recipes."
            maxWidthClass="max-w-md"
            footer={footer}
            closeDisabled={createMutation.isPending}
        >
            <form
                id="create-ingredient-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    createMutation.mutate();
                }}
                className="space-y-4"
            >
                {errorMsg && (
                    <div
                        role="alert"
                        className="p-3 rounded-xl bg-red-950/60 border border-red-700/60 text-red-200 text-xs flex items-center gap-2"
                    >
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" aria-hidden="true" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <div>
                    <label htmlFor="ing-name" className="text-xs font-bold text-zinc-200 block mb-1.5">
                        Ingredient / Brand Name
                    </label>
                    <input
                        id="ing-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Belvedere Vodka, Fresh Lime Juice…"
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-xl text-xs dose-input"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="ing-category" className="text-xs font-bold text-zinc-200 block mb-1.5">
                            Main Category
                        </label>
                        <select
                            id="ing-category"
                            value={category}
                            onChange={(e) => {
                                const nextCat = e.target.value as IngredientCategory;
                                setCategory(nextCat);
                                setSubCategory(DEFAULT_SUBCATEGORY_BY_CAT[nextCat]);
                                if (
                                    nextCat === 'Mixer' ||
                                    nextCat === 'Syrup' ||
                                    nextCat === 'Garnish' ||
                                    nextCat === 'Pantry'
                                ) {
                                    setAbv('0');
                                } else if (!abv || Number(abv) <= 0) {
                                    setAbv(nextCat === 'Beer' ? '5' : nextCat === 'Wine' ? '12' : '40');
                                }
                            }}
                            className="w-full min-h-[42px] px-3 py-2 rounded-xl text-xs dose-input"
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="ing-subcategory" className="text-xs font-bold text-zinc-200 block mb-1.5">
                            Family / SubCategory
                        </label>
                        <input
                            id="ing-subcategory"
                            type="text"
                            required
                            value={subCategory}
                            onChange={(e) => setSubCategory(e.target.value)}
                            placeholder="Vodka, Gin, Citrus…"
                            className="w-full min-h-[42px] px-3 py-2 rounded-xl text-xs dose-input"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="ing-flavor" className="text-xs font-bold text-zinc-200 block mb-1.5">
                            Flavor (Optional)
                        </label>
                        <input
                            id="ing-flavor"
                            type="text"
                            value={flavor}
                            onChange={(e) => setFlavor(e.target.value)}
                            placeholder="Peach, Coffee…"
                            className="w-full min-h-[42px] px-3 py-2 rounded-xl text-xs dose-input"
                        />
                    </div>

                    <div>
                        <label htmlFor="ing-abv" className="text-xs font-bold text-zinc-200 block mb-1.5">
                            ABV (%)
                        </label>
                        <input
                            id="ing-abv"
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="0"
                            max="96"
                            disabled={isNonAlcoholic}
                            required
                            value={isNonAlcoholic ? '0' : abv}
                            onChange={(e) => setAbv(e.target.value)}
                            className="w-full min-h-[42px] px-3 py-2 rounded-xl text-xs tabular-nums disabled:opacity-50 dose-input"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="ing-desc" className="text-xs font-bold text-zinc-200 block mb-1.5">
                        Description (Optional)
                    </label>
                    <input
                        id="ing-desc"
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Short note about this ingredient…"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl text-xs dose-input"
                    />
                </div>
            </form>
        </ModalShell>
    );
};
