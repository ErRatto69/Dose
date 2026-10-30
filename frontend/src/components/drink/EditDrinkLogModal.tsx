import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { RecentTimePicker } from '@/components/common/RecentTimePicker';
import type { DrinkEvent, CustomIngredientDose, StomachState } from '@/types';
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
    const [stomachState, setStomachState] = useState<StomachState>('LightSnack');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (event) {
            setCustomName(event.drinkName);
            setNotes(event.notes || '');
            setConsumedAt(event.consumedAt);
            setStomachState(event.stomachState || 'LightSnack');
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
                stomachState,
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-neutral-950/80 backdrop-blur-md">
            <div
                className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                role="dialog"
                aria-modal="true"
            >
                {/* Pinned Sticky Header */}
                <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900 shrink-0">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                            Log Entry
                        </span>
                        <h2 className="text-xl font-black text-white leading-tight">Edit Drink Log</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <form
                    id="edit-drink-log-form"
                    onSubmit={handleSave}
                    className="p-5 overflow-y-auto space-y-4 flex-1"
                >
                    {errorMsg && (
                        <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

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

                    {/* Stomach Condition */}
                    <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                            Stomach Condition
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(
                                [
                                    { value: 'Empty', label: 'Empty' },
                                    { value: 'LightSnack', label: 'Snack' },
                                    { value: 'FullMeal', label: 'Full Meal' },
                                ] as const
                            ).map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setStomachState(item.value)}
                                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                        stomachState === item.value
                                            ? 'bg-red-600 text-white border-red-500 shadow-sm shadow-red-600/30'
                                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

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
                            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
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
                                                className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-14 text-center font-mono font-bold text-red-400">
                                                {d.amountCl} cl
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateAmount(d.ingredientId, 0.5)}
                                                className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white"
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
                </form>

                {/* Pinned Sticky Footer Actions */}
                <div className="p-4 sm:p-5 bg-neutral-900 border-t border-neutral-800 flex items-center justify-end gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="edit-drink-log-form"
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/25 transition-all active:scale-95"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                        )}
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>
    );
};