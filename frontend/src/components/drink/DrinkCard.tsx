import React, { useState } from 'react';
import type { DrinkCatalogItem } from '@/types';
import { Wine, Star, Eye, Plus, Loader2 } from 'lucide-react';

interface DrinkCardProps {
    drink: DrinkCatalogItem;
    onView: (drinkId: string) => void;
    onDrink: (drinkId: string) => void;
    isViewing?: boolean;
    isDrinking?: boolean;
}

const getStrengthBadge = (score1To10: number): { label: string; textClass: string; bgClass: string } => {
    const bottles = score1To10 / 2;
    if (bottles <= 1.25) return { label: 'Light', textClass: 'text-emerald-300', bgClass: 'bg-emerald-950/90 border-emerald-600/40' };
    if (bottles <= 2.25) return { label: 'Moderate', textClass: 'text-amber-300', bgClass: 'bg-amber-950/90 border-amber-600/40' };
    if (bottles <= 3.25) return { label: 'Medium', textClass: 'text-orange-300', bgClass: 'bg-orange-950/90 border-orange-600/40' };
    if (bottles <= 4.25) return { label: 'Strong', textClass: 'text-red-300', bgClass: 'bg-red-950/90 border-red-600/45' };
    return { label: 'Very Strong', textClass: 'text-rose-200', bgClass: 'bg-red-950/95 border-red-500/55' };
};

export const DrinkCard: React.FC<DrinkCardProps> = ({
    drink,
    onView,
    onDrink,
    isViewing = false,
    isDrinking = false,
}) => {
    const [imageError, setImageError] = useState(false);
    const strength = getStrengthBadge(drink.bottleScore1To10);

    const hasValidImage = Boolean(drink.imageUrl) && !imageError;

    return (
        <article className="group rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col justify-between overflow-hidden dose-card-hover">
            {/* Clickable Media + Copy Surface */}
            <button
                type="button"
                onClick={() => onView(drink.id)}
                disabled={isViewing || isDrinking}
                className="text-left flex-1 flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 rounded-t-2xl"
            >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0c0c0f]">
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
                            <Wine className="w-11 h-11 stroke-[1.25] mb-1.5" aria-hidden="true" />
                            <span className="text-[11px] font-medium text-zinc-500">
                                Craft Cocktail
                            </span>
                        </div>
                    )}

                    <div
                        className="absolute inset-0 bg-gradient-to-t from-[#111114] via-transparent to-black/30 pointer-events-none"
                        aria-hidden="true"
                    />

                    {drink.glassType && (
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#09090b]/85 border border-white/10 backdrop-blur-sm text-[11px] font-semibold text-zinc-200">
                            {drink.glassType}
                        </div>
                    )}

                    <div
                        className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg border backdrop-blur-sm flex items-center gap-1.5 text-[11px] font-bold tabular-nums ${strength.bgClass}`}
                    >
                        <span className={strength.textClass}>{strength.label}</span>
                        <span className="text-zinc-300 font-semibold">
                            {drink.abvPercent.toFixed(1)}%
                        </span>
                    </div>

                    {drink.averageRating > 0 && (
                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-[#09090b]/85 border border-white/10 backdrop-blur-sm flex items-center gap-1 text-[11px] font-bold text-amber-400 tabular-nums">
                            <Star className="w-3 h-3 fill-amber-400" aria-hidden="true" />
                            <span>{drink.averageRating}</span>
                            <span className="text-zinc-400 font-medium">
                                ({drink.reviewCount})
                            </span>
                        </div>
                    )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-start">
                    <h2 className="text-base sm:text-lg font-extrabold text-white group-hover:text-red-400 transition-colors leading-snug text-balance">
                        {drink.name}
                    </h2>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {drink.description}
                    </p>
                </div>
            </button>

            {/* Primary Actions */}
            <div className="px-4 pb-4 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => onView(drink.id)}
                    disabled={isViewing || isDrinking}
                    aria-label={`View recipe for ${drink.name}`}
                    className="min-h-[42px] px-3 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 dose-press disabled:opacity-50"
                >
                    {isViewing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Eye className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                    )}
                    <span>Recipe</span>
                </button>

                <button
                    type="button"
                    onClick={() => onDrink(drink.id)}
                    disabled={isViewing || isDrinking}
                    aria-label={`Pour and log ${drink.name}`}
                    className="min-h-[42px] px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-red-500/40 dose-press disabled:opacity-50"
                >
                    {isDrinking ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                    )}
                    <span>Drink</span>
                </button>
            </div>
        </article>
    );
};
