import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncApi } from '@/api/sync.api';
import {
    X,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Download,
    Image as ImageIcon,
    Database,
    Loader2,
    Sparkles,
} from 'lucide-react';

interface CocktailDbSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CocktailDbSyncModal: React.FC<CocktailDbSyncModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();

    const { data: status, isLoading } = useQuery({
        queryKey: ['cocktaildb-sync-status'],
        queryFn: syncApi.getCocktailDbSyncStatus,
        refetchInterval: (query) => (query.state.data?.isRunning ? 1500 : 8000),
        enabled: isOpen,
    });

    const startSyncMutation = useMutation({
        mutationFn: syncApi.startCocktailDbSync,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cocktaildb-sync-status'] });
        },
    });

    if (!isOpen) return null;

    const isRunning = status?.isRunning ?? false;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md">
            <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-red-600/15 border border-red-600/40 flex items-center justify-center text-red-500">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white">TheCocktailDB Harvester</h2>
                            <p className="text-xs text-neutral-400">
                                Import cocktails &amp; download secure WebP photos
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Status Box */}
                {isLoading ? (
                    <div className="py-12 flex justify-center text-neutral-500 text-xs gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                        <span>Checking status...</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Live Running Banner */}
                        {isRunning ? (
                            <div className="p-4 rounded-2xl bg-neutral-950 border border-red-600/40 space-y-3">
                                <div className="flex items-center justify-between text-xs font-bold text-white">
                                    <span className="flex items-center gap-2 text-red-500">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Scanning Letter: &quot;{status?.currentLetter}&quot;
                                    </span>
                                    <span className="font-mono text-neutral-400">
                                        {status?.processedDrinks} drinks checked
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-600 rounded-full animate-pulse w-full" />
                                </div>
                            </div>
                        ) : status?.completedAt ? (
                            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2.5">
                                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                                <span>
                                    Last scan completed at {new Date(status.completedAt).toLocaleTimeString()}.
                                </span>
                            </div>
                        ) : null}

                        {status?.lastError && (
                            <div className="p-3.5 rounded-2xl bg-red-950/50 border border-red-800 text-xs text-red-300 flex items-center gap-2.5">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                                <span>{status.lastError}</span>
                            </div>
                        )}

                        {/* Telemetry Counter Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                                <span className="text-neutral-400 flex items-center gap-1.5">
                                    <Database className="w-3.5 h-3.5 text-neutral-500" />
                                    New Cocktails
                                </span>
                                <strong className="text-lg font-black text-white font-mono block">
                                    +{status?.newDrinksAdded ?? 0}
                                </strong>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                                <span className="text-neutral-400 flex items-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
                                    Existing Updated
                                </span>
                                <strong className="text-lg font-black text-white font-mono block">
                                    {status?.existingDrinksUpdated ?? 0}
                                </strong>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                                <span className="text-neutral-400 flex items-center gap-1.5">
                                    <ImageIcon className="w-3.5 h-3.5 text-neutral-500" />
                                    WebP Photos Saved
                                </span>
                                <strong className="text-lg font-black text-emerald-400 font-mono block">
                                    {status?.imagesDownloaded ?? 0}
                                </strong>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                                <span className="text-neutral-400 flex items-center gap-1.5">
                                    <Download className="w-3.5 h-3.5 text-neutral-500" />
                                    Failed Images
                                </span>
                                <strong className="text-lg font-black text-neutral-400 font-mono block">
                                    {status?.failedImages ?? 0}
                                </strong>
                            </div>
                        </div>

                        {/* Security Notice */}
                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                            Images are automatically screened for SSRF, stripped of EXIF metadata, resized to 800x800, and converted to WebP format before being saved to local storage.
                        </p>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors"
                    >
                        Close
                    </button>

                    <button
                        type="button"
                        onClick={() => startSyncMutation.mutate()}
                        disabled={isRunning || startSyncMutation.isPending}
                        className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all active:scale-95"
                    >
                        {isRunning ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Scanning in Background...</span>
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Start Alphabet Scan (A-Z)</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};