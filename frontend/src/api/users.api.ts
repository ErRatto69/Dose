import { axiosClient } from './axiosClient';
import type {
    UserProfile,
    UpdateBiometricsRequest,
    CreateUserAdminRequest,
    UpdateUserAdminRequest,
} from '@/types';

export const usersApi = {
    getMe: async (): Promise<UserProfile> => {
        const { data } = await axiosClient.get<UserProfile>('/users/me');
        return data;
    },

    updateMyBiometrics: async (payload: UpdateBiometricsRequest): Promise<UserProfile> => {
        const { data } = await axiosClient.put<UserProfile>('/users/me/biometrics', payload);
        return data;
    },

    getAllUsers: async (): Promise<UserProfile[]> => {
        const { data } = await axiosClient.get<UserProfile[]>('/users');
        return data;
    },

    createUser: async (payload: CreateUserAdminRequest): Promise<UserProfile> => {
        const { data } = await axiosClient.post<UserProfile>('/users', payload);
        return data;
    },

    updateUser: async (id: string, payload: UpdateUserAdminRequest): Promise<UserProfile> => {
        const { data } = await axiosClient.put<UserProfile>(`/users/${id}`, payload);
        return data;
    },

    deleteUser: async (id: string): Promise<void> => {
        await axiosClient.delete(`/users/${id}`);
    },
};