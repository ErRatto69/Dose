import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncApi } from '@/api/sync.api';
import { ModalShell } from '@/components/common/ModalShell';
import {
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

    const isRunning = status?.isRunning ?? false;

    const footer = (
        <div className="flex items-center justify-end gap-2">
            <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-zinc-300 text-xs font-bold dose-press"
            >
                Close
            </button>

            <button
                type="button"
                onClick={() => startSyncMutation.mutate()}
                disabled={isRunning || startSyncMutation.isPending}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1.5 border border-red-500/50 dose-press"
            >
                {isRunning ? (
                    <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        <span>Scanning in Background…</span>
                    </>
                ) : (
                    <>
                        <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Start Alphabet Scan (A–Z)</span>
                    </>
                )}
            </button>
        </div>
    );

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="TheCocktailDB Harvester"
            subtitle="Import public cocktail recipes and convert images locally to WebP."
            badge={
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400">
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Catalog Sync</span>
                </span>
            }
            maxWidthClass="max-w-lg"
            footer={footer}
        >
            {isLoading ? (
                <div className="py-12 flex justify-center items-center text-zinc-400 text-xs gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-red-500" aria-hidden="true" />
                    <span>Checking harvester status…</span>
                </div>
            ) : (
                <div className="space-y-4">
                    {isRunning ? (
                        <div
                            role="status"
                            aria-live="polite"
                            className="p-4 rounded-2xl bg-[#0c0c0f] border border-red-500/45 space-y-2.5"
                        >
                            <div className="flex items-center justify-between text-xs font-bold text-white">
                                <span className="flex items-center gap-2 text-red-400">
                                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                    <span>Scanning letter &ldquo;{status?.currentLetter}&rdquo;</span>
                                </span>
                                <span className="tabular-nums text-zinc-300">
                                    {status?.processedDrinks} processed
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-[#111114] rounded-full overflow-hidden">
                                <div className="h-full bg-red-600 rounded-full w-full opacity-80" />
                            </div>
                        </div>
                    ) : status?.completedAt ? (
                        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-700/50 text-xs text-emerald-200 flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" aria-hidden="true" />
                            <span className="tabular-nums">
                                Last scan completed at {new Date(status.completedAt).toLocaleTimeString()}.
                            </span>
                        </div>
                    ) : null}

                    {status?.lastError && (
                        <div
                            role="alert"
                            className="p-3.5 rounded-2xl bg-red-950/60 border border-red-700/60 text-xs text-red-200 flex items-center gap-2.5"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" aria-hidden="true" />
                            <span>{status.lastError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-2xl bg-[#0c0c0f] border border-white/[0.08] space-y-1">
                            <span className="text-zinc-400 flex items-center gap-1.5">
                                <Database className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                                <span>New Cocktails</span>
                            </span>
                            <strong className="text-lg font-extrabold text-white tabular-nums block">
                                +{status?.newDrinksAdded ?? 0}
                            </strong>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-[#0c0c0f] border border-white/[0.08] space-y-1">
                            <span className="text-zinc-400 flex items-center gap-1.5">
                                <RefreshCw className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                                <span>Updated</span>
                            </span>
                            <strong className="text-lg font-extrabold text-white tabular-nums block">
                                {status?.existingDrinksUpdated ?? 0}
                            </strong>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-[#0c0c0f] border border-white/[0.08] space-y-1">
                            <span className="text-zinc-400 flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                                <span>WebP Photos</span>
                            </span>
                            <strong className="text-lg font-extrabold text-emerald-400 tabular-nums block">
                                {status?.imagesDownloaded ?? 0}
                            </strong>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-[#0c0c0f] border border-white/[0.08] space-y-1">
                            <span className="text-zinc-400 flex items-center gap-1.5">
                                <Download className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                                <span>Failed Images</span>
                            </span>
                            <strong className="text-lg font-extrabold text-zinc-300 tabular-nums block">
                                {status?.failedImages ?? 0}
                            </strong>
                        </div>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                        Downloaded photos are SSRF-screened, stripped of EXIF metadata, resized to 800×800, and stored locally as WebP.
                    </p>
                </div>
            )}
        </ModalShell>
    );
};
