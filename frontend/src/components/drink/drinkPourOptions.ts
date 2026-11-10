import type { StomachState } from '@/types';

export const POUR_MULTIPLIERS = [
    { mult: 0.5, label: 'Half', tag: '0.5×' },
    { mult: 1.0, label: 'Standard', tag: '1×' },
    { mult: 1.5, label: 'Strong', tag: '1.5×' },
    { mult: 2.0, label: 'Double', tag: '2×' },
] as const;

export const STOMACH_OPTIONS: ReadonlyArray<{
    value: StomachState;
    label: string;
    desc: string;
}> = [
    { value: 'Empty', label: 'Empty', desc: '+10% peak' },
    { value: 'LightSnack', label: 'Light Snack', desc: 'Standard' },
    { value: 'FullMeal', label: 'Full Meal', desc: '-22% peak' },
];

export const getStomachLabel = (value: StomachState): string => {
    return STOMACH_OPTIONS.find((s) => s.value === value)?.label ?? 'Light Snack';
};
