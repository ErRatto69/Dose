import { axiosClient } from './axiosClient';
import type { AuthResponse } from '@/types';

export const authApi = {
    login: async (identifier: string, password: string): Promise<AuthResponse> => {
        const { data } = await axiosClient.post<AuthResponse>('/auth/login', {
            identifier,
            password,
        });
        return data;
    },
};