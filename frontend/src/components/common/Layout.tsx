import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
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
    SlidersHorizontal,
    ChevronRight,
    ChevronDown,
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
    const location = useLocation();
    const [isQuickPourOpen, setIsQuickPourOpen] = useState(false);
    const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
    const [isAdminSheetOpen, setIsAdminSheetOpen] = useState(false);
    const [isDesktopAdminOpen, setIsDesktopAdminOpen] = useState(false);
    const [iconError, setIconError] = useState(false);
    const desktopAdminRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (!isDesktopAdminOpen) return;
        const onMouseDown = (e: MouseEvent) => {
            if (desktopAdminRef.current && !desktopAdminRef.current.contains(e.target as Node)) {
                setIsDesktopAdminOpen(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsDesktopAdminOpen(false);
        };
        document.addEventListener('mousedown', onMouseDown);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isDesktopAdminOpen]);

    const hasAdminAccess = isAdmin(user);
    const isAdminRoute = location.pathname.startsWith('/admin');

    const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';
    const totalWaterCl = bacData?.totalWaterClLast12h ?? 0;
    const waterDisplay = totalWaterCl >= 100
        ? `${(totalWaterCl / 100).toFixed(1)} L`
        : `${Math.round(totalWaterCl)} cl`;

    const currentBac = bacData?.currentBacGramsPerLiter ?? 0;
    const bacStyle = getBacIndicatorStyle(bacData?.safetyLevel, currentBac);

    return (
        <div className="min-h-[100dvh] bg-[#09090b] text-zinc-100 flex flex-col">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-red-600 focus:text-white focus:text-xs focus:font-bold"
            >
                Skip to content
            </a>

            {/* Top Bar */}
            <header className="fixed top-0 left-0 right-0 z-40 bg-[#09090b]/95 border-b border-white/[0.08] backdrop-blur-md pt-[env(safe-area-inset-top)]">
                <div className="max-w-7xl mx-auto h-16 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
                    {/* Brand + Live BAC Telemetry Pill */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <NavLink
                            to="/drinks"
                            className="flex items-center gap-2 shrink-0 rounded-xl py-1 pr-1"
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
                            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                                Dose
                            </span>
                        </NavLink>

                        {bacData && (
                            <Link
                                to="/bac"
                                aria-label={`Live BAC ${currentBac.toFixed(2)} grams per liter`}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#111114] hover:bg-[#18181d] border ${bacStyle.border} text-xs font-bold tabular-nums dose-press shrink-0`}
                            >
                                <span className={`w-2 h-2 rounded-full ${bacStyle.dot}`} aria-hidden="true" />
                                <span className={bacStyle.text}>
                                    {currentBac.toFixed(2)}
                                </span>
                                <span className="hidden sm:inline text-zinc-400 font-medium text-[11px]">g/L</span>
                            </Link>
                        )}
                    </div>

                    {/* Desktop Primary Navigation */}
                    <nav
                        aria-label="Primary navigation"
                        className="hidden md:flex items-center gap-1 bg-[#111114] border border-white/[0.08] p-1 rounded-2xl"
                    >
                        {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 dose-press ${
                                        isActive
                                            ? 'bg-red-600/15 text-red-400 border border-red-600/35'
                                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] border border-transparent'
                                    }`
                                }
                            >
                                <Icon className="w-4 h-4" aria-hidden="true" />
                                <span>{label}</span>
                            </NavLink>
                        ))}

                        {hasAdminAccess && (
                            <div className="relative" ref={desktopAdminRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsDesktopAdminOpen((v) => !v)}
                                    aria-expanded={isDesktopAdminOpen}
                                    aria-haspopup="menu"
                                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 dose-press ${
                                        isAdminRoute
                                            ? 'bg-red-600/15 text-red-400 border border-red-600/35'
                                            : 'text-zinc-300 hover:text-white hover:bg-white/[0.05] border border-transparent'
                                    }`}
                                >
                                    <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Host</span>
                                    <ChevronDown
                                        className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                            isDesktopAdminOpen ? 'rotate-180' : ''
                                        }`}
                                        aria-hidden="true"
                                    />
                                </button>

                                {isDesktopAdminOpen && (
                                    <div
                                        role="menu"
                                        className="absolute right-0 top-full mt-2 w-72 p-1.5 rounded-2xl bg-[#111114] border border-white/12 shadow-2xl z-50 dose-dialog-enter"
                                    >
                                        {ADMIN_NAV.map(({ to, label, description, icon: Icon }) => (
                                            <NavLink
                                                key={to}
                                                to={to}
                                                role="menuitem"
                                                onClick={() => setIsDesktopAdminOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-start gap-3 p-2.5 rounded-xl transition-colors ${
                                                        isActive
                                                            ? 'bg-red-600/15 text-white'
                                                            : 'text-zinc-200 hover:bg-white/[0.06]'
                                                    }`
                                                }
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-[#0c0c0f] border border-white/[0.08] flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                                                    <Icon className="w-4 h-4" aria-hidden="true" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-white leading-tight">
                                                        {label}
                                                    </div>
                                                    <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                                                        {description}
                                                    </div>
                                                </div>
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </nav>

                    {/* Right Utility & Primary Pour Triggers */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {hasAdminAccess && (
                            <button
                                type="button"
                                onClick={() => setIsAdminSheetOpen(true)}
                                aria-label="Open Host Admin menu"
                                className={`md:hidden min-h-[40px] px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1 dose-press ${
                                    isAdminRoute
                                        ? 'bg-red-600/15 border-red-600/45 text-red-300'
                                        : 'bg-[#111114] border-white/10 text-zinc-300'
                                }`}
                            >
                                <ShieldCheck className="w-4 h-4 text-red-400" aria-hidden="true" />
                                <span className="hidden sm:inline">Host</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsWaterModalOpen(true)}
                            aria-label={`Log water hydration, current 12-hour intake ${waterDisplay}`}
                            className="min-h-[40px] px-2.5 sm:px-3 rounded-xl bg-sky-950/60 hover:bg-sky-900/75 border border-sky-500/35 text-sky-200 font-bold text-xs flex items-center gap-1.5 dose-press"
                        >
                            <Droplets className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
                            <span className="hidden lg:inline">Water</span>
                            <span className="text-sky-300 text-[11px] font-bold tabular-nums">
                                {waterDisplay}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsQuickPourOpen(true)}
                            className="min-h-[40px] px-3 sm:px-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center gap-1.5 border border-red-500/50 dose-press"
                        >
                            <Zap className="w-4 h-4 fill-white shrink-0" aria-hidden="true" />
                            <span className="hidden sm:inline">Quick Pour</span>
                            <span className="sm:hidden">Pour</span>
                        </button>

                        {user && (
                            <NavLink
                                to="/profile"
                                aria-label={`Profile settings for ${user.username}`}
                                className="hidden md:flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] dose-press group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-[#09090b] border border-red-600/40 flex items-center justify-center text-xs font-extrabold text-red-400">
                                    {userInitial}
                                </div>
                                <div className="hidden lg:flex flex-col text-left">
                                    <span className="text-xs font-bold text-zinc-200 group-hover:text-white leading-tight max-w-[110px] truncate">
                                        {user.username}
                                    </span>
                                    <span className="text-[11px] text-zinc-400 font-medium leading-tight">
                                        {hasAdminAccess ? 'Host' : user.role}
                                    </span>
                                </div>
                            </NavLink>
                        )}
                    </div>
                </div>
            </header>

            {/* Offset for fixed top bar */}
            <div className="h-16 shrink-0" aria-hidden="true" />

            {/* Semantic BAC Safety Alert */}
            {bacData && (
                <SafetyBanner
                    bacGramsPerLiter={bacData.currentBacGramsPerLiter}
                    safetyLevel={bacData.safetyLevel}
                />
            )}

            {/* Main Content */}
            <main
                id="main-content"
                className="flex-1 pt-5 sm:pt-7 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto"
            >
                <Outlet />
            </main>

            {/* Mobile 5-Tab Bottom Bar */}
            <nav
                aria-label="Mobile navigation"
                className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09090b]/95 border-t border-white/[0.08] backdrop-blur-lg pb-[env(safe-area-inset-bottom)]"
            >
                <div className="grid grid-cols-5 h-16 px-1">
                    {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `relative flex flex-col items-center justify-center min-h-[44px] gap-1 text-[11px] dose-press ${
                                    isActive
                                        ? 'text-red-400 font-bold'
                                        : 'text-zinc-400 hover:text-zinc-200 font-medium'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <span
                                            className="absolute top-0 w-7 h-0.5 rounded-full bg-red-500"
                                            aria-hidden="true"
                                        />
                                    )}
                                    <Icon
                                        className={`w-5 h-5 ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`}
                                        aria-hidden="true"
                                    />
                                    <span className="leading-none truncate max-w-[68px]">{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Mobile Admin Switcher Sheet */}
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
