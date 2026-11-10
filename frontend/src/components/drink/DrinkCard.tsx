import React, { useState } from 'react';
import type { DrinkCatalogItem } from '@/types';
import { Wine, Star, Plus, Loader2, ChevronRight } from 'lucide-react';

interface DrinkCardProps {
    drink: DrinkCatalogItem;
    onView: (drinkId: string) => void;
    onDrink: (drinkId: string) => void;
    isViewing?: boolean;
    isDrinking?: boolean;
}

const getStrengthInfo = (score1To10: number): { label: string; textClass: string; fillCount: number; barColor: string } => {
    const bottles = score1To10 / 2;
    const fillCount = Math.min(5, Math.max(1, Math.round(bottles)));
    if (bottles <= 1.25) return { label: 'Light', textClass: 'text-emerald-400', fillCount, barColor: 'bg-emerald-400' };
    if (bottles <= 2.25) return { label: 'Moderate', textClass: 'text-amber-400', fillCount, barColor: 'bg-amber-400' };
    if (bottles <= 3.25) return { label: 'Medium', textClass: 'text-orange-400', fillCount, barColor: 'bg-orange-400' };
    if (bottles <= 4.25) return { label: 'Strong', textClass: 'text-red-400', fillCount, barColor: 'bg-red-500' };
    return { label: 'Very Strong', textClass: 'text-rose-300', fillCount: 5, barColor: 'bg-red-600' };
};

export const DrinkCard: React.FC<DrinkCardProps> = ({
    drink,
    onView,
    onDrink,
    isViewing = false,
    isDrinking = false,
}) => {
    const [imageError, setImageError] = useState(false);
    const strength = getStrengthInfo(drink.bottleScore1To10);
    const hasValidImage = Boolean(drink.imageUrl) && !imageError;

    return (
        <article className="group rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col justify-between overflow-hidden dose-card-hover">
            {/* Clickable Recipe Area */}
            <button
                type="button"
                onClick={() => onView(drink.id)}
                disabled={isViewing || isDrinking}
                className="text-left flex-1 flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 rounded-t-2xl"
            >
                <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-[#0c0c0f]">
                    {hasValidImage ? (
                        <img
                            src={drink.imageUrl}
                            alt={drink.name}
                            width={400}
                            height={300}
                            loading="lazy"
                            onError={() => setImageError(true)}
                            className="w-full h-full object-cover dose-img-zoom"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0c0c0f] text-zinc-600">
                            <Wine className="w-10 h-10 stroke-[1.25] mb-1" aria-hidden="true" />
                            <span className="text-[11px] font-medium text-zinc-500">
                                Craft Cocktail
                            </span>
                        </div>
                    )}

                    <div
                        className="absolute inset-0 bg-gradient-to-t from-[#111114] via-[#111114]/20 to-black/35 pointer-events-none"
                        aria-hidden="true"
                    />

                    {drink.glassType && (
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#09090b]/80 border border-white/10 backdrop-blur-sm text-[11px] font-semibold text-zinc-200">
                            {drink.glassType}
                        </div>
                    )}

                    {drink.averageRating > 0 && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#09090b]/80 border border-white/10 backdrop-blur-sm flex items-center gap-1 text-[11px] font-bold text-amber-400 tabular-nums">
                            <Star className="w-3 h-3 fill-amber-400" aria-hidden="true" />
                            <span>{drink.averageRating}</span>
                            <span className="text-zinc-400 font-medium">({drink.reviewCount})</span>
                        </div>
                    )}
                </div>

                <div className="px-4 pt-2 pb-3 flex-1 flex flex-col justify-start">
                    <div className="flex items-start justify-between gap-2">
                        <h2 className="font-display text-2xl font-bold tracking-wide text-white group-hover:text-red-400 transition-colors leading-tight">
                            {drink.name}
                        </h2>
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-200 pt-1 shrink-0">
                            {isViewing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" aria-hidden="true" />
                            ) : (
                                <>
                                    <span>Recipe</span>
                                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                                </>
                            )}
                        </span>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {drink.description}
                    </p>
                </div>
            </button>

            {/* Calibrated Spec Strip + Single Primary Pour CTA */}
            <div className="px-4 py-3 border-t border-white/[0.06] bg-[#0d0d10] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    {/* 5 Calibrated Strength Ticks */}
                    <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map((tick) => (
                            <span
                                key={tick}
                                className={`w-1 rounded-full ${
                                    tick <= strength.fillCount
                                        ? `h-3.5 ${strength.barColor}`
                                        : 'h-2.5 bg-white/12'
                                }`}
                            />
                        ))}
                    </div>
                    <div className="text-xs leading-tight min-w-0 tabular-nums">
                        <span className={`font-bold ${strength.textClass} block`}>
                            {strength.label}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-semibold">
                            {drink.abvPercent.toFixed(1)}% ABV
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => onDrink(drink.id)}
                    disabled={isViewing || isDrinking}
                    aria-label={`Pour and log ${drink.name}`}
                    className="min-h-[40px] px-4 rounded-full bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 border border-red-400/40 shrink-0 dose-press disabled:opacity-50"
                >
                    {isDrinking ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Plus className="w-3.5 h-3.5 stroke-[2.75]" aria-hidden="true" />
                    )}
                    <span>Pour</span>
                </button>
            </div>
        </article>
    );
};
