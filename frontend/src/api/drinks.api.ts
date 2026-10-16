import { axiosClient } from './axiosClient';
import type {
    DrinkCatalogItem,
    DrinkDetail,
    DrinkMatchResult,
    Ingredient,
    IngredientSuggestion,
} from '@/types';

export const drinksApi = {
    getCatalog: async (): Promise<DrinkCatalogItem[]> => {
        const { data } = await axiosClient.get<DrinkCatalogItem[]>('/drinks');
        return data;
    },

    getById: async (id: string): Promise<DrinkDetail> => {
        const { data } = await axiosClient.get<DrinkDetail>(`/drinks/${id}`);
        return data;
    },

    matchCabinet: async (additionalIngredientIds?: string[]): Promise<DrinkMatchResult[]> => {
        const { data } = await axiosClient.post<DrinkMatchResult[]>('/cabinet/match', {
            ingredientIds: additionalIngredientIds ?? [],
        });
        return data;
    },

    autocomplete: async (query: string): Promise<IngredientSuggestion[]> => {
        const { data } = await axiosClient.get<IngredientSuggestion[]>('/ingredients/autocomplete', {
            params: { q: query },
        });
        return data;
    },

    getAllIngredients: async (): Promise<Ingredient[]> => {
        const { data } = await axiosClient.get<Ingredient[]>('/ingredients');
        return data;
    },
};