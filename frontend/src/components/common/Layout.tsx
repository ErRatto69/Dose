import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { usersApi } from '@/api/users.api';
import { UnitTogglePill } from './UnitTogglePill';
import { SafetyBanner } from '@/components/safety/SafetyBanner';
import { QuickCustomDrinkModal } from '@/components/drink/QuickCustomDrinkModal';
import {
    Wine,
    Sparkles,
    Activity,
    Trophy,
    ShieldCheck,
    Users,
    UserCircle,
    LogOut,
    Zap,
    MessageSquare,
} from 'lucide-react';

export const Layout: React.FC = () => {
    const { user, logout } = useAuthStore();
    const queryClient = useQueryClient();
    const [isQuickPourOpen, setIsQuickPourOpen] = useState(false);
    const [iconError, setIconError] = useState(false);

    const appIconUrl = `${import.meta.env.BASE_URL}icons/icon-192.png`;

    // Verify active session status periodically so disabled users are logged out immediately
    useQuery({
        queryKey: ['session-check', user?.id],
        queryFn: usersApi.getMe,
        refetchInterval: 30000,
        enabled: !!user,
    });

    const { data: bacData } = useQuery({
        queryKey: ['my-bac-status', user?.id],
        queryFn: bacApi.getMyBac,
        refetchInterval: 30000,
        enabled: !!user,
    });

    const handleLogout = () => {
        queryClient.clear();
        logout();
    };

    const isAdmin = user?.role === 'Admin' || String(user?.role) === '0';

    const navItems = [
        { to: '/drinks', label: 'Catalog', icon: Wine },
        { to: '/cabinet', label: 'Cabinet', icon: Sparkles },
        { to: '/bac', label: 'My BAC', icon: Activity },
        { to: '/leaderboard', label: 'Ranks', icon: Trophy },
        { to: '/profile', label: 'Profile', icon: UserCircle },
        ...(isAdmin
            ? [
                { to: '/admin/users', label: 'Users', icon: Users },
                { to: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
                { to: '/admin/safety', label: 'Safety', icon: ShieldCheck },
            ]
            : []),
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
            {/* TopBar */}
            <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-neutral-950/95 border-b border-neutral-800/90 backdrop-blur-md">
                <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
                    {/* Brand Logo (App Icon + Dose without subtitle) */}
                    <NavLink to="/drinks" className="flex items-center gap-2.5 shrink-0">
                        {!iconError ? (
                            <img
                                src={appIconUrl}
                                alt="Dose"
                                onError={() => setIconError(true)}
                                className="w-9 h-9 rounded-xl object-cover border border-red-600/40 shadow-sm"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-600/40 flex items-center justify-center text-red-500">
                                <Wine className="w-5 h-5" />
                            </div>
                        )}
                        <span className="text-xl font-black tracking-tight text-white flex items-center gap-1">
                            Dose
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
                        </span>
                    </NavLink>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden md:flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-2xl">
                        {navItems.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                        isActive
                                            ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                                            : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/70'
                                    }`
                                }
                            >
                                <Icon className="w-4 h-4" />
                                <span>{label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* Right Controls: High-Visibility Quick Pour on both Mobile & Desktop */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsQuickPourOpen(true)}
                            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/30 border border-red-500/50 transition-all active:scale-95"
                        >
                            <Zap className="w-4 h-4 fill-white" />
                            <span>Quick Pour</span>
                        </button>

                        <UnitTogglePill />

                        {user && (
                            <div className="flex items-center gap-2 pl-1.5 border-l border-neutral-800">
                                <NavLink
                                    to="/profile"
                                    className="hidden sm:flex flex-col text-right hover:opacity-80 transition-opacity"
                                >
                                    <span className="text-xs font-bold text-neutral-200 leading-tight">
                                        {user.username}
                                    </span>
                                    <span className="text-[10px] text-red-500 font-semibold">
                                        {isAdmin ? 'Admin' : user.role}
                                    </span>
                                </NavLink>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="p-2 rounded-xl text-neutral-400 hover:text-red-400 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors"
                                    title="Sign out"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Safety Alert Banner */}
            {bacData && (
                <SafetyBanner
                    bacGramsPerLiter={bacData.currentBacGramsPerLiter}
                    safetyLevel={bacData.safetyLevel}
                />
            )}

            {/* Main Content Container */}
            <main className="flex-1 pt-20 pb-24 md:pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-neutral-950/95 border-t border-neutral-800/90 backdrop-blur-lg px-1 flex items-center justify-around overflow-x-auto">
                {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center flex-1 min-w-[46px] py-1 transition-all select-none ${
                                isActive
                                    ? 'text-red-500 font-bold'
                                    : 'text-neutral-400 hover:text-neutral-200 font-medium'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div
                                    className={`p-1 rounded-xl transition-all ${
                                        isActive ? 'bg-red-600/15' : ''
                                    }`}
                                >
                                    <Icon
                                        className={`w-4 h-4 ${
                                            isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'
                                        }`}
                                    />
                                </div>
                                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[52px]">
                                    {label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <QuickCustomDrinkModal
                isOpen={isQuickPourOpen}
                onClose={() => setIsQuickPourOpen(false)}
            />
        </div>
    );
};