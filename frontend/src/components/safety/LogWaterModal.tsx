import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { queryKeys } from '@/api/queryKeys';
import { ModalShell } from '@/components/common/ModalShell';
import { Droplets, Check, Loader2, Plus, Minus, AlertCircle } from 'lucide-react';

interface LogWaterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WATER_PRESETS = [
    { label: 'Small Glass', cl: 20, desc: '200 ml' },
    { label: 'Standard Glass', cl: 25, desc: '250 ml' },
    { label: 'Can / Tall Glass', cl: 33, desc: '330 ml' },
    { label: 'Half-Liter Bottle', cl: 50, desc: '500 ml' },
    { label: 'Bottle (75 cl)', cl: 75, desc: '750 ml' },
    { label: 'Carafe (1 L)', cl: 100, desc: '1000 ml' },
];

export const LogWaterModal: React.FC<LogWaterModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [amountCl, setAmountCl] = useState<number>(25);

    const waterMutation = useMutation({
        mutationFn: () => bacApi.logWater(amountCl),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.bac.me() });
            queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.monthly() });
            queryClient.invalidateQueries({ queryKey: queryKeys.gamification.monthlyBadges() });
            queryClient.invalidateQueries({ queryKey: queryKeys.gamification.passport() });
            onClose();
        },
    });

    const footer = (
        <div className="flex items-center justify-end gap-2">
            <button
                type="button"
                onClick={onClose}
                disabled={waterMutation.isPending}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-zinc-300 text-xs font-bold dose-press"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={() => waterMutation.mutate()}
                disabled={waterMutation.isPending || amountCl <= 0}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1.5 border border-sky-400/40 tabular-nums dose-press"
            >
                {waterMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                )}
                <span>Log {amountCl} cl Water</span>
            </button>
        </div>
    );

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Log Water Intake"
            subtitle="Hydrate between drinks to reduce hangover risk and boost safe score."
            badge={
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400">
                    <Droplets className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Hydration Tracker</span>
                </span>
            }
            maxWidthClass="max-w-sm"
            footer={footer}
            closeDisabled={waterMutation.isPending}
        >
            <div className="space-y-4">
                {waterMutation.isError && (
                    <div
                        role="alert"
                        className="p-3 rounded-xl bg-red-950/60 border border-red-700/60 text-xs text-red-200 flex items-center gap-2"
                    >
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
                        <span>Could not log water intake. Please try again.</span>
                    </div>
                )}

                <div className="p-4 rounded-2xl bg-[#0c0c0f] border border-white/[0.08] flex items-center justify-between">
                    <div>
                        <span className="text-xs text-zinc-400 block">Selected Volume</span>
                        <strong className="text-2xl font-extrabold tabular-nums text-sky-400">
                            {amountCl} <span className="text-sm font-semibold text-zinc-200">cl</span>
                        </strong>
                        <span className="text-[11px] text-zinc-400 block tabular-nums">
                            {amountCl * 10} ml · {(amountCl / 100).toFixed(2)} L
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setAmountCl((prev) => Math.max(5, prev - 5))}
                            aria-label="Decrease water by 5 cl"
                            className="w-10 h-10 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-zinc-200 flex items-center justify-center dose-press"
                        >
                            <Minus className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setAmountCl((prev) => Math.min(200, prev + 5))}
                            aria-label="Increase water by 5 cl"
                            className="w-10 h-10 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-zinc-200 flex items-center justify-center dose-press"
                        >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <div>
                    <span className="text-xs font-bold text-zinc-300 block mb-2">
                        Quick Container Presets
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                        {WATER_PRESETS.map((preset) => (
                            <button
                                key={preset.cl}
                                type="button"
                                aria-pressed={amountCl === preset.cl}
                                onClick={() => setAmountCl(preset.cl)}
                                className={`min-h-[54px] p-3 rounded-xl border text-left flex flex-col justify-between dose-press ${
                                    amountCl === preset.cl
                                        ? 'bg-sky-950/60 border-sky-500 text-white'
                                        : 'bg-[#0c0c0f] border-white/[0.08] text-zinc-300 hover:border-white/20'
                                }`}
                            >
                                <span className="text-xs font-bold">{preset.label}</span>
                                <span className="text-[11px] text-sky-400 tabular-nums mt-0.5 font-semibold">
                                    {preset.cl} cl ({preset.desc})
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </ModalShell>
    );
};
