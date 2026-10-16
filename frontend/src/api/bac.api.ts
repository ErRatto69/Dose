import { axiosClient } from './axiosClient';
import type {
    BacStatus,
    DrinkLogResponse,
    LogDrinkRequest,
    MonthlyLeaderboardResponse,
    AdminUserBacOverview,
} from '@/types';

export const bacApi = {
    getMyBac: async (): Promise<BacStatus> => {
        const { data } = await axiosClient.get<BacStatus>('/users/me/bac');
        return data;
    },

    logDrink: async (drinkId: string, payload: LogDrinkRequest): Promise<DrinkLogResponse> => {
        const { data } = await axiosClient.post<DrinkLogResponse>(`/drinks/${drinkId}/log`, payload);
        return data;
    },

    getLeaderboard: async (period?: string): Promise<MonthlyLeaderboardResponse> => {
        const { data } = await axiosClient.get<MonthlyLeaderboardResponse>('/leaderboard', {
            params: { period },
        });
        return data;
    },

    getAdminBacOverview: async (): Promise<AdminUserBacOverview[]> => {
        const { data } = await axiosClient.get<AdminUserBacOverview[]>('/admin/users/bac-overview');
        return data;
    },
};