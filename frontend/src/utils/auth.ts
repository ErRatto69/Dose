import type { UserProfile } from '@/types';

export const isAdmin = (user?: UserProfile | null): boolean => {
    if (!user) return false;
    return user.role === 'Admin' || String(user.role) === '0';
};

export const isBartender = (user?: UserProfile | null): boolean => {
    if (!user) return false;
    return user.role === 'Bartender' || String(user.role) === '1';
};

export const canManageCocktails = (user?: UserProfile | null): boolean => {
    return isAdmin(user) || isBartender(user);
};