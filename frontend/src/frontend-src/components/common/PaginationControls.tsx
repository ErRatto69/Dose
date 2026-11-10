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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-neutral-800 text-xs">
            <span className="text-neutral-400">
                Showing page <strong className="text-white">{pageNumber}</strong> of{' '}
                <strong className="text-white">{totalPages}</strong> ({totalCount} {itemLabel})
            </span>

            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onPageChange(pageNumber - 1)}
                    disabled={!hasPreviousPage}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 border border-neutral-800 text-neutral-300 font-bold flex items-center gap-1 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                </button>

                <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - pageNumber) <= 1)
                        .map((page, idx, array) => {
                            const prev = array[idx - 1];
                            const showEllipsis = prev && page - prev > 1;

                            return (
                                <React.Fragment key={page}>
                                    {showEllipsis && (
                                        <span className="text-neutral-600 px-1">...</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onPageChange(page)}
                                        className={`w-7 h-7 rounded-lg font-bold text-xs transition-all ${
                                            pageNumber === page
                                                ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                                                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
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
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 border border-neutral-800 text-neutral-300 font-bold flex items-center gap-1 transition-colors"
                >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};