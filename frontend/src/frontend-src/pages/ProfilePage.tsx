import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Save,
    CheckCircle2,
    AlertCircle,
    Loader2,
    MessageSquare,
    Star,
    Trash2,
    LogOut,
    Sliders,
    X,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { user, updateUser, logout } = useAuthStore();
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
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

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

    const handleConfirmLogout = () => {
        queryClient.clear();
        logout();
        navigate('/login');
    };

    const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Profile, Biometrics & Preferences */}
                <div className="lg:col-span-7 space-y-6">
                    {/* User Card with Inline Sign Out */}
                    <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-red-600/40 flex items-center justify-center text-lg font-black text-red-500 shadow-inner">
                                {userInitial}
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white leading-tight flex items-center gap-2">
                                    <span>{user?.username}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/15 border border-red-600/30 text-red-400 font-semibold uppercase tracking-wider">
                                        {user?.role}
                                    </span>
                                </h1>
                                <p className="text-xs text-neutral-400 mt-0.5">{user?.email}</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsLogoutModalOpen(true)}
                            className="px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-red-950/40 border border-neutral-800 hover:border-red-600/40 text-neutral-400 hover:text-red-400 text-xs font-bold flex items-center gap-1.5 transition-all"
                            title="Sign out of your account"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out</span>
                        </button>
                    </div>

                    {/* Biometrics & Unit Settings Form */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            updateMutation.mutate();
                        }}
                        className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-5 shadow-xl"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                            <div>
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                                    Biometrics &amp; Units
                                </h2>
                                <p className="text-xs text-neutral-400 mt-0.5">
                                    Used for BAC metabolic rate calculations and recipe volume display.
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
                                <span>Settings saved successfully!</span>
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
                                            className={`py-2 rounded-xl text-xs font-bold border transition-all ${
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

                        {/* Integrated Segmented Volume Unit Control */}
                        <div className="pt-2 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                                    <Sliders className="w-3.5 h-3.5 text-red-500" />
                                    Volume Unit
                                </span>
                                <span className="text-[11px] text-neutral-500 block">
                                    Catalog recipes &amp; pour amounts
                                </span>
                            </div>

                            <div className="inline-flex p-1 bg-neutral-950 border border-neutral-800 rounded-xl self-start sm:self-auto">
                                {(
                                    [
                                        { unit: 'cl', label: 'cl' },
                                        { unit: 'oz', label: 'oz' },
                                    ] as const
                                ).map(({ unit, label }) => (
                                    <button
                                        key={unit}
                                        type="button"
                                        onClick={() => setUnit(unit)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            preferredUnit === unit
                                                ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                                                : 'text-neutral-400 hover:text-neutral-200'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 transition-all active:scale-[0.99]"
                        >
                            {updateMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Save Settings</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Right Column: BAC Gauge Card */}
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

            {/* Compact Logout Confirmation Dialog */}
            {isLogoutModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md">
                    <div
                        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-red-600/15 border border-red-600/30 flex items-center justify-center text-red-500">
                                <LogOut className="w-5 h-5" />
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsLogoutModalOpen(false)}
                                className="p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors"
                                aria-label="Close dialog"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div>
                            <h3 className="text-base font-bold text-white">Sign out of Dose?</h3>
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                                You will need your credentials to log back in and track drinks.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                            <button
                                type="button"
                                onClick={() => setIsLogoutModalOpen(false)}
                                className="px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmLogout}
                                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all active:scale-95"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};