import React, { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { usersApi } from '@/api/users.api';
import { queryKeys } from '@/api/queryKeys';
import { SafetyBanner } from '@/components/safety/SafetyBanner';
import { QuickCustomDrinkModal } from '@/components/drink/QuickCustomDrinkModal';
import { LogWaterModal } from '@/components/safety/LogWaterModal';
import { ModalShell } from '@/components/common/ModalShell';
import { isAdmin } from '@/utils/auth';
import type { BacSafetyLevel } from '@/types';
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
    ChevronRight,
} from 'lucide-react';

const PRIMARY_NAV = [
    { to: '/drinks', label: 'Catalog', icon: Wine },
    { to: '/cabinet', label: 'Cabinet', icon: Sparkles },
    { to: '/bac', label: 'My BAC', icon: Activity },
    { to: '/leaderboard', label: 'Ranks', icon: Trophy },
    { to: '/profile', label: 'Profile', icon: UserCircle },
] as const;

const ADMIN_NAV = [
    {
        to: '/admin/safety',
        label: 'Party Safety Monitor',
        description: 'Live guest BAC status and sobriety estimates',
        icon: ShieldCheck,
    },
    {
        to: '/admin/users',
        label: 'Users & Access Requests',
        description: 'Manage accounts, roles, and pending approvals',
        icon: Users,
    },
    {
        to: '/admin/reviews',
        label: 'Reviews Moderation',
        description: 'Review and moderate community tasting notes',
        icon: MessageSquare,
    },
] as const;

const getBacIndicatorStyle = (level?: BacSafetyLevel | number, bac = 0) => {
    const normalized = String(level ?? '');
    if (bac <= 0 || normalized === 'Sober' || normalized === '0') {
        return { dot: 'bg-zinc-400', text: 'text-zinc-200', border: 'border-white/10' };
    }
    if (normalized === 'Safe' || normalized === '1') {
        return { dot: 'bg-emerald-400', text: 'text-emerald-300', border: 'border-emerald-500/35' };
    }
    if (normalized === 'Caution' || normalized === '2') {
        return { dot: 'bg-amber-400', text: 'text-amber-300', border: 'border-amber-500/40' };
    }
    if (normalized === 'Warning' || normalized === '3') {
        return { dot: 'bg-orange-400', text: 'text-orange-300', border: 'border-orange-500/40' };
    }
    return { dot: 'bg-red-500', text: 'text-red-300', border: 'border-red-500/45' };
};

export const Layout: React.FC = () => {
    const { user } = useAuthStore();
    const [isQuickPourOpen, setIsQuickPourOpen] = useState(false);
    const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
    const [isAdminSheetOpen, setIsAdminSheetOpen] = useState(false);
    const [iconError, setIconError] = useState(false);

    const appIconUrl = `${import.meta.env.BASE_URL}icons/icon-192.png`;

    useQuery({
        queryKey: ['session-check', user?.id],
        queryFn: usersApi.getMe,
        refetchInterval: 30000,
        enabled: !!user,
    });

    const { data: bacData } = useQuery({
        queryKey: queryKeys.bac.me(),
        queryFn: bacApi.getMyBac,
        refetchInterval: 30000,
        enabled: !!user,
    });

    const hasAdminAccess = isAdmin(user);
    const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';
    const totalWaterCl = bacData?.totalWaterClLast12h ?? 0;
    const waterDisplay = totalWaterCl >= 100
        ? `${(totalWaterCl / 100).toFixed(1)} L`
        : `${Math.round(totalWaterCl)} cl`;

    const currentBac = bacData?.currentBacGramsPerLiter ?? 0;
    const bacStyle = getBacIndicatorStyle(bacData?.safetyLevel, currentBac);

    return (
        <div className="min-h-[100dvh] bg-[#09090b] text-zinc-100 flex">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-red-600 focus:text-white focus:text-xs focus:font-bold"
            >
                Skip to content
            </a>

            {/* Desktop Fixed Left Sidebar Rail */}
            <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-60 bg-[#0b0b0e] border-r border-white/[0.08] flex-col justify-between p-4">
                <div className="space-y-6">
                    <NavLink
                        to="/drinks"
                        className="flex items-center gap-2.5 px-2 py-1 rounded-xl"
                        translate="no"
                    >
                        {!iconError ? (
                            <img
                                src={appIconUrl}
                                alt="Dose"
                                width={36}
                                height={36}
                                onError={() => setIconError(true)}
                                className="w-9 h-9 rounded-xl object-cover border border-red-600/45 bg-[#09090b]"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-600/45 flex items-center justify-center text-red-500">
                                <Wine className="w-5 h-5" aria-hidden="true" />
                            </div>
                        )}
                        <div>
                            <span className="font-display text-2xl font-extrabold tracking-wide text-white leading-none block">
                                DOSE
                            </span>
                            <span className="text-[11px] text-zinc-400 font-medium leading-none mt-0.5 block">
                                Bar Telemetry
                            </span>
                        </div>
                    </NavLink>

                    <nav aria-label="Primary navigation" className="space-y-1">
                        {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 dose-press ${
                                        isActive
                                            ? 'bg-red-600/15 text-red-300 border border-red-500/35'
                                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
                                    }`
                                }
                            >
                                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                                <span>{label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {hasAdminAccess && (
                        <div className="pt-4 border-t border-white/[0.08] space-y-1.5">
                            <span className="px-3 text-[11px] font-bold text-zinc-400 block">
                                Host Console
                            </span>
                            {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    className={({ isActive }) =>
                                        `min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 dose-press ${
                                            isActive
                                                ? 'bg-red-600/15 text-red-300 border border-red-500/35'
                                                : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
                                        }`
                                    }
                                >
                                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                                    <span className="truncate">{label}</span>
                                </NavLink>
                            ))}
                        </div>
                    )}
                </div>

                {user && (
                    <NavLink
                        to="/profile"
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] dose-press"
                    >
                        <div className="w-8 h-8 rounded-lg bg-[#09090b] border border-red-600/45 flex items-center justify-center text-xs font-extrabold text-red-400 shrink-0">
                            {userInitial}
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{user.username}</div>
                            <div className="text-[11px] text-zinc-400">{hasAdminAccess ? 'Host' : user.role}</div>
                        </div>
                    </NavLink>
                )}
            </aside>

            {/* Right Main App Column */}
            <div className="flex-1 flex flex-col min-w-0 md:pl-60">
                {/* Flush Translucent Top Bar */}
                <header className="sticky top-0 z-30 bg-[#09090b]/85 border-b border-white/[0.07] backdrop-blur-xl pt-[env(safe-area-inset-top)]">
                    <div className="max-w-6xl mx-auto h-14 px-3.5 sm:px-6 flex items-center justify-between gap-2">
                        {/* Left: Mobile Logo + Live BAC Pill */}
                        <div className="flex items-center gap-2 min-w-0">
                            <NavLink
                                to="/drinks"
                                className="md:hidden flex items-center gap-2 shrink-0 rounded-xl py-1"
                                translate="no"
                            >
                                {!iconError ? (
                                    <img
                                        src={appIconUrl}
                                        alt="Dose"
                                        width={32}
                                        height={32}
                                        onError={() => setIconError(true)}
                                        className="w-8 h-8 rounded-lg object-cover border border-red-600/45 bg-[#09090b]"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-lg bg-red-600/15 border border-red-600/45 flex items-center justify-center text-red-500">
                                        <Wine className="w-4 h-4" aria-hidden="true" />
                                    </div>
                                )}
                                <span className="font-display text-xl font-extrabold tracking-wide text-white leading-none">
                                    DOSE
                                </span>
                            </NavLink>

                            {bacData && (
                                <Link
                                    to="/bac"
                                    aria-label={`Live BAC ${currentBac.toFixed(2)} grams per liter`}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#111114] hover:bg-[#18181d] border ${bacStyle.border} text-xs font-bold tabular-nums dose-press shrink-0`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${bacStyle.dot}`} aria-hidden="true" />
                                    <span className={bacStyle.text}>{currentBac.toFixed(2)}</span>
                                    <span className="text-zinc-400 font-semibold text-[11px]">g/L</span>
                                </Link>
                            )}
                        </div>

                        {/* Right: Host Sheet (Mobile) + Water + Quick Pour Pill */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            {hasAdminAccess && (
                                <button
                                    type="button"
                                    onClick={() => setIsAdminSheetOpen(true)}
                                    aria-label="Open Host Admin menu"
                                    className="md:hidden w-10 h-10 rounded-full bg-[#111114] border border-white/10 text-red-400 flex items-center justify-center dose-press"
                                >
                                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setIsWaterModalOpen(true)}
                                aria-label={`Log water hydration, current 12-hour intake ${waterDisplay}`}
                                className="min-h-[38px] px-2.5 sm:px-3.5 rounded-full bg-sky-950/65 hover:bg-sky-900/75 border border-sky-500/35 text-sky-200 font-bold text-xs flex items-center gap-1.5 dose-press"
                            >
                                <Droplets className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
                                <span className="hidden sm:inline">Water</span>
                                <span className="text-sky-300 text-[11px] font-bold tabular-nums">
                                    {waterDisplay}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsQuickPourOpen(true)}
                                className="min-h-[38px] px-3.5 sm:px-4 rounded-full bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center gap-1.5 border border-red-400/40 dose-press"
                            >
                                <Zap className="w-3.5 h-3.5 fill-white shrink-0" aria-hidden="true" />
                                <span className="hidden sm:inline">Quick Pour</span>
                                <span className="sm:hidden">Pour</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* BAC Safety Alert */}
                {bacData && (
                    <SafetyBanner
                        bacGramsPerLiter={bacData.currentBacGramsPerLiter}
                        safetyLevel={bacData.safetyLevel}
                    />
                )}

                {/* Main Content */}
                <main
                    id="main-content"
                    className="flex-1 pt-4 sm:pt-7 pb-[calc(6.25rem+env(safe-area-inset-bottom))] md:pb-12 px-4 sm:px-6 max-w-6xl w-full mx-auto"
                >
                    <Outlet />
                </main>
            </div>

            {/* Mobile Floating Glass Dock (5 Primary Tabs) */}
            <nav
                aria-label="Mobile navigation"
                className="md:hidden pointer-events-none fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))]"
            >
                <div className="pointer-events-auto mx-auto max-w-md h-16 rounded-2xl bg-[#111115]/92 border border-white/[0.12] backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.7)] grid grid-cols-5 items-center px-1.5 gap-1">
                    {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `relative flex flex-col items-center justify-center h-12 rounded-xl gap-0.5 text-[11px] dose-press ${
                                    isActive
                                        ? 'bg-red-600/18 text-red-400 font-extrabold border border-red-500/30'
                                        : 'text-zinc-400 hover:text-zinc-200 font-medium border border-transparent'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon
                                        className={`w-[18px] h-[18px] ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`}
                                        aria-hidden="true"
                                    />
                                    <span className="leading-none truncate max-w-[60px]">{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Mobile Admin Sheet */}
            {hasAdminAccess && (
                <ModalShell
                    isOpen={isAdminSheetOpen}
                    onClose={() => setIsAdminSheetOpen(false)}
                    title="Host Console"
                    subtitle="Manage guests, tasting moderation, and live party safety."
                    maxWidthClass="max-w-md"
                >
                    <div className="space-y-2.5">
                        {ADMIN_NAV.map(({ to, label, description, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                onClick={() => setIsAdminSheetOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center justify-between gap-3 p-3.5 rounded-2xl border min-h-[56px] dose-press ${
                                        isActive
                                            ? 'bg-red-600/15 border-red-600/45 text-white'
                                            : 'bg-[#0c0c0f] border-white/[0.08] text-zinc-200 hover:border-white/20'
                                    }`
                                }
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-[#111114] border border-white/[0.08] flex items-center justify-center text-red-400 shrink-0">
                                        <Icon className="w-5 h-5" aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-white truncate">{label}</div>
                                        <div className="text-xs text-zinc-400 truncate">{description}</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" aria-hidden="true" />
                            </NavLink>
                        ))}
                    </div>
                </ModalShell>
            )}

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
