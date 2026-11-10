import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { drinksApi } from '@/api/drinks.api';
import { PaginationControls } from '@/components/common/PaginationControls';
import { ConfirmDialogModal } from '@/components/common/ConfirmDialogModal';
import { Search, Trash2, Star, X, MessageSquare } from 'lucide-react';

export const AdminReviewsPage: React.FC = () => {
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pageNumber, setPageNumber] = useState(1);
    const [reviewToDelete, setReviewToDelete] = useState<{ id: string; username: string } | null>(null);
    const pageSize = 12;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPageNumber(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: pagedReviews, isLoading } = useQuery({
        queryKey: ['admin-reviews', pageNumber, debouncedSearch],
        queryFn: () =>
            usersApi.getAdminReviews({
                pageNumber,
                pageSize,
                search: debouncedSearch.trim() || undefined,
            }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => drinksApi.deleteReview(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog-infinite'] });
        },
    });

    return (
        <>
            <div className="space-y-6">
                <section>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
                        Reviews Moderation
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                        Search and moderate community tasting notes across the cocktail catalog.
                    </p>
                </section>

                {/* Search Input */}
                <div className="relative max-w-md">
                    <Search
                        className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                    />
                    <input
                        type="search"
                        aria-label="Search reviews by username, drink, or comment"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by username, drink, or note…"
                        className="w-full min-h-[44px] pl-10 pr-10 py-2.5 rounded-xl text-sm dose-input"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            aria-label="Clear review search"
                            className="w-9 h-9 rounded-lg flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                        >
                            <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5" aria-busy="true" aria-label="Loading reviews">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-32 rounded-2xl bg-[#111114] border border-white/[0.08]" />
                        ))}
                    </div>
                ) : pagedReviews && pagedReviews.items.length > 0 ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {pagedReviews.items.map((rev) => (
                                <article
                                    key={rev.id}
                                    className="p-4 rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col justify-between gap-3 text-xs"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <div className="min-w-0">
                                                <strong className="text-sm font-extrabold text-white block truncate">
                                                    {rev.drinkName}
                                                </strong>
                                                <span className="text-zinc-400 text-[11px]">
                                                    by <strong className="text-zinc-200">{rev.username}</strong>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-amber-400 font-bold shrink-0 tabular-nums">
                                                <Star className="w-3.5 h-3.5 fill-amber-400" aria-hidden="true" />
                                                <span>{rev.rating}/5</span>
                                            </div>
                                        </div>
                                        {rev.comment && (
                                            <p className="text-zinc-300 leading-relaxed mt-1.5">
                                                &ldquo;{rev.comment}&rdquo;
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06] text-[11px] text-zinc-400">
                                        <span className="tabular-nums">
                                            {new Date(rev.createdAt).toLocaleDateString()}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setReviewToDelete({ id: rev.id, username: rev.username })}
                                            aria-label={`Delete review by ${rev.username}`}
                                            className="w-9 h-9 rounded-xl bg-[#0c0c0f] hover:bg-red-950/60 border border-white/[0.08] text-zinc-400 hover:text-red-400 flex items-center justify-center dose-press"
                                        >
                                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <PaginationControls
                            pageNumber={pagedReviews.pageNumber}
                            totalPages={pagedReviews.totalPages}
                            totalCount={pagedReviews.totalCount}
                            hasPreviousPage={pagedReviews.hasPreviousPage}
                            hasNextPage={pagedReviews.hasNextPage}
                            onPageChange={(p) => setPageNumber(p)}
                            itemLabel="reviews"
                        />
                    </div>
                ) : (
                    <div className="py-16 text-center text-zinc-400 bg-[#111114] border border-white/[0.08] rounded-2xl text-xs space-y-2">
                        <MessageSquare className="w-7 h-7 mx-auto text-zinc-500" aria-hidden="true" />
                        <p>No reviews found matching your search.</p>
                    </div>
                )}
            </div>

            <ConfirmDialogModal
                isOpen={!!reviewToDelete}
                title="Delete Community Review?"
                message={`Remove tasting review posted by ${reviewToDelete?.username ?? 'guest'}?`}
                confirmLabel="Delete Review"
                isDestructive
                isLoading={deleteMutation.isPending}
                onConfirm={() => {
                    if (reviewToDelete) {
                        deleteMutation.mutate(reviewToDelete.id, {
                            onSettled: () => setReviewToDelete(null),
                        });
                    }
                }}
                onCancel={() => setReviewToDelete(null)}
            />
        </>
    );
};
