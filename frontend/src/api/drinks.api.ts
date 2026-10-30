import { axiosClient } from './axiosClient';
import type {
    CabinetStatus,
    CreateDrinkRequest,
    UpdateDrinkRequest,
    CreateIngredientRequest,
    DrinkCatalogItem,
    DrinkDetail,
    DrinkMatchResult,
    Ingredient,
    IngredientSuggestion,
    PagedResult,
    ReviewItem,
} from '@/types';

export const drinksApi = {
    getCatalog: async (params?: {
        pageNumber?: number;
        pageSize?: number;
        search?: string;
        glassType?: string;
    }): Promise<PagedResult<DrinkCatalogItem>> => {
        const { data } = await axiosClient.get<PagedResult<DrinkCatalogItem>>('/drinks', {
            params,
        });
        return data;
    },

    getGlassTypes: async (query?: string): Promise<string[]> => {
        const { data } = await axiosClient.get<string[]>('/drinks/glass-types', {
            params: { q: query },
        });
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

    updateDrink: async (id: string, payload: UpdateDrinkRequest): Promise<{ id: string; name: string }> => {
        const { data } = await axiosClient.put<{ id: string; name: string }>(`/drinks/${id}`, payload);
        return data;
    },

    deleteDrink: async (id: string): Promise<void> => {
        await axiosClient.delete(`/drinks/${id}`);
    },

    uploadDrinkImage: async (file: File): Promise<{ imageUrl: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await axiosClient.post<{ imageUrl: string }>('/drinks/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    },

    createIngredient: async (payload: CreateIngredientRequest): Promise<Ingredient> => {
        const { data } = await axiosClient.post<Ingredient>('/ingredients', payload);
        return data;
    },

    getReviews: async (
        drinkId: string,
        pageNumber: number = 1,
        pageSize: number = 8
    ): Promise<PagedResult<ReviewItem>> => {
        const { data } = await axiosClient.get<PagedResult<ReviewItem>>(
            `/drinks/${drinkId}/reviews`,
            {
                params: { pageNumber, pageSize },
            }
        );
        return data;
    },

    upsertReview: async (drinkId: string, rating: number, comment?: string): Promise<void> => {
        await axiosClient.post(`/drinks/${drinkId}/reviews`, { rating, comment });
    },

    deleteReview: async (reviewId: string): Promise<void> => {
        await axiosClient.delete(`/reviews/${reviewId}`);
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
        const { data } = await axiosClient.get<IngredientSuggestion[]>(
            '/ingredients/autocomplete',
            {
                params: { q: query },
            }
        );
        return data;
    },

    getAllIngredients: async (params?: {
        category?: string;
        search?: string;
        limit?: number;
    }): Promise<Ingredient[]> => {
        const { data } = await axiosClient.get<Ingredient[]>('/ingredients', {
            params,
        });
        return data;
    },
};