import { axiosClient } from './axiosClient';
import type { CocktailDbSyncStatus } from '@/types';

export const syncApi = {
    startCocktailDbSync: async (): Promise<{ message: string }> => {
        const { data } = await axiosClient.post<{ message: string }>('/admin/sync/cocktaildb');
        return data;
    },

    getCocktailDbSyncStatus: async (): Promise<CocktailDbSyncStatus> => {
        const { data } = await axiosClient.get<CocktailDbSyncStatus>('/admin/sync/cocktaildb/status');
        return data;
    },
};