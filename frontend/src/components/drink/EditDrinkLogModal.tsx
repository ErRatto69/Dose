import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bacApi } from '@/api/bac.api';
import { queryKeys } from '@/api/queryKeys';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { formatVolume } from '@/utils/units';
import { RecentTimePicker } from '@/components/common/RecentTimePicker';
import { ModalShell } from '@/components/common/ModalShell';
import type { DrinkEvent, CustomIngredientDose, StomachState } from '@/types';
import { Plus, Minus, Check, Loader2, AlertCircle } from 'lucide-react';

interface EditDrinkLogModalProps {
    event: DrinkEvent | null;
    isOpen: boolean;
    onClose: () => void;
}

interface EditDrinkLogFormProps {
    event: DrinkEvent;
    onClose: () => void;
    onSubmittingChange: (submitting: boolean) => void;
}

const EditDrinkLogForm: React.FC<EditDrinkLogFormProps> = ({
    event,
    onClose,
    onSubmittingChange,
}) => {
    const queryClient = useQueryClient();
    const { preferredUnit } = usePreferencesStore();
    const [doses, setDoses] = useState<Array<{ ingredientId: string; name: string; amountCl: number }>>(() =>
        event.components
            ? event.components
                  .filter((c) => c.ingredientId)
                  .map((c) => ({
                      ingredientId: c.ingredientId!,
                      name: c.name,
                      amountCl: c.amountCl,
                  }))
            : []
    );
    const [consumedAt, setConsumedAt] = useState<string>(event.consumedAt);
    const [notes, setNotes] = useState<string>(event.notes || '');
    const [customName, setCustomName] = useState<string>(event.drinkName);
    const [stomachState, setStomachState] = useState<StomachState>(event.stomachState || 'LightSnack');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
            onSubmittingChange(true);
            await bacApi.updateDrinkLog(event.logId, {
                customName: customName.trim() || undefined,
                consumedAt: targetDate.toISOString(),
                notes: notes.trim() || undefined,
                stomachState,
                components: validComponents.length > 0 ? validComponents : undefined,
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.bac.me() });
            queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.monthly() });
            queryClient.invalidateQueries({ queryKey: queryKeys.gamification.monthlyBadges() });
            onClose();
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { detail?: string } } };
                setErrorMsg(axiosErr.response?.data?.detail || 'Failed to update drink log.');
            } else {
                setErrorMsg('Network error updating log.');
            }
        } finally {
            onSubmittingChange(false);
        }
    };

    return (
        <form
            id="edit-drink-log-form"
            onSubmit={handleSave}
            className="space-y-4"
        >
            {errorMsg && (
                <div
                    role="alert"
                    className="p-3 rounded-xl bg-red-950/60 border border-red-700/60 text-red-200 text-xs flex items-center gap-2"
                >
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" aria-hidden="true" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <div>
                <label htmlFor="edit-drink-label" className="text-xs font-bold text-zinc-200 block mb-1.5">
                    Drink Label
                </label>
                <input
                    id="edit-drink-label"
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl text-xs dose-input"
                />
            </div>

            <div>
                <span className="text-xs font-bold text-zinc-200 block mb-1.5">
                    Stomach Condition
                </span>
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
                            aria-pressed={stomachState === item.value}
                            onClick={() => setStomachState(item.value)}
                            className={`min-h-[40px] py-2 rounded-xl text-xs font-bold border dose-press ${
                                stomachState === item.value
                                    ? 'bg-red-600 text-white border-red-500/70'
                                    : 'bg-[#0c0c0f] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
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
                    <span className="text-xs font-bold text-zinc-200 block">
                        Ingredient Doses
                    </span>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto overscroll-contain pr-1">
                        {doses.map((d) => (
                            <div
                                key={d.ingredientId}
                                className="p-2.5 rounded-xl bg-[#0c0c0f] border border-white/[0.08] flex items-center justify-between text-xs"
                            >
                                <span className="font-semibold text-zinc-100 truncate pr-2">
                                    {d.name}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => updateAmount(d.ingredientId, -0.5)}
                                        aria-label={`Decrease ${d.name}`}
                                        className="w-8 h-8 rounded-lg bg-[#111114] border border-white/[0.08] flex items-center justify-center text-zinc-200 dose-press"
                                    >
                                        <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                    <span className="w-16 text-center tabular-nums font-extrabold text-red-400">
                                        {formatVolume(d.amountCl, preferredUnit) || '0'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => updateAmount(d.ingredientId, 0.5)}
                                        aria-label={`Increase ${d.name}`}
                                        className="w-8 h-8 rounded-lg bg-[#111114] border border-white/[0.08] flex items-center justify-center text-zinc-200 dose-press"
                                    >
                                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <label htmlFor="edit-drink-notes" className="text-xs font-bold text-zinc-200 block mb-1.5">
                    Notes (optional)
                </label>
                <input
                    id="edit-drink-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes…"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl text-xs dose-input"
                />
            </div>
        </form>
    );
};

export const EditDrinkLogModal: React.FC<EditDrinkLogModalProps> = ({ event, isOpen, onClose }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!event) return null;

    const footer = (
        <div className="flex items-center justify-end gap-2">
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
                form="edit-drink-log-form"
                disabled={isSubmitting}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold flex items-center gap-1.5 border border-red-500/50 dose-press"
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
            title="Edit Drink Log"
            badge={<span className="text-xs font-bold text-red-400">12-Hour Log Entry</span>}
            maxWidthClass="max-w-lg"
            footer={footer}
            closeDisabled={isSubmitting}
        >
            <EditDrinkLogForm
                key={event.logId}
                event={event}
                onClose={onClose}
                onSubmittingChange={setIsSubmitting}
            />
        </ModalShell>
    );
};
