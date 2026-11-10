import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { RecentTimePicker } from '@/components/common/RecentTimePicker';
import type { DrinkEvent, CustomIngredientDose } from '@/types';
import { X, Plus, Minus, Check, Loader2, AlertCircle } from 'lucide-react';

interface EditDrinkLogModalProps {
    event: DrinkEvent | null;
    isOpen: boolean;
    onClose: () => void;
}

export const EditDrinkLogModal: React.FC<EditDrinkLogModalProps> = ({ event, isOpen, onClose }) => {
    const queryClient = useQueryClient();

    const [doses, setDoses] = useState<Array<{ ingredientId: string; name: string; amountCl: number }>>([]);
    const [consumedAt, setConsumedAt] = useState('');
    const [notes, setNotes] = useState('');
    const [customName, setCustomName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (event) {
            setCustomName(event.drinkName);
            setNotes(event.notes || '');
            setConsumedAt(event.consumedAt);

            if (event.components && event.components.length > 0) {
                setDoses(
                    event.components
                        .filter((c) => c.ingredientId)
                        .map((c) => ({
                            ingredientId: c.ingredientId!,
                            name: c.name,
                            amountCl: c.amountCl,
                        }))
                );
            } else {
                setDoses([]);
            }
        }
    }, [event]);

    if (!isOpen || !event) return null;

    const updateAmount = (ingId: string, delta: number) => {
        setDoses((prev) =>
            prev.map((d) =>
                d.ingredientId === ingId
                    ? { ...d, amountCl: Math.max(0, Math.round((d.amountCl + delta) * 10) / 10) }
                    : d
            )
        );
    };

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

        const validComponents: CustomIngredientDose[] = doses
            .filter((d) => d.amountCl > 0)
            .map((d) => ({
                ingredientId: d.ingredientId,
                amountCl: d.amountCl,
            }));

        try {
            setIsSubmitting(true);
            await bacApi.updateDrinkLog(event.logId, {
                customName: customName.trim() || undefined,
                consumedAt: targetDate.toISOString(),
                notes: notes.trim() || undefined,
                components: validComponents.length > 0 ? validComponents : undefined,
            });

            queryClient.invalidateQueries({ queryKey: ['my-bac-status'] });
            queryClient.invalidateQueries({ queryKey: ['monthly-leaderboard'] });
            onClose();
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { detail?: string } } };
                setErrorMsg(axiosErr.response?.data?.detail || 'Failed to update drink log.');
            } else {
                setErrorMsg('Network error updating log.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <h2 className="text-lg font-black text-white">Edit Drink Log</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
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
                    <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                            Drink Label
                        </label>
                        <input
                            type="text"
                            required
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                        />
                    </div>

                    {/* Integrated Roller Wheel for consumption time */}
                    <RecentTimePicker
                        value={consumedAt}
                        onChange={(isoStr) => setConsumedAt(isoStr)}
                        showNowOption={false}
                        label="Time Consumed"
                    />

                    {doses.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-neutral-300 block">
                                Ingredient Doses
                            </label>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                {doses.map((d) => (
                                    <div
                                        key={d.ingredientId}
                                        className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                                    >
                                        <span className="font-semibold text-neutral-200 truncate pr-2">
                                            {d.name}
                                        </span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => updateAmount(d.ingredientId, -0.5)}
                                                className="w-6 h-6 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-12 text-center font-mono font-bold text-red-400">
                                                {d.amountCl} cl
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateAmount(d.ingredientId, 0.5)}
                                                className="w-6 h-6 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                            Notes (optional)
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes..."
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold hover:bg-neutral-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20"
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