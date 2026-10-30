import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { RecentTimePicker } from '@/components/common/RecentTimePicker';
import type { WaterEvent } from '@/types';
import { X, Droplets, Check, Loader2, Plus, Minus, AlertCircle } from 'lucide-react';

interface EditWaterLogModalProps {
    event: WaterEvent | null;
    isOpen: boolean;
    onClose: () => void;
}

const WATER_PRESETS = [
    { label: 'Small Glass', cl: 20 },
    { label: 'Standard Glass', cl: 25 },
    { label: 'Can', cl: 33 },
    { label: 'Half Liter', cl: 50 },
    { label: 'Bottle (75cl)', cl: 75 },
    { label: '1 Liter', cl: 100 },
];

export const EditWaterLogModal: React.FC<EditWaterLogModalProps> = ({ event, isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [amountCl, setAmountCl] = useState<number>(25);
    const [consumedAt, setConsumedAt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (event) {
            setAmountCl(event.amountCl);
            setConsumedAt(event.consumedAt);
            setErrorMsg(null);
        }
    }, [event]);

    if (!isOpen || !event) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        const targetDate = new Date(consumedAt);
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

        if (
            targetDate.getTime() < twelveHoursAgo.getTime() ||
            targetDate.getTime() > Date.now() + 5 * 60 * 1000
        ) {
            setErrorMsg('Consumption time must be within the last 12 hours.');
            return;
        }

        try {
            setIsSubmitting(true);
            await bacApi.updateWaterLog(event.id, amountCl, targetDate.toISOString());
            queryClient.invalidateQueries({ queryKey: ['my-bac-status'] });
            onClose();
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { detail?: string } } };
                setErrorMsg(axiosErr.response?.data?.detail || 'Failed to update water log.');
            } else {
                setErrorMsg('Network error updating log.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md">
            <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-sky-950/70 border border-sky-600/40 flex items-center justify-center text-sky-400">
                            <Droplets className="w-4 h-4 fill-sky-400" />
                        </div>
                        <h2 className="text-base font-black text-white">Edit Water Log</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                    {/* Amount Adjuster */}
                    <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                        <div>
                            <span className="text-[11px] text-neutral-400 block">Water Volume</span>
                            <strong className="text-xl font-black font-mono text-sky-400">
                                {amountCl} cl
                            </strong>
                            <span className="text-[10px] text-neutral-500 block">
                                ({amountCl * 10} ml)
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setAmountCl((prev) => Math.max(5, prev - 5))}
                                className="w-8 h-8 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 flex items-center justify-center transition-all active:scale-95"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setAmountCl((prev) => Math.min(200, prev + 5))}
                                className="w-8 h-8 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 flex items-center justify-center transition-all active:scale-95"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-3 gap-1.5">
                        {WATER_PRESETS.map((p) => (
                            <button
                                key={p.cl}
                                type="button"
                                onClick={() => setAmountCl(p.cl)}
                                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                                    amountCl === p.cl
                                        ? 'bg-sky-950/60 border-sky-500 text-white'
                                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                                }`}
                            >
                                {p.cl} cl
                            </button>
                        ))}
                    </div>

                    {/* Time Picker */}
                    <RecentTimePicker
                        value={consumedAt}
                        onChange={(isoStr) => setConsumedAt(isoStr)}
                        showNowOption={false}
                        label="Time Consumed"
                    />

                    <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold hover:bg-neutral-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || amountCl <= 0}
                            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-600/30 transition-all active:scale-95"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};