import { axiosClient } from './axiosClient';
import type {
    BacStatus,
    DrinkLogResponse,
    LogDrinkRequest,
    LogCustomDrinkRequest,
    UpdateDrinkLogRequest,
    MonthlyLeaderboardResponse,
    AdminBacOverviewPagedResponse,
} from '@/types';

export const bacApi = {
    getMyBac: async (): Promise<BacStatus> => {
        const { data } = await axiosClient.get<BacStatus>('/users/me/bac');
        return data;
    },

    logDrink: async (drinkId: string, payload: LogDrinkRequest): Promise<DrinkLogResponse> => {
        const { data } = await axiosClient.post<DrinkLogResponse>(
            `/drinks/${drinkId}/log`,
            payload
        );
        return data;
    },

    logCustomDrink: async (payload: LogCustomDrinkRequest): Promise<DrinkLogResponse> => {
        const { data } = await axiosClient.post<DrinkLogResponse>('/drinks/custom/log', payload);
        return data;
    },

    updateDrinkLog: async (
        logId: string,
        payload: UpdateDrinkLogRequest
    ): Promise<DrinkLogResponse> => {
        const { data } = await axiosClient.put<DrinkLogResponse>(
            `/drinks/logs/${logId}`,
            payload
        );
        return data;
    },

    deleteDrinkLog: async (logId: string): Promise<void> => {
        await axiosClient.delete(`/drinks/logs/${logId}`);
    },

    getLeaderboard: async (period?: string): Promise<MonthlyLeaderboardResponse> => {
        const { data } = await axiosClient.get<MonthlyLeaderboardResponse>('/leaderboard', {
            params: { period },
        });
        return data;
    },

    getAdminBacOverview: async (params?: {
        pageNumber?: number;
        pageSize?: number;
        search?: string;
    }): Promise<AdminBacOverviewPagedResponse> => {
        const { data } = await axiosClient.get<AdminBacOverviewPagedResponse>(
            '/admin/users/bac-overview',
            { params }
        );
        return data;
    },
};