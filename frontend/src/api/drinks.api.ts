import { axiosClient } from './axiosClient';
import type {
    CabinetStatus,
    CreateDrinkRequest,
    CreateIngredientRequest,
    DrinkCatalogItem,
    DrinkDetail,
    DrinkMatchResult,
    Ingredient,
    IngredientSuggestion,
    ReviewItem,
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

    createDrink: async (payload: CreateDrinkRequest): Promise<{ id: string; name: string }> => {
        const { data } = await axiosClient.post<{ id: string; name: string }>('/drinks', payload);
        return data;
    },

    createIngredient: async (payload: CreateIngredientRequest): Promise<Ingredient> => {
        const { data } = await axiosClient.post<Ingredient>('/ingredients', payload);
        return data;
    },

    getReviews: async (drinkId: string): Promise<ReviewItem[]> => {
        const { data } = await axiosClient.get<ReviewItem[]>(`/drinks/${drinkId}/reviews`);
        return data;
    },

    upsertReview: async (drinkId: string, rating: number, comment?: string): Promise<void> => {
        await axiosClient.post(`/drinks/${drinkId}/reviews`, { rating, comment });
    },

    getMyCabinet: async (): Promise<CabinetStatus> => {
        const { data } = await axiosClient.get<CabinetStatus>('/cabinet');
        return data;
    },

    syncCabinet: async (ingredientIds: string[]): Promise<void> => {
        await axiosClient.post('/cabinet/sync', { ingredientIds });
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