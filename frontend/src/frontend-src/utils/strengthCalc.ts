import type { IngredientCategory, DrinkMetrics } from '@/types';

export interface ComponentMetricInput {
    category: IngredientCategory;
    amountCl: number;
    abvPercent: number;
}

export const calculateStrengthMetrics = (components: ComponentMetricInput[]): DrinkMetrics => {
    const liquids = components.filter((c) => c.category !== 'Garnish' && c.amountCl > 0);
    const totalVolumeCl = liquids.reduce((acc, c) => acc + c.amountCl, 0);

    if (totalVolumeCl <= 0) {
        return {
            totalVolumeCl: 0,
            totalVolumeOz: 0,
            abvPercent: 0,
            pureAlcoholGrams: 0,
            bottleScore1To10: 1,
            bottleVisualRating: 0.5,
        };
    }

    const pureEtOHCl = liquids.reduce((acc, c) => acc + c.amountCl * (c.abvPercent / 100), 0);
    const finalAbv = Number(((pureEtOHCl / totalVolumeCl) * 100).toFixed(2));
    const pureAlcoholGrams = Number((pureEtOHCl * 10 * 0.789).toFixed(2));

    const normalizedAbv = Math.min(Math.max(finalAbv / 35.0, 0), 1);
    const normalizedGrams = Math.min(Math.max(pureAlcoholGrams / 28.0, 0), 1);
    const composite = normalizedAbv * 0.7 + normalizedGrams * 0.3;

    const score1To10 = finalAbv === 0 ? 1 : Math.min(Math.max(Math.ceil(composite * 10), 1), 10);
    const rawBottles = Math.min(Math.max(composite * 5, 0.25), 5.0);
    const quarterBottleRating = Math.round(rawBottles * 4) / 4;

    return {
        totalVolumeCl: Number(totalVolumeCl.toFixed(2)),
        totalVolumeOz: Number((totalVolumeCl * 0.33814).toFixed(2)),
        abvPercent: finalAbv,
        pureAlcoholGrams,
        bottleScore1To10: score1To10,
        bottleVisualRating: quarterBottleRating,
    };
};

export const estimateDeltaBac = (
    alcoholGrams: number,
    weightKg: number,
    heightCm: number,
    sex: 'Male' | 'Female',
    birthYear?: number
): number => {
    if (alcoholGrams <= 0 || weightKg <= 0) return 0;

    const age = birthYear ? Math.min(Math.max(2026 - birthYear, 18), 99) : 25;
    const tbwLiters =
        sex === 'Male'
            ? 2.447 - 0.09516 * age + 0.1074 * heightCm + 0.3362 * weightKg
            : -2.097 + 0.1069 * heightCm + 0.2466 * weightKg;

    const safeTbw = tbwLiters > 10 ? tbwLiters : weightKg * (sex === 'Male' ? 0.68 : 0.55) * 0.806;
    const deltaBacGramsPerDl = (alcoholGrams * (0.806 / 10)) / safeTbw;
    return Number((deltaBacGramsPerDl * 10).toFixed(3));
};