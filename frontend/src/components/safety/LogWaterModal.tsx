import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { X, Droplets, Check, Loader2, Plus, Minus } from 'lucide-react';

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
    { label: 'Carafe / 1 Liter', cl: 100, desc: '1000 ml' },
];

export const LogWaterModal: React.FC<LogWaterModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [amountCl, setAmountCl] = useState<number>(25);

    const waterMutation = useMutation({
        mutationFn: () => bacApi.logWater(amountCl),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-bac-status'] });
            onClose();
        },
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md">
            <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-sky-950/70 border border-sky-600/40 flex items-center justify-center text-sky-400">
                            <Droplets className="w-5 h-5 fill-sky-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Log Water Intake</h2>
                            <p className="text-xs text-neutral-400">Hydrate to lower hangover risk &amp; raise safe score</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Amount Selector Display */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-neutral-400 block">Selected Volume</span>
                        <strong className="text-2xl font-black font-mono text-sky-400">
                            {amountCl} <span className="text-sm font-sans text-neutral-300">cl</span>
                        </strong>
                        <span className="text-[11px] text-neutral-500 block">
                            ({amountCl * 10} ml • {(amountCl / 100).toFixed(2)} L)
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setAmountCl((prev) => Math.max(5, prev - 5))}
                            className="w-9 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 flex items-center justify-center transition-all active:scale-95"
                            title="Decrease 5 cl"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setAmountCl((prev) => Math.min(200, prev + 5))}
                            className="w-9 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 flex items-center justify-center transition-all active:scale-95"
                            title="Increase 5 cl"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Container Preset Chips */}
                <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-2">
                        Quick Container Presets
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {WATER_PRESETS.map((preset) => (
                            <button
                                key={preset.cl}
                                type="button"
                                onClick={() => setAmountCl(preset.cl)}
                                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                    amountCl === preset.cl
                                        ? 'bg-sky-950/60 border-sky-500 text-white shadow-sm'
                                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                                }`}
                            >
                                <span className="text-xs font-bold">{preset.label}</span>
                                <span className="text-[10px] text-sky-400 font-mono mt-0.5">
                                    {preset.cl} cl ({preset.desc})
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => waterMutation.mutate()}
                        disabled={waterMutation.isPending || amountCl <= 0}
                        className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-600/30 transition-all active:scale-95"
                    >
                        {waterMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                        )}
                        <span>Log {amountCl} cl Water</span>
                    </button>
                </div>
            </div>
        </div>
    );
};