import { create } from 'zustand';
import type { DrinkDetail, Ingredient, IngredientCategory } from '@/types';

export interface EditableIngredientDose {
    rowId: string;
    ingredientId: string;
    name: string;
    category: IngredientCategory;
    subCategory: string;
    flavor?: string | null;
    abv: number;
    amountCl: number;
    isCustomAdded?: boolean;
}

const getLocalDateTimeInputValue = (date: Date = new Date()): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

interface DoseModalState {
    isOpen: boolean;
    drink: DrinkDetail | null;
    components: EditableIngredientDose[];
    isNow: boolean;
    customConsumedAt: string;
    notes: string;
    openModal: (drink: DrinkDetail) => void;
    closeModal: () => void;
    updateComponentDose: (rowId: string, deltaCl: number) => void;
    setComponentExactDose: (rowId: string, amountCl: number) => void;
    replaceComponentIngredient: (rowId: string, newIng: Ingredient) => void;
    addCustomComponent: (ing: Ingredient, defaultCl?: number) => void;
    removeComponent: (rowId: string) => void;
    applyMultiplier: (multiplier: number) => void;
    setIsNow: (isNow: boolean) => void;
    setCustomConsumedAt: (dateTimeStr: string) => void;
    setNotes: (notes: string) => void;
}

const isAlcoholicCategory = (cat: IngredientCategory) =>
    cat === 'Spirit' || cat === 'Liqueur' || cat === 'Wine' || cat === 'Beer';

export const useDoseModalStore = create<DoseModalState>((set) => ({
    isOpen: false,
    drink: null,
    components: [],
    isNow: true,
    customConsumedAt: getLocalDateTimeInputValue(),
    notes: '',

    openModal: (drink: DrinkDetail) => {
        set({
            isOpen: true,
            drink,
            components: drink.ingredients.map((ing, idx) => ({
                rowId: `${ing.ingredientId}-${idx}`,
                ingredientId: ing.ingredientId,
                name: ing.name,
                category: ing.category,
                subCategory: ing.subCategory,
                flavor: ing.flavor,
                abv: ing.abv,
                amountCl: ing.amountCl,
                isCustomAdded: false,
            })),
            isNow: true,
            customConsumedAt: getLocalDateTimeInputValue(),
            notes: '',
        });
    },

    closeModal: () => set({ isOpen: false, drink: null, components: [] }),

    updateComponentDose: (rowId: string, deltaCl: number) => {
        set((state) => ({
            components: state.components.map((c) => {
                if (c.rowId !== rowId) return c;
                const newDose = Math.max(0, Math.round((c.amountCl + deltaCl) * 10) / 10);
                return { ...c, amountCl: newDose };
            }),
        }));
    },

    setComponentExactDose: (rowId: string, amountCl: number) => {
        set((state) => ({
            components: state.components.map((c) =>
                c.rowId === rowId ? { ...c, amountCl: Math.max(0, Math.round(amountCl * 10) / 10) } : c
            ),
        }));
    },

    replaceComponentIngredient: (rowId: string, newIng: Ingredient) => {
        set((state) => ({
            components: state.components.map((c) =>
                c.rowId === rowId
                    ? {
                        ...c,
                        ingredientId: newIng.id,
                        name: newIng.name,
                        category: newIng.category,
                        subCategory: newIng.subCategory,
                        flavor: newIng.flavor,
                        abv: newIng.abv,
                    }
                    : c
            ),
        }));
    },

    addCustomComponent: (ing: Ingredient, defaultCl?: number) => {
        set((state) => {
            const existing = state.components.find((c) => c.ingredientId === ing.id);
            const stepCl = defaultCl ?? (isAlcoholicCategory(ing.category) ? 3.0 : 5.0);
            if (existing) {
                return {
                    components: state.components.map((c) =>
                        c.rowId === existing.rowId
                            ? { ...c, amountCl: Math.round((c.amountCl + stepCl) * 10) / 10 }
                            : c
                    ),
                };
            }
            return {
                components: [
                    ...state.components,
                    {
                        rowId: `${ing.id}-${Date.now()}`,
                        ingredientId: ing.id,
                        name: ing.name,
                        category: ing.category,
                        subCategory: ing.subCategory,
                        flavor: ing.flavor,
                        abv: ing.abv,
                        amountCl: stepCl,
                        isCustomAdded: true,
                    },
                ],
            };
        });
    },

    removeComponent: (rowId: string) => {
        set((state) => ({
            components: state.components.filter((c) => c.rowId !== rowId),
        }));
    },

    applyMultiplier: (multiplier: number) => {
        set((state) => {
            if (!state.drink) return state;
            const origMap = new Map(state.drink.ingredients.map((i) => [i.ingredientId, i.amountCl]));
            return {
                components: state.components.map((comp) => {
                    const baseAmount = origMap.get(comp.ingredientId) ?? comp.amountCl;
                    return {
                        ...comp,
                        amountCl: isAlcoholicCategory(comp.category)
                            ? Math.max(0, Math.round(baseAmount * multiplier * 10) / 10)
                            : comp.amountCl,
                    };
                }),
            };
        });
    },

    setIsNow: (isNow: boolean) =>
        set({
            isNow,
            customConsumedAt: getLocalDateTimeInputValue(),
        }),

    setCustomConsumedAt: (dateTimeStr: string) => set({ customConsumedAt: dateTimeStr, isNow: false }),

    setNotes: (notes: string) => set({ notes }),
}));