import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { bacApi } from '@/api/bac.api';
import { useAuthStore } from '@/store/useAuthStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { BacGaugeCard } from '@/components/safety/BacGaugeCard';
import type { BiologicalSex } from '@/types';
import { UserCircle, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
    const { user, updateUser } = useAuthStore();
    const { preferredUnit, setUnit } = usePreferencesStore();
    const queryClient = useQueryClient();

    const [weightKg, setWeightKg] = useState<string>(String(user?.weightKg ?? 75));
    const [heightCm, setHeightCm] = useState<string>(String(user?.heightCm ?? 175));
    const [sex, setSex] = useState<BiologicalSex>(
        String(user?.sex) === '1' || user?.sex === 'Female' ? 'Female' : 'Male'
    );
    const [birthYear, setBirthYear] = useState<string>(user?.birthYear ? String(user.birthYear) : '1998');
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const { data: freshProfile } = useQuery({
        queryKey: ['my-profile'],
        queryFn: usersApi.getMe,
    });

    const { data: bacData } = useQuery({
        queryKey: ['my-bac-status'],
        queryFn: bacApi.getMyBac,
    });

    useEffect(() => {
        if (freshProfile) {
            setWeightKg(String(freshProfile.weightKg));
            setHeightCm(String(freshProfile.heightCm));
            setSex(
                String(freshProfile.sex) === '1' || freshProfile.sex === 'Female' ? 'Female' : 'Male'
            );
            setBirthYear(freshProfile.birthYear ? String(freshProfile.birthYear) : '');
            updateUser(freshProfile);
        }
    }, [freshProfile, updateUser]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            setErrorMsg(null);
            setSavedSuccess(false);
            return usersApi.updateMyBiometrics({
                weightKg: Number(weightKg),
                heightCm: Number(heightCm),
                sex,
                birthYear: birthYear ? Number(birthYear) : null,
                preferredUnit: preferredUnit === 'oz' ? 'Oz' : 'Cl',
            });
        },
        onSuccess: (updated) => {
            updateUser(updated);
            setSavedSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['my-bac-status'] });
            setTimeout(() => setSavedSuccess(false), 3000);
        },
        onError: () => {
            setErrorMsg('Please enter valid biometrics (Weight: 30-250kg, Height: 100-230cm).');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate();
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Account &amp; Biometrics
                </span>
                <h1 className="text-2xl font-black text-white">My Profile &amp; BAC Settings</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                    Your weight, height, and biological sex are used in the Widmark-Watson formula to compute your real-time Blood Alcohol Content.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Biometrics Form */}
                <form
                    onSubmit={handleSubmit}
                    className="lg:col-span-7 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-lg"
                >
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <UserCircle className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{user?.username}</h2>
                            <p className="text-xs text-slate-400">
                                {user?.email} • <span className="text-amber-400 font-semibold">{user?.role}</span>
                            </p>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {savedSuccess && (
                        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Biometrics updated! Your BAC curve has been recalculated.</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                Weight (kg)
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                min="30"
                                max="250"
                                required
                                value={weightKg}
                                onChange={(e) => setWeightKg(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                Height (cm)
                            </label>
                            <input
                                type="number"
                                step="1"
                                min="100"
                                max="230"
                                required
                                value={heightCm}
                                onChange={(e) => setHeightCm(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                Biological Sex
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['Male', 'Female'] as BiologicalSex[]).map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setSex(option)}
                                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                                            sex === option
                                                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                Birth Year
                            </label>
                            <input
                                type="number"
                                min="1920"
                                max="2010"
                                value={birthYear}
                                onChange={(e) => setBirthYear(e.target.value)}
                                placeholder="e.g. 1998"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                            Preferred Volume Unit
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-w-xs">
                            {(['cl', 'oz'] as const).map((u) => (
                                <button
                                    key={u}
                                    type="button"
                                    onClick={() => setUnit(u)}
                                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                        preferredUnit === u
                                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                            : 'bg-slate-950 border-slate-800 text-slate-400'
                                    }`}
                                >
                                    {u === 'cl' ? 'Centiliters (cl)' : 'Fluid Ounces (oz)'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                    >
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving Changes...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Biometrics &amp; Preferences
                            </>
                        )}
                    </button>
                </form>

                {/* Right Column: Live BAC Preview */}
                <div className="lg:col-span-5 space-y-4">
                    {bacData && (
                        <BacGaugeCard
                            bacGramsPerLiter={bacData.currentBacGramsPerLiter}
                            bacGramsPerDl={bacData.currentBacGramsPerDl}
                            safetyLevel={bacData.safetyLevel}
                            safetyMessage={bacData.safetyMessage}
                            estimatedSoberAt={bacData.estimatedSoberAt}
                            totalAlcoholGramsLast12h={bacData.totalAlcoholGramsLast12h}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};