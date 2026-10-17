import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import type { IngredientCategory } from '@/types';
import { X, Check, Loader2, AlertCircle } from 'lucide-react';

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            Bar &amp; Pantry Inventory
                        </span>
                        <h2 className="text-lg font-bold text-white">Add New Ingredient</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        createMutation.mutate();
                    }}
                    className="space-y-3.5"
                >
                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Ingredient / Brand Name
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Belvedere Vodka, Fresh Pineapple Juice, Mint..."
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">
                                Main Category
                            </label>
                            <select
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
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">
                                Type / Family (SubCategory)
                            </label>
                            <input
                                type="text"
                                required
                                value={subCategory}
                                onChange={(e) => setSubCategory(e.target.value)}
                                placeholder="e.g., Vodka, Gin, Citrus Juice, Garnish"
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">
                                Flavor / Aroma (Optional)
                            </label>
                            <input
                                type="text"
                                value={flavor}
                                onChange={(e) => setFlavor(e.target.value)}
                                placeholder="Blank if neutral, or Peach, Coffee..."
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">
                                ABV (%)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="96"
                                disabled={isNonAlcoholic}
                                required
                                value={isNonAlcoholic ? '0' : abv}
                                onChange={(e) => setAbv(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Description (Optional)
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Short note about this ingredient..."
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                            Save Ingredient
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};