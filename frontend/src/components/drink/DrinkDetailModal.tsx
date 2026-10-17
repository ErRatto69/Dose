import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { formatVolume } from '@/utils/units';
import { BottleStrengthMeter } from './BottleStrengthMeter';
import type { DrinkDetail } from '@/types';
import {
    X,
    Wine,
    ListOrdered,
    Star,
    Plus,
    MessageSquare,
    Send,
    Loader2,
} from 'lucide-react';

interface DrinkDetailModalProps {
    drink: DrinkDetail | null;
    isOpen: boolean;
    onClose: () => void;
    onDrinkNow: (drink: DrinkDetail) => void;
}

export const DrinkDetailModal: React.FC<DrinkDetailModalProps> = ({
                                                                      drink,
                                                                      isOpen,
                                                                      onClose,
                                                                      onDrinkNow,
                                                                  }) => {
    const { preferredUnit } = usePreferencesStore();
    const queryClient = useQueryClient();

    const [rating, setRating] = useState<number>(5);
    const [comment, setComment] = useState('');

    const { data: reviews = [], isLoading: isLoadingReviews } = useQuery({
        queryKey: ['drink-reviews', drink?.id],
        queryFn: () => drinksApi.getReviews(drink!.id),
        enabled: isOpen && !!drink,
    });

    const reviewMutation = useMutation({
        mutationFn: () => drinksApi.upsertReview(drink!.id, rating, comment.trim() || undefined),
        onSuccess: () => {
            setComment('');
            queryClient.invalidateQueries({ queryKey: ['drink-reviews', drink?.id] });
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog'] });
        },
    });

    if (!isOpen || !drink) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md">
            <div
                className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-200"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900/95">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                                Cocktail Recipe &amp; Specs
                            </span>
                            {drink.glassType && (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                    {drink.glassType} Glass
                                </span>
                            )}
                            {drink.averageRating > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400">
                                    <Star className="w-3 h-3 fill-amber-400" />
                                    {drink.averageRating} ({drink.reviewCount})
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-black text-white">{drink.name}</h2>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                            {drink.description}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 transition-colors shrink-0"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Metrics Summary Bar */}
                <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800 grid grid-cols-3 gap-4 text-xs">
                    <div>
                        <span className="text-slate-400 block">Standard Volume</span>
                        <strong className="text-slate-100 text-sm">
                            {formatVolume(drink.metrics.totalVolumeCl, preferredUnit)}
                        </strong>
                    </div>
                    <div className="text-center">
                        <span className="text-slate-400 block">Alcohol By Volume</span>
                        <strong className="text-amber-400 text-sm">{drink.metrics.abvPercent}% ABV</strong>
                    </div>
                    <div className="text-right">
                        <span className="text-slate-400 block">Pure Ethanol</span>
                        <strong className="text-emerald-400 text-sm">
                            {drink.metrics.pureAlcoholGrams.toFixed(1)}g
                        </strong>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="p-5 overflow-y-auto space-y-6 flex-1">
                    <BottleStrengthMeter
                        score1To10={drink.metrics.bottleScore1To10}
                        bottleRating={drink.metrics.bottleVisualRating}
                        abvPercent={drink.metrics.abvPercent}
                    />

                    {/* Ingredients List */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
                            <Wine className="w-4 h-4 text-amber-400" />
                            Recipe Ingredients ({drink.ingredients.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {drink.ingredients.map((ing) => (
                                <div
                                    key={ing.ingredientId}
                                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-2"
                                >
                                    <div>
                                        <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                                            <span>{ing.name}</span>
                                            {ing.isOptional && (
                                                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                                    Optional
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                                            <span className="text-amber-400/90 font-medium">
                                                {ing.subCategory}
                                            </span>
                                            {ing.flavor && (
                                                <span className="px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 text-[10px] font-semibold">
                                                    Flavor: {ing.flavor}
                                                </span>
                                            )}
                                            {ing.abv > 0 && <span>• {ing.abv}% ABV</span>}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {ing.amountCl > 0 ? (
                                            <span className="font-mono font-bold text-sm text-amber-300">
                                                {formatVolume(ing.amountCl, preferredUnit)}
                                            </span>
                                        ) : (
                                            <span className="text-xs font-medium text-slate-400">
                                                {ing.displayUnitNote || 'Garnish'}
                                            </span>
                                        )}
                                        {ing.amountCl > 0 && ing.displayUnitNote && (
                                            <span className="block text-[10px] text-slate-500">
                                                {ing.displayUnitNote}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preparation Steps */}
                    {drink.preparationSteps.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
                                <ListOrdered className="w-4 h-4 text-amber-400" />
                                Preparation Steps
                            </h3>
                            <ol className="space-y-2.5">
                                {drink.preparationSteps.map((step, idx) => (
                                    <li
                                        key={idx}
                                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3 text-xs sm:text-sm text-slate-200"
                                    >
                                        <span className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                                            {idx + 1}
                                        </span>
                                        <span className="leading-relaxed pt-0.5">{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* Community Reviews */}
                    <div className="pt-2 border-t border-slate-800">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
                            <MessageSquare className="w-4 h-4 text-amber-400" />
                            Tasting Notes &amp; Reviews ({reviews.length})
                        </h3>

                        {/* Add Review Form */}
                        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 mb-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-300">Rate this drink</span>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className="p-1 hover:scale-110 transition-transform"
                                        >
                                            <Star
                                                className={`w-4 h-4 ${
                                                    star <= rating
                                                        ? 'fill-amber-400 text-amber-400'
                                                        : 'text-slate-600'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Share your thoughts on this recipe..."
                                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                                />
                                <button
                                    type="button"
                                    onClick={() => reviewMutation.mutate()}
                                    disabled={reviewMutation.isPending}
                                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
                                >
                                    {reviewMutation.isPending ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Send className="w-3.5 h-3.5" />
                                    )}
                                    Post
                                </button>
                            </div>
                        </div>

                        {isLoadingReviews ? (
                            <div className="py-4 text-center text-xs text-slate-500">Loading reviews...</div>
                        ) : reviews.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {reviews.map((rev) => (
                                    <div
                                        key={rev.id}
                                        className="p-3 rounded-xl bg-slate-800/30 border border-slate-800/80 text-xs"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <strong className="text-slate-200">{rev.username}</strong>
                                            <div className="flex items-center gap-1 text-amber-400 font-bold">
                                                <Star className="w-3 h-3 fill-amber-400" />
                                                <span>{rev.rating}/5</span>
                                            </div>
                                        </div>
                                        {rev.comment && <p className="text-slate-400">{rev.comment}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500 text-center py-2">
                                No reviews yet. Be the first to rate this drink!
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onDrinkNow(drink);
                        }}
                        className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                    >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        Drink / Customize Dose
                    </button>
                </div>
            </div>
        </div>
    );
};