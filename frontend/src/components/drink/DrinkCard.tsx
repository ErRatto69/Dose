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
    if (bottles <= 1.25) return { label: 'Light', textClass: 'text-emerald-400', bgClass: 'bg-emerald-950/80 border-emerald-800/60' };
    if (bottles <= 2.25) return { label: 'Moderate', textClass: 'text-amber-400', bgClass: 'bg-amber-950/80 border-amber-800/60' };
    if (bottles <= 3.25) return { label: 'Medium', textClass: 'text-orange-400', bgClass: 'bg-orange-950/80 border-orange-800/60' };
    if (bottles <= 4.25) return { label: 'Strong', textClass: 'text-red-400', bgClass: 'bg-red-950/80 border-red-800/60' };
    return { label: 'Very Strong', textClass: 'text-purple-300', bgClass: 'bg-purple-950/80 border-purple-800/60' };
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

    const hasValidImage = drink.imageUrl && !imageError;

    return (
        <div
            onClick={() => onView(drink.id)}
            className="group cursor-pointer rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-red-600/40 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-red-950/20"
        >
            {/* Top Media Section: 4:3 Aspect Ratio with Dark Editorial Overlays */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-950">
                {hasValidImage ? (
                    <img
                        src={drink.imageUrl}
                        alt={drink.name}
                        loading="lazy"
                        onError={() => setImageError(true)}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                ) : (
                    /* Elegant Fallback for Drinks Without Photos */
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-950 text-neutral-700 group-hover:text-neutral-600 transition-colors">
                        <Wine className="w-12 h-12 stroke-[1.25] mb-1" />
                        <span className="text-[11px] font-mono tracking-wider uppercase text-neutral-600">
                            Craft Cocktail
                        </span>
                    </div>
                )}

                {/* Subtle Cinematic Bottom Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-black/30 pointer-events-none" />

                {/* Top-Left: Glass Type Tag */}
                {drink.glassType && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-neutral-950/80 border border-neutral-800/90 backdrop-blur-md text-[10px] font-mono tracking-wider uppercase text-neutral-300 shadow-md">
                        {drink.glassType}
                    </div>
                )}

                {/* Top-Right: Strength & ABV Pill */}
                <div
                    className={`absolute top-3 right-3 px-2.5 py-1 rounded-xl border backdrop-blur-md shadow-md flex items-center gap-1.5 text-[11px] font-bold ${strength.bgClass}`}
                >
                    <span className={strength.textClass}>{strength.label}</span>
                    <span className="text-neutral-400 font-mono text-[10px] font-normal">
                        • {drink.abvPercent.toFixed(1)}%
                    </span>
                </div>

                {/* Bottom-Right: Star Rating Pill if reviews exist */}
                {drink.averageRating > 0 && (
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-neutral-950/85 border border-neutral-800/80 backdrop-blur-md flex items-center gap-1 text-[11px] font-bold text-amber-400 shadow-md">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{drink.averageRating}</span>
                        <span className="text-neutral-500 text-[10px] font-normal font-sans">
                            ({drink.reviewCount})
                        </span>
                    </div>
                )}
            </div>

            {/* Middle: Content Section */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                    <h3 className="text-lg font-black text-white group-hover:text-red-400 transition-colors leading-tight">
                        {drink.name}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 mt-1.5 leading-relaxed">
                        {drink.description}
                    </p>
                </div>

                {/* Action Buttons */}
                <div
                    className="grid grid-cols-2 gap-2 pt-3 border-t border-neutral-800/70"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => onView(drink.id)}
                        disabled={isViewing || isDrinking}
                        className="py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                        {isViewing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Eye className="w-3.5 h-3.5" />
                        )}
                        <span>Recipe</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onDrink(drink.id)}
                        disabled={isViewing || isDrinking}
                        className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-red-600/25"
                    >
                        {isDrinking ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                        )}
                        <span>Drink</span>
                    </button>
                </div>
            </div>
        </div>
    );
};