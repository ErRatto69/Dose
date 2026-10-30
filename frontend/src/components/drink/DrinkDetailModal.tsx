import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatVolume } from '@/utils/units';
import { BottleStrengthMeter } from './BottleStrengthMeter';
import { PaginationControls } from '@/components/common/PaginationControls';
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
    Trash2,
    Copy,
    Edit3,
    Lock,
} from 'lucide-react';

interface DrinkDetailModalProps {
    drink: DrinkDetail | null;
    isOpen: boolean;
    onClose: () => void;
    onDrinkNow: (drink: DrinkDetail) => void;
    onEdit?: (drink: DrinkDetail) => void;
    onDuplicate?: (drink: DrinkDetail) => void;
    onDeleted?: () => void;
}

export const DrinkDetailModal: React.FC<DrinkDetailModalProps> = ({
                                                                      drink,
                                                                      isOpen,
                                                                      onClose,
                                                                      onDrinkNow,
                                                                      onEdit,
                                                                      onDuplicate,
                                                                      onDeleted,
                                                                  }) => {
    const { preferredUnit } = usePreferencesStore();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [rating, setRating] = useState<number>(5);
    const [comment, setComment] = useState('');
    const [reviewsPage, setReviewsPage] = useState(1);
    const [isDeletingDrink, setIsDeletingDrink] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isAdmin = user?.role === 'Admin' || String(user?.role) === '0';
    const isBartenderOrAdmin = isAdmin || user?.role === 'Bartender' || String(user?.role) === '1';

    const { data: pagedReviews, isLoading: isLoadingReviews } = useQuery({
        queryKey: ['drink-reviews', drink?.id, reviewsPage],
        queryFn: () => drinksApi.getReviews(drink!.id, reviewsPage, 5),
        enabled: isOpen && !!drink,
    });

    const reviewsList = pagedReviews?.items ?? [];
    const totalReviewsCount = pagedReviews?.totalCount ?? 0;

    const reviewMutation = useMutation({
        mutationFn: () => drinksApi.upsertReview(drink!.id, rating, comment.trim() || undefined),
        onSuccess: () => {
            setComment('');
            queryClient.invalidateQueries({ queryKey: ['drink-reviews', drink?.id] });
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog'] });
        },
    });

    const deleteReviewMutation = useMutation({
        mutationFn: (reviewId: string) => drinksApi.deleteReview(reviewId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drink-reviews', drink?.id] });
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog'] });
        },
    });

    const handleDeleteDrink = async () => {
        if (!drink) return;
        try {
            setIsDeletingDrink(true);
            await drinksApi.deleteDrink(drink.id);
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog-infinite'] });
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog'] });
            setShowDeleteConfirm(false);
            onDeleted?.();
            onClose();
        } catch (err) {
            console.error('Failed to delete drink:', err);
        } finally {
            setIsDeletingDrink(false);
        }
    };

    if (!isOpen || !drink) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-neutral-950/80 backdrop-blur-md">
            <div
                className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="p-5 border-b border-neutral-800 flex items-start justify-between gap-4 bg-neutral-900">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            {drink.glassType && (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-950 text-neutral-300 border border-neutral-800">
                                    {drink.glassType}
                                </span>
                            )}
                            {drink.isLockedByCreator && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                    <Lock className="w-3 h-3" />
                                    <span>Private Recipe</span>
                                </span>
                            )}
                            {drink.averageRating > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    <Star className="w-3 h-3 fill-amber-400" />
                                    <span>{drink.averageRating} ({drink.reviewCount})</span>
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-black text-white">{drink.name}</h2>
                        <p className="text-xs sm:text-sm text-neutral-400 mt-1 leading-relaxed">
                            {drink.description}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors shrink-0"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Metrics Summary Bar */}
                <div className="px-5 py-3 bg-neutral-950 border-b border-neutral-800 grid grid-cols-3 gap-4 text-xs">
                    <div>
                        <span className="text-neutral-400 block">Standard Volume</span>
                        <strong className="text-neutral-100 text-sm font-mono">
                            {formatVolume(drink.metrics.totalVolumeCl, preferredUnit)}
                        </strong>
                    </div>
                    <div className="text-center">
                        <span className="text-neutral-400 block">Alcohol By Volume</span>
                        <strong className="text-red-400 text-sm font-mono">{drink.metrics.abvPercent}% ABV</strong>
                    </div>
                    <div className="text-right">
                        <span className="text-neutral-400 block">Pure Ethanol</span>
                        <strong className="text-neutral-100 text-sm font-mono">
                            {drink.metrics.pureAlcoholGrams.toFixed(1)}g
                        </strong>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="p-5 overflow-y-auto space-y-6 flex-1">
                    {/* Synchronized Bottle Strength Meter */}
                    <BottleStrengthMeter
                        score1To10={drink.metrics.bottleScore1To10}
                        bottleRating={drink.metrics.bottleVisualRating}
                        abvPercent={drink.metrics.abvPercent}
                    />

                    {/* Ingredients List */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2 mb-3">
                            <Wine className="w-4 h-4 text-red-500" />
                            Recipe Ingredients ({drink.ingredients.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {drink.ingredients.map((ing) => (
                                <div
                                    key={ing.ingredientId}
                                    className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2"
                                >
                                    <div>
                                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                                            <span>{ing.name}</span>
                                            {ing.isOptional && (
                                                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                                                    Optional
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-neutral-400">
                                            <span className="text-neutral-300 font-medium">
                                                {ing.subCategory}
                                            </span>
                                            {ing.flavor && (
                                                <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-300 text-[10px] font-semibold">
                                                    {ing.flavor}
                                                </span>
                                            )}
                                            {ing.abv > 0 && <span>• {ing.abv}% ABV</span>}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {ing.amountCl > 0 ? (
                                            <span className="font-mono font-bold text-sm text-red-400">
                                                {formatVolume(ing.amountCl, preferredUnit)}
                                            </span>
                                        ) : (
                                            <span className="text-xs font-medium text-neutral-400">
                                                {ing.displayUnitNote || 'Garnish'}
                                            </span>
                                        )}
                                        {ing.amountCl > 0 && ing.displayUnitNote && (
                                            <span className="block text-[10px] text-neutral-500">
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
                            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2 mb-3">
                                <ListOrdered className="w-4 h-4 text-red-500" />
                                Preparation Steps
                            </h3>
                            <ol className="space-y-2.5">
                                {drink.preparationSteps.map((step, idx) => (
                                    <li
                                        key={idx}
                                        className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-start gap-3 text-xs sm:text-sm text-neutral-200"
                                    >
                                        <span className="w-6 h-6 rounded-lg bg-red-600/15 border border-red-600/40 text-red-400 font-bold text-xs flex items-center justify-center shrink-0">
                                            {idx + 1}
                                        </span>
                                        <span className="leading-relaxed pt-0.5">{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* Community Reviews Section */}
                    <div className="pt-2 border-t border-neutral-800 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-red-500" />
                            Tasting Notes &amp; Reviews ({totalReviewsCount})
                        </h3>

                        {/* Add Review Box */}
                        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-neutral-300">Rate this cocktail</span>
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
                                                        : 'text-neutral-700'
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
                                    placeholder="Share your tasting notes..."
                                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => reviewMutation.mutate()}
                                    disabled={reviewMutation.isPending}
                                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm shadow-red-600/30"
                                >
                                    {reviewMutation.isPending ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Send className="w-3.5 h-3.5" />
                                    )}
                                    <span>Post</span>
                                </button>
                            </div>
                        </div>

                        {/* Paginated Reviews List */}
                        {isLoadingReviews ? (
                            <div className="py-6 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                                <span>Loading tasting notes...</span>
                            </div>
                        ) : reviewsList.length > 0 ? (
                            <div className="space-y-2.5">
                                {reviewsList.map((rev) => {
                                    const canDelete = isAdmin || rev.userId === user?.id;
                                    return (
                                        <div
                                            key={rev.id}
                                            className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs flex flex-col gap-1.5"
                                        >
                                            <div className="flex items-center justify-between">
                                                <strong className="text-neutral-200 font-bold">{rev.username}</strong>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                                                        <Star className="w-3 h-3 fill-amber-400" />
                                                        <span>{rev.rating}/5</span>
                                                    </div>
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (window.confirm('Delete this review?')) {
                                                                    deleteReviewMutation.mutate(rev.id);
                                                                }
                                                            }}
                                                            className="text-neutral-500 hover:text-red-400 transition-colors ml-1"
                                                            title="Delete review"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {rev.comment && (
                                                <p className="text-neutral-300 leading-relaxed">&quot;{rev.comment}&quot;</p>
                                            )}
                                            <span className="text-[10px] text-neutral-500">
                                                {new Date(rev.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    );
                                })}
                                {pagedReviews && (
                                    <PaginationControls
                                        pageNumber={pagedReviews.pageNumber}
                                        totalPages={pagedReviews.totalPages}
                                        totalCount={pagedReviews.totalCount}
                                        hasPreviousPage={pagedReviews.hasPreviousPage}
                                        hasNextPage={pagedReviews.hasNextPage}
                                        onPageChange={(page) => setReviewsPage(page)}
                                        itemLabel="reviews"
                                    />
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-neutral-500 text-center py-4">
                                No reviews yet. Be the first to share tasting notes!
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer Action Controls: Bartender management + Drink Now */}
                <div className="p-4 sm:p-5 bg-neutral-900 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {isBartenderOrAdmin && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onDuplicate?.(drink);
                                }}
                                className="px-3 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                                title="Duplicate and remix this cocktail"
                            >
                                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                                <span>Duplicate</span>
                            </button>
                        )}

                        {drink.canEdit && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onEdit?.(drink);
                                }}
                                className="px-3 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                                title="Edit this cocktail recipe"
                            >
                                <Edit3 className="w-3.5 h-3.5 text-neutral-400" />
                                <span>Edit</span>
                            </button>
                        )}

                        {drink.canDelete && (
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="p-2.5 rounded-xl bg-neutral-950 hover:bg-red-950/70 border border-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
                                title="Delete cocktail"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onDrinkNow(drink);
                        }}
                        className="flex-1 sm:flex-initial py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-[0.99]"
                    >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        <span>Drink Now</span>
                    </button>
                </div>
            </div>

            {/* Delete Drink Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md">
                    <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-red-600/15 border border-red-600/30 flex items-center justify-center text-red-500">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Delete &quot;{drink.name}&quot;?</h3>
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                                This cocktail will be permanently removed from the catalog. Any drinks already logged in personal BAC histories will not be lost.
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeletingDrink}
                                className="px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteDrink}
                                disabled={isDeletingDrink}
                                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all active:scale-95"
                            >
                                {isDeletingDrink ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                )}
                                <span>Delete Drink</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};