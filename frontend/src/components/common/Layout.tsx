import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { usersApi } from '@/api/users.api';
import { SafetyBanner } from '@/components/safety/SafetyBanner';
import { QuickCustomDrinkModal } from '@/components/drink/QuickCustomDrinkModal';
import { LogWaterModal } from '@/components/safety/LogWaterModal';
import {
    Wine,
    Sparkles,
    Activity,
    Trophy,
    ShieldCheck,
    Users,
    UserCircle,
    Zap,
    MessageSquare,
    Droplets,
} from 'lucide-react';

export const Layout: React.FC = () => {
    const { user } = useAuthStore();
    const [isQuickPourOpen, setIsQuickPourOpen] = useState(false);
    const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
    const [iconError, setIconError] = useState(false);

    const appIconUrl = `${import.meta.env.BASE_URL}icons/icon-192.png`;

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

    const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';
    const totalWaterCl = bacData?.totalWaterClLast12h ?? 0;
    const waterDisplay = totalWaterCl >= 100
        ? `${(totalWaterCl / 100).toFixed(1)} L`
        : `${Math.round(totalWaterCl)} cl`;

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
            {/* TopBar */}
            <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-neutral-950/95 border-b border-neutral-800/90 backdrop-blur-md">
                <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-3">
                    {/* Brand Logo */}
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

                    {/* Right Controls: Log Water Modal Trigger + Quick Pour + User Pill */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsWaterModalOpen(true)}
                            className="px-2.5 sm:px-3 py-2 rounded-xl bg-sky-950/70 hover:bg-sky-900/90 border border-sky-600/40 hover:border-sky-500 text-sky-200 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                            title="Log water hydration"
                        >
                            <Droplets className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
                            <span className="hidden sm:inline">Water</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-mono font-bold">
                                {waterDisplay}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsQuickPourOpen(true)}
                            className="px-3 sm:px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/30 border border-red-500/50 transition-all active:scale-95"
                        >
                            <Zap className="w-4 h-4 fill-white" />
                            <span>Quick Pour</span>
                        </button>

                        {user && (
                            <NavLink
                                to="/profile"
                                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-all group"
                                title="View Profile & Settings"
                            >
                                <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-red-600/40 flex items-center justify-center text-xs font-black text-red-400 group-hover:border-red-500 transition-colors">
                                    {userInitial}
                                </div>
                                <div className="hidden sm:flex flex-col text-left">
                                    <span className="text-xs font-bold text-neutral-200 group-hover:text-white leading-tight">
                                        {user.username}
                                    </span>
                                    <span className="text-[10px] text-neutral-400 font-medium">
                                        {isAdmin ? 'Admin' : user.role}
                                    </span>
                                </div>
                            </NavLink>
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

            <LogWaterModal
                isOpen={isWaterModalOpen}
                onClose={() => setIsWaterModalOpen(false)}
            />
        </div>
    );
};