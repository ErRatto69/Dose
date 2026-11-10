import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
    pageNumber: number;
    totalPages: number;
    totalCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    onPageChange: (newPage: number) => void;
    itemLabel?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
    pageNumber,
    totalPages,
    totalCount,
    hasPreviousPage,
    hasNextPage,
    onPageChange,
    itemLabel = 'items',
}) => {
    if (totalPages <= 1) return null;

    return (
        <nav
            aria-label="Pagination"
            className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/[0.08] text-xs"
        >
            <span className="text-zinc-400 tabular-nums">
                Page <strong className="text-white">{pageNumber}</strong> of{' '}
                <strong className="text-white">{totalPages}</strong> ({totalCount} {itemLabel})
            </span>

            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onPageChange(pageNumber - 1)}
                    disabled={!hasPreviousPage}
                    aria-label="Previous page"
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#111114] hover:bg-[#18181d] disabled:opacity-40 border border-white/[0.08] text-zinc-300 font-bold flex items-center gap-1 dose-press"
                >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    <span>Prev</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - pageNumber) <= 1)
                        .map((page, idx, array) => {
                            const prev = array[idx - 1];
                            const showEllipsis = prev && page - prev > 1;

                            return (
                                <React.Fragment key={page}>
                                    {showEllipsis && (
                                        <span className="text-zinc-500 px-1" aria-hidden="true">…</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onPageChange(page)}
                                        aria-label={`Page ${page}`}
                                        aria-current={pageNumber === page ? 'page' : undefined}
                                        className={`min-w-[36px] min-h-[36px] rounded-xl font-bold text-xs tabular-nums dose-press ${
                                            pageNumber === page
                                                ? 'bg-red-600 text-white border border-red-500/50'
                                                : 'bg-[#111114] text-zinc-400 hover:text-white border border-white/[0.08]'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                </React.Fragment>
                            );
                        })}
                </div>

                <button
                    type="button"
                    onClick={() => onPageChange(pageNumber + 1)}
                    disabled={!hasNextPage}
                    aria-label="Next page"
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#111114] hover:bg-[#18181d] disabled:opacity-40 border border-white/[0.08] text-zinc-300 font-bold flex items-center gap-1 dose-press"
                >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
            </div>
        </nav>
    );
};
