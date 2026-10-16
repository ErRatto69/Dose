import { create } from 'zustand';
import type { DrinkDetail, IngredientCategory } from '@/types';

export interface EditableIngredientDose {
    ingredientId: string;
    name: string;
    category: IngredientCategory;
    abv: number;
    amountCl: number;
}

interface DoseModalState {
    isOpen: boolean;
    drink: DrinkDetail | null;
    components: EditableIngredientDose[];
    timeOffsetMinutes: number;
    notes: string;

    openModal: (drink: DrinkDetail) => void;
    closeModal: () => void;
    updateComponentDose: (ingredientId: string, deltaCl: number) => void;
    applyMultiplier: (multiplier: number) => void;
    setTimeOffsetMinutes: (minutes: number) => void;
    setNotes: (notes: string) => void;
}

export const useDoseModalStore = create<DoseModalState>((set) => ({
    isOpen: false,
    drink: null,
    components: [],
    timeOffsetMinutes: 0,
    notes: '',

    openModal: (drink: DrinkDetail) => {
        set({
            isOpen: true,
            drink,
            components: drink.ingredients.map((ing) => ({
                ingredientId: ing.ingredientId,
                name: ing.name,
                category: ing.category,
                abv: ing.abv,
                amountCl: ing.amountCl,
            })),
            timeOffsetMinutes: 0,
            notes: '',
        });
    },

    closeModal: () => set({ isOpen: false, drink: null, components: [] }),

    updateComponentDose: (ingredientId: string, deltaCl: number) => {
        set((state) => ({
            components: state.components.map((c) => {
                if (c.ingredientId !== ingredientId) return c;
                const newDose = Math.max(0, Math.round((c.amountCl + deltaCl) * 10) / 10);
                return { ...c, amountCl: newDose };
            }),
        }));
    },

    applyMultiplier: (multiplier: number) => {
        set((state) => {
            if (!state.drink) return state;
            return {
                components: state.drink.ingredients.map((orig) => ({
                    ingredientId: orig.ingredientId,
                    name: orig.name,
                    category: orig.category,
                    abv: orig.abv,
                    amountCl:
                        orig.category === 'Spirit'
                            ? Math.max(0, Math.round(orig.amountCl * multiplier * 10) / 10)
                            : orig.amountCl,
                })),
            };
        });
    },

    setTimeOffsetMinutes: (minutes: number) => set({ timeOffsetMinutes: minutes }),
    setNotes: (notes: string) => set({ notes }),
}));