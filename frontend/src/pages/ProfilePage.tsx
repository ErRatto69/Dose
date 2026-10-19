import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { drinksApi } from '@/api/drinks.api';
import { bacApi } from '@/api/bac.api';
import { useAuthStore } from '@/store/useAuthStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { BacGaugeCard } from '@/components/safety/BacGaugeCard';
import { PaginationControls } from '@/components/common/PaginationControls';
import type { BiologicalSex } from '@/types';
import {
    UserCircle,
    Save,
    CheckCircle2,
    AlertCircle,
    Loader2,
    MessageSquare,
    Star,
    Trash2,
} from 'lucide-react';

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
    const [reviewsPage, setReviewsPage] = useState(1);

    const { data: freshProfile } = useQuery({
        queryKey: ['my-profile'],
        queryFn: usersApi.getMe,
    });

    const { data: bacData } = useQuery({
        queryKey: ['my-bac-status'],
        queryFn: bacApi.getMyBac,
    });

    const { data: myReviews } = useQuery({
        queryKey: ['my-reviews', reviewsPage],
        queryFn: () => usersApi.getMyReviews(reviewsPage, 6),
    });

    const deleteReviewMutation = useMutation({
        mutationFn: (id: string) => drinksApi.deleteReview(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog'] });
        },
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

    return (
        <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl">
                <h1 className="text-2xl sm:text-3xl font-black text-white">Profile &amp; Settings</h1>
                <p className="text-xs text-neutral-400 mt-0.5">
                    Manage biometrics for BAC calculations and review tasting notes.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Biometrics Form */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        updateMutation.mutate();
                    }}
                    className="lg:col-span-7 p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-5 shadow-xl"
                >
                    <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
                        <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-600/40 flex items-center justify-center text-red-500">
                            <UserCircle className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{user?.username}</h2>
                            <p className="text-xs text-neutral-400">
                                {user?.email} • <span className="text-red-500 font-semibold">{user?.role}</span>
                            </p>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {savedSuccess && (
                        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Biometrics updated successfully!</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
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
                                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-red-600"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
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
                                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-red-600"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
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
                                                ? 'bg-red-600/20 border-red-600 text-red-300'
                                                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                                        }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                                Birth Year
                            </label>
                            <input
                                type="number"
                                min="1920"
                                max="2010"
                                value={birthYear}
                                onChange={(e) => setBirthYear(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-red-600"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                            Volume Unit
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-w-xs">
                            {(['cl', 'oz'] as const).map((u) => (
                                <button
                                    key={u}
                                    type="button"
                                    onClick={() => setUnit(u)}
                                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                        preferredUnit === u
                                            ? 'bg-red-600/20 border-red-600 text-red-300'
                                            : 'bg-neutral-950 border-neutral-800 text-neutral-400'
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
                        className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 transition-all"
                    >
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Profile Settings
                            </>
                        )}
                    </button>
                </form>

                {/* Right: BAC Gauge Preview */}
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

            {/* My Reviews Section (Paginated) */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-red-500" />
                    <h2 className="text-lg font-bold text-white">
                        My Tasting Reviews {myReviews ? `(${myReviews.totalCount})` : ''}
                    </h2>
                </div>

                {myReviews && myReviews.items.length > 0 ? (
                    <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {myReviews.items.map((rev) => (
                                <div
                                    key={rev.id}
                                    className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between gap-3 text-xs"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <strong className="text-sm font-bold text-white">
                                                {rev.drinkName}
                                            </strong>
                                            <div className="flex items-center gap-1 text-amber-400 font-bold">
                                                <Star className="w-3.5 h-3.5 fill-amber-400" />
                                                <span>{rev.rating}/5</span>
                                            </div>
                                        </div>
                                        {rev.comment && (
                                            <p className="text-neutral-300 leading-relaxed mt-1">
                                                &quot;{rev.comment}&quot;
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-[11px] text-neutral-500">
                                        <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (window.confirm('Delete this review?')) {
                                                    deleteReviewMutation.mutate(rev.id);
                                                }
                                            }}
                                            className="text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <PaginationControls
                            pageNumber={myReviews.pageNumber}
                            totalPages={myReviews.totalPages}
                            totalCount={myReviews.totalCount}
                            hasPreviousPage={myReviews.hasPreviousPage}
                            hasNextPage={myReviews.hasNextPage}
                            onPageChange={(page) => setReviewsPage(page)}
                            itemLabel="reviews"
                        />
                    </div>
                ) : (
                    <p className="text-xs text-neutral-500 py-4">
                        You have not reviewed any cocktails yet.
                    </p>
                )}
            </div>
        </div>
    );
};