import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { queryKeys } from '@/api/queryKeys';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { canManageCocktails, isAdmin as isAdminUser } from '@/utils/auth';
import { formatVolume } from '@/utils/units';
import { BottleStrengthMeter } from './BottleStrengthMeter';
import { PaginationControls } from '@/components/common/PaginationControls';
import { ModalShell } from '@/components/common/ModalShell';
import { ConfirmDialogModal } from '@/components/common/ConfirmDialogModal';
import type { DrinkDetail } from '@/types';
import {
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
    const [reviewIdToDelete, setReviewIdToDelete] = useState<string | null>(null);

    const hasAdminAccess = isAdminUser(user);
    const isBartenderOrAdmin = canManageCocktails(user);

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
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog-infinite'] });
            queryClient.invalidateQueries({ queryKey: queryKeys.gamification.passport() });
        },
    });

    const deleteReviewMutation = useMutation({
        mutationFn: (reviewId: string) => drinksApi.deleteReview(reviewId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drink-reviews', drink?.id] });
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog-infinite'] });
        },
    });

    const handleDeleteDrink = async () => {
        if (!drink) return;
        try {
            setIsDeletingDrink(true);
            await drinksApi.deleteDrink(drink.id);
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog-infinite'] });
            setShowDeleteConfirm(false);
            onDeleted?.();
            onClose();
        } catch (err) {
            console.error('Failed to delete drink:', err);
        } finally {
            setIsDeletingDrink(false);
        }
    };

    if (!drink) return null;

    const badges = (
        <>
            {drink.glassType && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#0c0c0f] text-zinc-200 border border-white/[0.08]">
                    {drink.glassType}
                </span>
            )}
            {drink.isLockedByCreator && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35">
                    <Lock className="w-3 h-3" aria-hidden="true" />
                    <span>Locked Recipe</span>
                </span>
            )}
            {drink.averageRating > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 tabular-nums">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                    <span>{drink.averageRating} ({drink.reviewCount})</span>
                </span>
            )}
        </>
    );

    const subheader = (
        <div className="px-5 py-3 grid grid-cols-3 gap-4 text-xs">
            <div>
                <span className="text-zinc-400 block">Standard Volume</span>
                <strong className="text-zinc-100 text-sm font-extrabold tabular-nums">
                    {formatVolume(drink.metrics.totalVolumeCl, preferredUnit)}
                </strong>
            </div>
            <div className="text-center">
                <span className="text-zinc-400 block">Alcohol By Volume</span>
                <strong className="text-red-400 text-sm font-extrabold tabular-nums">
                    {drink.metrics.abvPercent}% ABV
                </strong>
            </div>
            <div className="text-right">
                <span className="text-zinc-400 block">Pure Ethanol</span>
                <strong className="text-zinc-100 text-sm font-extrabold tabular-nums">
                    {drink.metrics.pureAlcoholGrams.toFixed(1)} g
                </strong>
            </div>
        </div>
    );

    const footer = (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
                {isBartenderOrAdmin && (
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onDuplicate?.(drink);
                        }}
                        className="min-h-[42px] px-3 py-2 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-zinc-300 hover:text-white font-bold text-xs flex items-center gap-1.5 dose-press"
                    >
                        <Copy className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                        <span>Remix</span>
                    </button>
                )}

                {drink.canEdit && (
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onEdit?.(drink);
                        }}
                        className="min-h-[42px] px-3 py-2 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-zinc-300 hover:text-white font-bold text-xs flex items-center gap-1.5 dose-press"
                    >
                        <Edit3 className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                        <span>Edit</span>
                    </button>
                )}

                {drink.canDelete && (
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        aria-label={`Delete ${drink.name}`}
                        className="min-h-[42px] min-w-[42px] p-2.5 rounded-xl bg-[#0c0c0f] hover:bg-red-950/60 border border-white/[0.08] text-zinc-400 hover:text-red-400 flex items-center justify-center dose-press"
                    >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                )}
            </div>

            <button
                type="button"
                onClick={() => {
                    onClose();
                    onDrinkNow(drink);
                }}
                className="flex-1 sm:flex-initial min-h-[44px] py-2.5 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 border border-red-500/50 dose-press"
            >
                <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                <span>Drink Now</span>
            </button>
        </div>
    );

    return (
        <>
            <ModalShell
                isOpen={isOpen}
                onClose={onClose}
                title={drink.name}
                subtitle={drink.description}
                badge={badges}
                maxWidthClass="max-w-2xl"
                subheader={subheader}
                footer={footer}
            >
                <div className="space-y-6">
                    <BottleStrengthMeter
                        score1To10={drink.metrics.bottleScore1To10}
                        bottleRating={drink.metrics.bottleVisualRating}
                        abvPercent={drink.metrics.abvPercent}
                    />

                    {/* Ingredients List */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                            <Wine className="w-4 h-4 text-red-400" aria-hidden="true" />
                            <span>Recipe Ingredients ({drink.ingredients.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {drink.ingredients.map((ing) => (
                                <div
                                    key={ing.ingredientId}
                                    className="p-3.5 rounded-xl bg-[#0c0c0f] border border-white/[0.08] flex items-center justify-between gap-2"
                                >
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
                                            <span className="truncate">{ing.name}</span>
                                            {ing.isOptional && (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300">
                                                    Optional
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-zinc-400">
                                            <span className="text-zinc-300 font-medium">{ing.subCategory}</span>
                                            {ing.flavor && (
                                                <span className="px-1.5 py-0.2 rounded bg-red-950/70 text-red-300 text-[10px] font-semibold">
                                                    {ing.flavor}
                                                </span>
                                            )}
                                            {ing.abv > 0 && <span className="tabular-nums">{ing.abv}% ABV</span>}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {ing.amountCl > 0 ? (
                                            <span className="tabular-nums font-extrabold text-sm text-red-400">
                                                {formatVolume(ing.amountCl, preferredUnit)}
                                            </span>
                                        ) : (
                                            <span className="text-xs font-medium text-zinc-400">
                                                {ing.displayUnitNote || 'Garnish'}
                                            </span>
                                        )}
                                        {ing.amountCl > 0 && ing.displayUnitNote && (
                                            <span className="block text-[11px] text-zinc-400">
                                                {ing.displayUnitNote}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Preparation Steps */}
                    {drink.preparationSteps.length > 0 && (
                        <section className="space-y-3">
                            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                                <ListOrdered className="w-4 h-4 text-red-400" aria-hidden="true" />
                                <span>Preparation Steps</span>
                            </h3>
                            <ol className="space-y-2">
                                {drink.preparationSteps.map((step, idx) => (
                                    <li
                                        key={idx}
                                        className="p-3.5 rounded-xl bg-[#0c0c0f] border border-white/[0.08] flex items-start gap-3 text-xs sm:text-sm text-zinc-200"
                                    >
                                        <span className="w-6 h-6 rounded-lg bg-red-600/15 border border-red-600/35 text-red-400 font-extrabold text-xs tabular-nums flex items-center justify-center shrink-0">
                                            {idx + 1}
                                        </span>
                                        <span className="leading-relaxed pt-0.5">{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}

                    {/* Community Reviews */}
                    <section className="pt-4 border-t border-white/[0.08] space-y-4">
                        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-red-400" aria-hidden="true" />
                            <span>Tasting Notes &amp; Reviews ({totalReviewsCount})</span>
                        </h3>

                        <div className="p-4 rounded-2xl bg-[#0c0c0f] border border-white/[0.08] space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-zinc-300">Rate this cocktail</span>
                                <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating out of 5 stars">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            aria-label={`Rate ${star} out of 5 stars`}
                                            aria-pressed={star === rating}
                                            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/[0.05] dose-press"
                                        >
                                            <Star
                                                className={`w-4 h-4 ${
                                                    star <= rating
                                                        ? 'fill-amber-400 text-amber-400'
                                                        : 'text-zinc-600'
                                                }`}
                                                aria-hidden="true"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    aria-label="Tasting notes"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Share your tasting notes…"
                                    className="flex-1 min-h-[42px] px-3.5 py-2 text-xs rounded-xl dose-input"
                                />
                                <button
                                    type="button"
                                    onClick={() => reviewMutation.mutate()}
                                    disabled={reviewMutation.isPending}
                                    className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 dose-press"
                                >
                                    {reviewMutation.isPending ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                    ) : (
                                        <Send className="w-3.5 h-3.5" aria-hidden="true" />
                                    )}
                                    <span>Post</span>
                                </button>
                            </div>
                        </div>

                        {isLoadingReviews ? (
                            <div className="py-6 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-red-500" aria-hidden="true" />
                                <span>Loading tasting notes…</span>
                            </div>
                        ) : reviewsList.length > 0 ? (
                            <div className="space-y-2.5">
                                {reviewsList.map((rev) => {
                                    const canDelete = hasAdminAccess || rev.userId === user?.id;
                                    return (
                                        <div
                                            key={rev.id}
                                            className="p-3.5 rounded-xl bg-[#0c0c0f] border border-white/[0.08] text-xs flex flex-col gap-1.5"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <strong className="text-zinc-100 font-bold">{rev.username}</strong>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 text-amber-400 font-bold tabular-nums">
                                                        <Star className="w-3 h-3 fill-amber-400" aria-hidden="true" />
                                                        <span>{rev.rating}/5</span>
                                                    </div>
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setReviewIdToDelete(rev.id)}
                                                            aria-label="Delete review"
                                                            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/[0.05] flex items-center justify-center dose-press"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {rev.comment && (
                                                <p className="text-zinc-300 leading-relaxed">&ldquo;{rev.comment}&rdquo;</p>
                                            )}
                                            <span className="text-[11px] text-zinc-400 tabular-nums">
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
                            <p className="text-xs text-zinc-400 text-center py-4">
                                No tasting notes yet. Be the first to review this cocktail.
                            </p>
                        )}
                    </section>
                </div>
            </ModalShell>

            <ConfirmDialogModal
                isOpen={showDeleteConfirm}
                title={`Delete “${drink.name}”?`}
                message="This cocktail will be permanently removed from the catalog. Existing personal BAC logs will remain intact."
                confirmLabel="Delete Drink"
                isDestructive
                isLoading={isDeletingDrink}
                onConfirm={handleDeleteDrink}
                onCancel={() => setShowDeleteConfirm(false)}
            />

            <ConfirmDialogModal
                isOpen={!!reviewIdToDelete}
                title="Delete Tasting Review?"
                message="Remove this review permanently?"
                confirmLabel="Delete Review"
                isDestructive
                isLoading={deleteReviewMutation.isPending}
                onConfirm={() => {
                    if (reviewIdToDelete) {
                        deleteReviewMutation.mutate(reviewIdToDelete, {
                            onSettled: () => setReviewIdToDelete(null),
                        });
                    }
                }}
                onCancel={() => setReviewIdToDelete(null)}
            />
        </>
    );
};
