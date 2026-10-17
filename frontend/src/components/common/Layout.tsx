import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
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
} from 'lucide-react';

export const Layout: React.FC = () => {
    const { user, logout } = useAuthStore();
    const queryClient = useQueryClient();
    const [isQuickPourOpen, setIsQuickPourOpen] = useState(false);

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
                { to: '/admin/safety', label: 'Safety', icon: ShieldCheck },
            ]
            : []),
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* TopBar */}
            <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
                    {/* Brand Logo */}
                    <NavLink to="/drinks" className="flex items-center gap-2.5 shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                            <Wine className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-lg font-black tracking-tight text-white flex items-center gap-1">
                                Dose
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                            </span>
                            <p className="text-[10px] text-slate-400 font-medium -mt-1">Bar Tracker</p>
                        </div>
                    </NavLink>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 border border-slate-800/90 p-1 rounded-2xl">
                        {navItems.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                        isActive
                                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                                    }`
                                }
                            >
                                <Icon className="w-4 h-4" />
                                <span>{label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* Right Controls */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsQuickPourOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 border border-amber-500/40 text-amber-400 hover:text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                            title="Log a Quick Shot, Beer, or Custom Mix"
                        >
                            <Zap className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Quick Pour</span>
                        </button>

                        <UnitTogglePill />

                        {user && (
                            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                                <NavLink
                                    to="/profile"
                                    className="hidden sm:flex flex-col text-right hover:opacity-80 transition-opacity"
                                >
                                    <span className="text-xs font-bold text-slate-200 leading-tight">
                                        {user.username}
                                    </span>
                                    <span className="text-[10px] text-amber-400 font-medium">
                                        {isAdmin ? 'Admin' : user.role}
                                    </span>
                                </NavLink>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-colors"
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
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-lg px-1 flex items-center justify-around">
                {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center flex-1 py-1 transition-all select-none ${
                                isActive
                                    ? 'text-amber-400 font-bold'
                                    : 'text-slate-400 hover:text-slate-200 font-medium'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-amber-500/10' : ''}`}>
                                    <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                                </div>
                                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[54px]">
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