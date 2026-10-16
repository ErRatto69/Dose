import { create } from 'zustand';
import type { UserProfile } from '@/types';

interface AuthState {
    token: string | null;
    user: UserProfile | null;
    isAuthenticated: boolean;
    setAuth: (token: string, user: UserProfile) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
    const savedToken = localStorage.getItem('dose_token');
    const savedUserJson = localStorage.getItem('dose_user');
    const savedUser = savedUserJson ? JSON.parse(savedUserJson) : null;

    return {
        token: savedToken,
        user: savedUser,
        isAuthenticated: !!savedToken,

        setAuth: (token: string, user: UserProfile) => {
            localStorage.setItem('dose_token', token);
            localStorage.setItem('dose_user', JSON.stringify(user));
            set({ token, user, isAuthenticated: true });
        },

        logout: () => {
            localStorage.removeItem('dose_token');
            localStorage.removeItem('dose_user');
            set({ token: null, user: null, isAuthenticated: false });
        },
    };
});