import React from 'react';
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
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-in fade-in duration-150">
            <div
                className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-start justify-between gap-3">
                    <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                            isDestructive
                                ? 'bg-red-600/15 border-red-600/30 text-red-500'
                                : 'bg-amber-600/15 border-amber-600/30 text-amber-500'
                        }`}
                    >
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors"
                        aria-label="Close dialog"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div>
                    <h3 className="text-base font-bold text-white leading-snug">{title}</h3>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{message}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-bold transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${
                            isDestructive
                                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                                : 'bg-neutral-100 text-neutral-950 hover:bg-white'
                        }`}
                    >
                        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>{confirmLabel}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};