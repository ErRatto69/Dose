import React, { useEffect, useId } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDialogModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialogModal: React.FC<ConfirmDialogModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDestructive = false,
    isLoading = false,
    onConfirm,
    onCancel,
}) => {
    const titleId = useId();
    const descId = useId();

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) onCancel();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, isLoading, onCancel]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm dose-backdrop-enter"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !isLoading) onCancel();
            }}
        >
            <div
                className="w-full max-w-sm bg-[#111114] border border-white/12 rounded-2xl p-6 shadow-2xl space-y-4 dose-dialog-enter"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
            >
                <div className="flex items-start justify-between gap-3">
                    <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            isDestructive
                                ? 'bg-red-600/15 border-red-600/35 text-red-400'
                                : 'bg-amber-600/15 border-amber-500/35 text-amber-400'
                        }`}
                    >
                        <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center dose-press"
                        aria-label="Close dialog"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                <div>
                    <h3 id={titleId} className="text-base font-extrabold text-white leading-snug">
                        {title}
                    </h3>
                    <p id={descId} className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0c0c0f] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-300 text-xs font-bold dose-press"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 dose-press ${
                            isDestructive
                                ? 'bg-red-600 hover:bg-red-500 text-white'
                                : 'bg-zinc-100 text-zinc-950 hover:bg-white'
                        }`}
                    >
                        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                        <span>{confirmLabel}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
