import React, { useMemo, useState } from 'react';
import { useDoseModalStore } from '@/store/useDoseModalStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatVolume } from '@/utils/units';
import { calculateStrengthMetrics, estimateDeltaBac } from '@/utils/strengthCalc';
import { BottleStrengthMeter } from './BottleStrengthMeter';
import { bacApi } from '@/api/bac.api';
import { X, Minus, Plus, Clock, Check, Loader2 } from 'lucide-react';

interface DoseCustomizerModalProps {
    onSuccessLogged?: () => void;
}

export const DoseCustomizerModal: React.FC<DoseCustomizerModalProps> = ({ onSuccessLogged }) => {
    const {
        isOpen,
        drink,
        components,
        timeOffsetMinutes,
        notes,
        closeModal,
        updateComponentDose,
        applyMultiplier,
        setTimeOffsetMinutes,
        setNotes,
    } = useDoseModalStore();

    const { preferredUnit } = usePreferencesStore();
    const { user } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const metrics = useMemo(() => {
        return calculateStrengthMetrics(
            components.map((c) => ({
                category: c.category,
                amountCl: c.amountCl,
                abvPercent: c.abv,
            }))
        );
    }, [components]);

    const deltaBacEstimate = useMemo(() => {
        if (!user) return 0;
        return estimateDeltaBac(
            metrics.pureAlcoholGrams,
            user.weightKg,
            user.heightCm,
            user.sex,
            user.birthYear
        );
    }, [metrics.pureAlcoholGrams, user]);

    if (!isOpen || !drink) return null;

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            const consumedAt = new Date(Date.now() - timeOffsetMinutes * 60 * 1000).toISOString();

            await bacApi.logDrink(drink.id, {
                consumedAt,
                notes: notes.trim() || undefined,
                customComponents: components.map((c) => ({
                    ingredientId: c.ingredientId,
                    amountCl: c.amountCl,
                })),
            });

            onSuccessLogged?.();
            closeModal();
        } catch (err) {
            console.error('Failed to log dose:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md">
            <div
                className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-200"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                    <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
              Customize &amp; Log
            </span>
                        <h2 className="text-xl font-bold text-white leading-tight">{drink.name}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={closeModal}
                        className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Real-time Telemetry Bar */}
                <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
                    <div>
                        <span className="text-slate-400 block">Total Volume</span>
                        <strong className="text-slate-200 text-sm">
                            {formatVolume(metrics.totalVolumeCl, preferredUnit)}
                        </strong>
                    </div>
                    <div className="text-center">
                        <span className="text-slate-400 block">Pure Alcohol</span>
                        <strong className="text-amber-400 text-sm">
                            {metrics.pureAlcoholGrams.toFixed(1)}g
                        </strong>
                    </div>
                    <div className="text-right">
                        <span className="text-slate-400 block">Estimated Δ BAC</span>
                        <strong className="text-rose-400 text-sm">
                            +{deltaBacEstimate.toFixed(2)} g/L
                        </strong>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="p-4 overflow-y-auto space-y-5 flex-1">
                    <BottleStrengthMeter
                        score1To10={metrics.bottleScore1To10}
                        bottleRating={metrics.bottleVisualRating}
                        abvPercent={metrics.abvPercent}
                        compact
                    />

                    {/* Quick Multiplier Presets */}
                    <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-2">
                            Quick Multipliers (Spirits)
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: '0.5x', text: 'Light', mult: 0.5 },
                                { label: '1.0x', text: 'Standard', mult: 1.0 },
                                { label: '1.5x', text: 'Generous', mult: 1.5 },
                                { label: '2.0x', text: 'Double', mult: 2.0 },
                            ].map((item) => (
                                <button
                                    key={item.mult}
                                    type="button"
                                    onClick={() => applyMultiplier(item.mult)}
                                    className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-xs font-medium text-slate-200 flex flex-col items-center active:scale-95 transition-transform"
                                >
                                    <span className="font-bold text-amber-400">{item.label}</span>
                                    <span className="text-[10px] text-slate-400">{item.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Ingredients Steppers */}
                    <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-2">
                            Ingredients &amp; Custom Doses
                        </label>
                        <div className="space-y-2">
                            {components.map((comp) => (
                                <div
                                    key={comp.ingredientId}
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800"
                                >
                                    <div className="flex-1 pr-2">
                                        <div className="text-sm font-semibold text-slate-200">{comp.name}</div>
                                        <div className="text-[11px] text-slate-400">
                                            {comp.category} {comp.abv > 0 && `• ${comp.abv}% ABV`}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => updateComponentDose(comp.ingredientId, -0.5)}
                                            disabled={comp.amountCl <= 0}
                                            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 disabled:opacity-40 active:scale-90 transition-transform"
                                            aria-label={`Decrease ${comp.name}`}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>

                                        <span className="w-16 text-center font-mono font-bold text-sm text-amber-300">
                      {formatVolume(comp.amountCl, preferredUnit) || '0 cl'}
                    </span>

                                        <button
                                            type="button"
                                            onClick={() => updateComponentDose(comp.ingredientId, 0.5)}
                                            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 active:scale-90 transition-transform"
                                            aria-label={`Increase ${comp.name}`}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* When did you drink? */}
                    <div>
                        <label className="text-xs font-semibold text-slate-400 flex items-center gap-1 mb-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            When did you drink this?
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: 'Now', offset: 0 },
                                { label: '15m ago', offset: 15 },
                                { label: '30m ago', offset: 30 },
                                { label: '1h ago', offset: 60 },
                            ].map((chip) => (
                                <button
                                    key={chip.offset}
                                    type="button"
                                    onClick={() => setTimeOffsetMinutes(chip.offset)}
                                    className={`py-2 text-xs font-medium rounded-lg border transition-all active:scale-95 ${
                                        timeOffsetMinutes === chip.offset
                                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                            : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <input
                            type="text"
                            placeholder="Add quick notes (e.g., party, venue)..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                        />
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="p-4 bg-slate-900 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || metrics.totalVolumeCl <= 0}
                        className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Logging Dose...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 stroke-[3]" />
                                Drink &amp; Log This Dose
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};