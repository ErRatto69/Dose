import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { UnitTogglePill } from './UnitTogglePill';
import { SafetyBanner } from '@/components/safety/SafetyBanner';
import { Wine, Sparkles, Activity, Trophy, ShieldCheck, LogOut } from 'lucide-react';

export const Layout: React.FC = () => {
    const { user, logout } = useAuthStore();

    const { data: bacData } = useQuery({
        queryKey: ['my-bac-status'],
        queryFn: bacApi.getMyBac,
        refetchInterval: 30000,
    });

    const navItems = [
        { to: '/drinks', label: 'Catalog', icon: Wine },
        { to: '/cabinet', label: 'Cabinet', icon: Sparkles },
        { to: '/bac', label: 'My BAC', icon: Activity },
        { to: '/leaderboard', label: 'Ranks', icon: Trophy },
        ...(user?.role === 'Admin'
            ? [{ to: '/admin/safety', label: 'Safety', icon: ShieldCheck }]
            : []),
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* TopBar */}
            <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
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
                </div>

                <div className="flex items-center gap-2.5">
                    <UnitTogglePill />

                    {user && (
                        <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
              <span className="text-xs font-semibold text-slate-300 hidden sm:inline-block">
                {user.username}
              </span>
                            <button
                                type="button"
                                onClick={logout}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-colors"
                                title="Sign out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    )}
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
            <main className="flex-1 pt-16 pb-20 px-4 max-w-md w-full mx-auto">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-lg px-2 flex items-center justify-around">
                {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center flex-1 py-1.5 transition-all select-none ${
                                isActive
                                    ? 'text-amber-400 font-bold'
                                    : 'text-slate-400 hover:text-slate-200 font-medium'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-amber-500/10' : ''}`}>
                                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                                </div>
                                <span className="text-[10px] mt-0.5 tracking-tight">{label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};