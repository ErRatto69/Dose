import { axiosClient } from './axiosClient';
import type { AchievementPassportResponse, MonthlyBadgesResponse } from '@/types';

export const gamificationApi = {
    getMonthlyBadges: async (period?: string): Promise<MonthlyBadgesResponse> => {
        const { data } = await axiosClient.get<MonthlyBadgesResponse>('/badges/monthly', {
            params: period ? { period } : undefined,
        });
        return data;
    },

    getAchievementPassport: async (): Promise<AchievementPassportResponse> => {
        const { data } = await axiosClient.get<AchievementPassportResponse>('/achievements/passport');
        return data;
    },
};
