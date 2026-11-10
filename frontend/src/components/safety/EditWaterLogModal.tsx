import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { queryKeys } from '@/api/queryKeys';
import { RecentTimePicker } from '@/components/common/RecentTimePicker';
import { ModalShell } from '@/components/common/ModalShell';
import type { WaterEvent } from '@/types';
import { Droplets, Check, Loader2, Plus, Minus, AlertCircle } from 'lucide-react';

interface EditWaterLogModalProps {
    event: WaterEvent | null;
    isOpen: boolean;
    onClose: () => void;
}

const WATER_PRESETS = [
    { cl: 20 },
    { cl: 25 },
    { cl: 33 },
    { cl: 50 },
    { cl: 75 },
    { cl: 100 },
];

interface EditWaterLogFormProps {
    event: WaterEvent;
    onClose: () => void;
    onSubmittingChange: (submitting: boolean) => void;
    isSubmitting: boolean;
}

const EditWaterLogForm: React.FC<EditWaterLogFormProps> = ({
    event,
    onClose,
    onSubmittingChange,
}) => {
    const queryClient = useQueryClient();
    const [amountCl, setAmountCl] = useState<number>(event.amountCl);
    const [consumedAt, setConsumedAt] = useState<string>(event.consumedAt);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
            onSubmittingChange(true);
            await bacApi.updateWaterLog(event.id, amountCl, targetDate.toISOString());
            queryClient.invalidateQueries({ queryKey: queryKeys.bac.me() });
            queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.monthly() });
            queryClient.invalidateQueries({ queryKey: queryKeys.gamification.monthlyBadges() });
            onClose();
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { detail?: string } } };
                setErrorMsg(axiosErr.response?.data?.detail || 'Failed to update water log.');
            } else {
                setErrorMsg('Network error updating log.');
            }
        } finally {
            onSubmittingChange(false);
        }
    };

    return (
        <form id="edit-water-log-form" onSubmit={handleSave} className="space-y-4">
            {errorMsg && (
                <div
                    role="alert"
                    className="p-3 rounded-xl bg-red-950/60 border border-red-700/60 text-red-200 text-xs flex items-center gap-2"
                >
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" aria-hidden="true" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <div className="p-4 rounded-2xl bg-[#0c0c0f] border border-white/[0.08] flex items-center justify-between">
                <div>
                    <span className="text-[11px] text-zinc-400 block">Water Volume</span>
                    <strong className="text-xl font-extrabold tabular-nums text-sky-400">
                        {amountCl} cl
                    </strong>
                    <span className="text-[11px] text-zinc-400 block tabular-nums">
                        {amountCl * 10} ml
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setAmountCl((prev) => Math.max(5, prev - 5))}
                        aria-label="Decrease water by 5 cl"
                        className="w-9 h-9 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-zinc-200 flex items-center justify-center dose-press"
                    >
                        <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setAmountCl((prev) => Math.min(200, prev + 5))}
                        aria-label="Increase water by 5 cl"
                        className="w-9 h-9 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-zinc-200 flex items-center justify-center dose-press"
                    >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
                {WATER_PRESETS.map((p) => (
                    <button
                        key={p.cl}
                        type="button"
                        aria-pressed={amountCl === p.cl}
                        onClick={() => setAmountCl(p.cl)}
                        className={`min-h-[38px] py-1.5 px-2 rounded-xl text-xs font-bold border tabular-nums dose-press ${
                            amountCl === p.cl
                                ? 'bg-sky-950/60 border-sky-500 text-white'
                                : 'bg-[#0c0c0f] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        {p.cl} cl
                    </button>
                ))}
            </div>

            <RecentTimePicker
                value={consumedAt}
                onChange={(isoStr) => setConsumedAt(isoStr)}
                showNowOption={false}
                label="Time Consumed"
            />
        </form>
    );
};

export const EditWaterLogModal: React.FC<EditWaterLogModalProps> = ({ event, isOpen, onClose }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!event) return null;

    const footer = (
        <div className="flex justify-end gap-2">
            <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-zinc-300 text-xs font-bold dose-press"
            >
                Cancel
            </button>
            <button
                type="submit"
                form="edit-water-log-form"
                disabled={isSubmitting}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-extrabold flex items-center gap-1.5 border border-sky-400/40 dose-press"
            >
                {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                )}
                <span>Save Changes</span>
            </button>
        </div>
    );

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Water Log"
            badge={
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400">
                    <Droplets className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Hydration Entry</span>
                </span>
            }
            maxWidthClass="max-w-sm"
            footer={footer}
            closeDisabled={isSubmitting}
        >
            <EditWaterLogForm
                key={event.id}
                event={event}
                onClose={onClose}
                isSubmitting={isSubmitting}
                onSubmittingChange={setIsSubmitting}
            />
        </ModalShell>
    );
};
