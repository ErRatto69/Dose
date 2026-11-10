import React from 'react';
import type { MonthlyBadge } from '@/types';
import {
    Anchor,
    Award,
    Droplets,
    Flame,
    Leaf,
    ShieldCheck,
    Sparkles,
    Sun,
    Zap,
} from 'lucide-react';

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    sparkles: Sparkles,
    leaf: Leaf,
    anchor: Anchor,
    sun: Sun,
    flame: Flame,
    droplets: Droplets,
    'shield-check': ShieldCheck,
    zap: Zap,
};

const TONE_CLASSES: Record<string, string> = {
    sky: 'bg-sky-500/15 border-sky-500/35 text-sky-300',
    emerald: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300',
    amber: 'bg-amber-500/15 border-amber-500/35 text-amber-300',
    orange: 'bg-orange-500/15 border-orange-500/35 text-orange-300',
    rose: 'bg-rose-500/15 border-rose-500/35 text-rose-300',
    cyan: 'bg-cyan-500/15 border-cyan-500/35 text-cyan-300',
    violet: 'bg-red-500/15 border-red-500/35 text-red-300',
};

interface MonthlyBadgeChipProps {
    badge: MonthlyBadge;
}

export const MonthlyBadgeChip: React.FC<MonthlyBadgeChipProps> = ({ badge }) => {
    const Icon = BADGE_ICONS[badge.icon] || Award;
    const toneClass =
        TONE_CLASSES[badge.tone] ?? 'bg-white/[0.06] border-white/15 text-zinc-200';

    return (
        <span
            title={badge.description}
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${toneClass}`}
        >
            <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>{badge.title}</span>
        </span>
    );
};
