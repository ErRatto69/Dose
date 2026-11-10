import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { drinksApi } from '@/api/drinks.api';
import { PaginationControls } from '@/components/common/PaginationControls';
import { MessageSquare, Search, Trash2, Star, Loader2, X } from 'lucide-react';

export const AdminReviewsPage: React.FC = () => {
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pageNumber, setPageNumber] = useState(1);
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
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog'] });
        },
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
                        <MessageSquare className="w-6 h-6 text-red-500" />
                        <span>Community Reviews Moderation</span>
                    </h1>
                    <p className="text-xs text-neutral-400 mt-0.5">
                        Search and moderate all tasting notes across the catalog.
                    </p>
                </div>
            </div>

            {/* Search Input */}
            <div className="relative max-w-md">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by username, drink, or comment..."
                    className="w-full pl-10 pr-9 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Content List */}
            {isLoading ? (
                <div className="py-24 flex flex-col items-center justify-center text-neutral-500 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                    <span className="text-xs">Loading reviews...</span>
                </div>
            ) : pagedReviews && pagedReviews.items.length > 0 ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {pagedReviews.items.map((rev) => (
                            <div
                                key={rev.id}
                                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between gap-3 text-xs shadow-md"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <div>
                                            <strong className="text-sm font-bold text-white block">
                                                {rev.drinkName}
                                            </strong>
                                            <span className="text-neutral-400 text-[11px]">
                                                by <strong className="text-neutral-200">{rev.username}</strong>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-amber-400 font-bold shrink-0">
                                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                                            <span>{rev.rating}/5</span>
                                        </div>
                                    </div>
                                    {rev.comment && (
                                        <p className="text-neutral-300 leading-relaxed mt-1">
                                            &quot;{rev.comment}&quot;
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-[11px] text-neutral-500">
                                    <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (window.confirm(`Delete review from ${rev.username}?`)) {
                                                deleteMutation.mutate(rev.id);
                                            }
                                        }}
                                        className="p-1.5 rounded-lg bg-neutral-950 hover:bg-red-950/70 border border-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
                                        title="Delete review"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
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
                <div className="py-16 text-center text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-3xl text-sm">
                    No reviews found matching your search.
                </div>
            )}
        </div>
    );
};