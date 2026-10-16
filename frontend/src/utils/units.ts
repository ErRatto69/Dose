// src/utils/units.ts
import type { VolumeUnit } from '@/types';

const CL_TO_OZ = 0.33814;
const OZ_TO_CL = 2.95735;

export const formatVolume = (amountCl: number, unit: VolumeUnit): string => {
    if (amountCl <= 0) return '0';
    if (unit === 'cl') {
        return `${Number(amountCl.toFixed(1))} cl`;
    }
    const oz = amountCl * CL_TO_OZ;
    const roundedQuarterOz = Math.round(oz * 4) / 4;
    return `${roundedQuarterOz} oz`;
};

export const convertUnitToCl = (value: number, unit: VolumeUnit): number => {
    return unit === 'cl' ? value : Number((value * OZ_TO_CL).toFixed(2));
};