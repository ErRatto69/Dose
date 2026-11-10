import { axiosClient } from './axiosClient';
import type {
    UserProfile,
    UpdateBiometricsRequest,
    CreateUserAdminRequest,
    UpdateUserAdminRequest,
    PagedResult,
    RegistrationRequestItem,
    ReviewItem,
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

    getMyReviews: async (
        pageNumber: number = 1,
        pageSize: number = 8
    ): Promise<PagedResult<ReviewItem>> => {
        const { data } = await axiosClient.get<PagedResult<ReviewItem>>('/users/me/reviews', {
            params: { pageNumber, pageSize },
        });
        return data;
    },

    getAllUsers: async (params?: {
        pageNumber?: number;
        pageSize?: number;
        search?: string;
    }): Promise<PagedResult<UserProfile>> => {
        const { data } = await axiosClient.get<PagedResult<UserProfile>>('/users', {
            params,
        });
        return data;
    },

    getRegistrationRequests: async (params?: {
        pageNumber?: number;
        pageSize?: number;
    }): Promise<PagedResult<RegistrationRequestItem>> => {
        const { data } = await axiosClient.get<PagedResult<RegistrationRequestItem>>(
            '/users/registration-requests',
            { params }
        );
        return data;
    },

    approveRegistrationRequest: async (id: string): Promise<UserProfile> => {
        const { data } = await axiosClient.post<UserProfile>(
            `/users/registration-requests/${id}/approve`
        );
        return data;
    },

    rejectRegistrationRequest: async (id: string): Promise<void> => {
        await axiosClient.delete(`/users/registration-requests/${id}`);
    },

    getAdminReviews: async (params?: {
        userId?: string;
        search?: string;
        pageNumber?: number;
        pageSize?: number;
    }): Promise<PagedResult<ReviewItem>> => {
        const { data } = await axiosClient.get<PagedResult<ReviewItem>>('/admin/reviews', {
            params,
        });
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