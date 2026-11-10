import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';

interface ModalShellProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: React.ReactNode;
    badge?: React.ReactNode;
    maxWidthClass?: string;
    subheader?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
    closeDisabled?: boolean;
    mobileBottomSheet?: boolean;
}

export const ModalShell: React.FC<ModalShellProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    badge,
    maxWidthClass = 'max-w-xl',
    subheader,
    footer,
    children,
    closeDisabled = false,
    mobileBottomSheet = true,
}) => {
    const titleId = useId();

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !closeDisabled) {
                onClose();
            }
        };

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, closeDisabled]);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex justify-center bg-black/75 backdrop-blur-sm dose-backdrop-enter ${
                mobileBottomSheet ? 'items-end sm:items-center p-0 sm:p-4' : 'items-center p-4'
            }`}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !closeDisabled) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={`w-full ${maxWidthClass} bg-[#111114] border border-white/10 max-h-[92vh] max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden ${
                    mobileBottomSheet
                        ? 'rounded-t-3xl sm:rounded-2xl dose-sheet-enter'
                        : 'rounded-2xl dose-dialog-enter'
                }`}
            >
                {mobileBottomSheet && (
                    <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-[#111114] shrink-0" aria-hidden="true">
                        <div className="w-9 h-1 rounded-full bg-white/20" />
                    </div>
                )}

                <div className="px-5 py-4 border-b border-white/[0.08] flex items-start justify-between gap-4 bg-[#111114] shrink-0">
                    <div className="min-w-0 flex-1">
                        {badge && <div className="mb-1.5 flex flex-wrap items-center gap-2">{badge}</div>}
                        <h2 id={titleId} className="text-lg sm:text-xl font-extrabold text-zinc-100 leading-tight text-balance">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={closeDisabled}
                        aria-label="Close modal"
                        className="w-10 h-10 -mr-1.5 -mt-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center shrink-0 dose-press disabled:opacity-40"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                {subheader && (
                    <div className="bg-[#0c0c0f] border-b border-white/[0.08] shrink-0">
                        {subheader}
                    </div>
                )}

                <div className="p-5 overflow-y-auto overscroll-contain flex-1">
                    {children}
                </div>

                {footer && (
                    <div
                        className={`px-5 py-4 bg-[#111114] border-t border-white/[0.08] shrink-0 ${
                            mobileBottomSheet ? 'pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4' : ''
                        }`}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};
