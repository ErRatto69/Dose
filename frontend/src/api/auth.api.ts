import { axiosClient } from './axiosClient';
import type { AuthResponse, CreateRegistrationRequestPayload } from '@/types';

export const authApi = {
    login: async (identifier: string, password: string): Promise<AuthResponse> => {
        const { data } = await axiosClient.post<AuthResponse>('/auth/login', {
            identifier,
            password,
        });
        return data;
    },

    submitRegistrationRequest: async (
        payload: CreateRegistrationRequestPayload
    ): Promise<{ message: string }> => {
        const { data } = await axiosClient.post<{ message: string }>(
            '/auth/register-request',
            payload
        );
        return data;
    },
};