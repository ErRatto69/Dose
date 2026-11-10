import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { drinksApi } from '@/api/drinks.api';
import { bacApi } from '@/api/bac.api';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/store/useAuthStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { isAdmin } from '@/utils/auth';
import { BacGaugeCard } from '@/components/safety/BacGaugeCard';
import { CocktailPassportSection } from '@/components/gamification/CocktailPassportSection';
import { PaginationControls } from '@/components/common/PaginationControls';
import { ConfirmDialogModal } from '@/components/common/ConfirmDialogModal';
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
    ShieldCheck,
    Users,
    ChevronRight,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { user, updateUser, logout } = useAuthStore();
    const { preferredUnit, setUnit } = usePreferencesStore();
    const queryClient = useQueryClient();

    const [draft, setDraft] = useState<{
        weightKg?: string;
        heightCm?: string;
        sex?: BiologicalSex;
        birthYear?: string;
    }>({});
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [reviewsPage, setReviewsPage] = useState(1);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [reviewIdToDelete, setReviewIdToDelete] = useState<string | null>(null);

    const hasAdminAccess = isAdmin(user);

    const { data: freshProfile } = useQuery({
        queryKey: ['my-profile'],
        queryFn: async () => {
            const profile = await usersApi.getMe();
            updateUser(profile);
            return profile;
        },
    });

    const activeProfile = freshProfile ?? user;
    const weightKg = draft.weightKg ?? String(activeProfile?.weightKg ?? 75);
    const heightCm = draft.heightCm ?? String(activeProfile?.heightCm ?? 175);
    const sex: BiologicalSex =
        draft.sex ??
        (String(activeProfile?.sex) === '1' || activeProfile?.sex === 'Female' ? 'Female' : 'Male');
    const birthYear =
        draft.birthYear ?? (activeProfile?.birthYear ? String(activeProfile.birthYear) : '');

    const { data: bacData } = useQuery({
        queryKey: queryKeys.bac.me(),
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
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog-infinite'] });
        },
    });

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
            setDraft({});
            setSavedSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['my-profile'] });
            queryClient.invalidateQueries({ queryKey: queryKeys.bac.me() });
            setTimeout(() => setSavedSuccess(false), 3000);
        },
        onError: () => {
            setErrorMsg('Please enter valid biometrics (Weight: 30–250 kg, Height: 100–230 cm).');
        },
    });

    const handleConfirmLogout = () => {
        queryClient.clear();
        logout();
        navigate('/login');
    };

    const userInitial = activeProfile?.username ? activeProfile.username.charAt(0).toUpperCase() : 'U';

    return (
        <>
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-7 space-y-6">
                        <section className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-12 h-12 rounded-2xl bg-[#0c0c0f] border border-red-600/45 flex items-center justify-center text-lg font-extrabold text-red-400 shrink-0">
                                    {userInitial}
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg font-extrabold text-white leading-tight flex flex-wrap items-center gap-2">
                                        <span className="truncate">{activeProfile?.username}</span>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-600/15 border border-red-500/35 text-red-300 font-semibold">
                                            {activeProfile?.role}
                                        </span>
                                    </h1>
                                    <p className="text-xs text-zinc-400 mt-0.5 truncate">{activeProfile?.email}</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsLogoutModalOpen(true)}
                                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0c0c0f] hover:bg-red-950/50 border border-white/[0.08] hover:border-red-500/45 text-zinc-300 hover:text-red-300 text-xs font-bold flex items-center gap-1.5 shrink-0 dose-press"
                            >
                                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Sign Out</span>
                            </button>
                        </section>

                        {hasAdminAccess && (
                            <section className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3">
                                <h2 className="text-sm font-extrabold text-white">Host Administration</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <Link
                                        to="/admin/safety"
                                        className="min-h-[48px] p-3 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] flex items-center justify-between gap-2 text-xs font-bold text-zinc-200 dose-press"
                                    >
                                        <span className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-red-400" aria-hidden="true" />
                                            <span>Party Safety</span>
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                                    </Link>
                                    <Link
                                        to="/admin/users"
                                        className="min-h-[48px] p-3 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] flex items-center justify-between gap-2 text-xs font-bold text-zinc-200 dose-press"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-red-400" aria-hidden="true" />
                                            <span>Users</span>
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                                    </Link>
                                    <Link
                                        to="/admin/reviews"
                                        className="min-h-[48px] p-3 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] flex items-center justify-between gap-2 text-xs font-bold text-zinc-200 dose-press"
                                    >
                                        <span className="flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4 text-red-400" aria-hidden="true" />
                                            <span>Reviews</span>
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                                    </Link>
                                </div>
                            </section>
                        )}

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                updateMutation.mutate();
                            }}
                            className="p-5 sm:p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-5"
                        >
                            <div className="pb-3 border-b border-white/[0.08]">
                                <h2 className="text-base font-extrabold text-white">
                                    Biometrics &amp; Units
                                </h2>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Used for BAC metabolic calculations and cocktail recipe volume formatting.
                                </p>
                            </div>

                            {errorMsg && (
                                <div
                                    role="alert"
                                    className="p-3 rounded-xl bg-red-950/60 border border-red-700/60 text-red-200 text-xs flex items-center gap-2"
                                >
                                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" aria-hidden="true" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {savedSuccess && (
                                <div
                                    role="status"
                                    aria-live="polite"
                                    className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" aria-hidden="true" />
                                    <span>Biometrics and unit preferences saved.</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="profile-weight" className="text-xs font-bold text-zinc-200 block mb-1.5">
                                        Weight (kg)
                                    </label>
                                    <input
                                        id="profile-weight"
                                        type="number"
                                        inputMode="decimal"
                                        step="0.5"
                                        min="30"
                                        max="250"
                                        required
                                        value={weightKg}
                                        onChange={(e) => setDraft((d) => ({ ...d, weightKg: e.target.value }))}
                                        className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl text-sm tabular-nums dose-input"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="profile-height" className="text-xs font-bold text-zinc-200 block mb-1.5">
                                        Height (cm)
                                    </label>
                                    <input
                                        id="profile-height"
                                        type="number"
                                        inputMode="numeric"
                                        step="1"
                                        min="100"
                                        max="230"
                                        required
                                        value={heightCm}
                                        onChange={(e) => setDraft((d) => ({ ...d, heightCm: e.target.value }))}
                                        className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl text-sm tabular-nums dose-input"
                                    />
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-zinc-200 block mb-1.5">
                                        Biological Sex
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['Male', 'Female'] as BiologicalSex[]).map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                aria-pressed={sex === option}
                                                onClick={() => setDraft((d) => ({ ...d, sex: option }))}
                                                className={`min-h-[42px] py-2 rounded-xl text-xs font-bold border dose-press ${
                                                    sex === option
                                                        ? 'bg-red-600/20 border-red-500 text-red-200'
                                                        : 'bg-[#0c0c0f] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
                                                }`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="profile-birth" className="text-xs font-bold text-zinc-200 block mb-1.5">
                                        Birth Year
                                    </label>
                                    <input
                                        id="profile-birth"
                                        type="number"
                                        inputMode="numeric"
                                        min="1920"
                                        max="2010"
                                        value={birthYear}
                                        onChange={(e) => setDraft((d) => ({ ...d, birthYear: e.target.value }))}
                                        className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl text-sm tabular-nums dose-input"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                                        <Sliders className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                                        <span>Volume Unit</span>
                                    </span>
                                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                                        Display unit across catalog recipes and custom pours
                                    </span>
                                </div>

                                <div
                                    role="group"
                                    aria-label="Volume display unit"
                                    className="inline-flex p-1 bg-[#0c0c0f] border border-white/[0.08] rounded-xl self-start sm:self-auto"
                                >
                                    {(
                                        [
                                            { unit: 'cl', label: 'cl' },
                                            { unit: 'oz', label: 'oz' },
                                        ] as const
                                    ).map(({ unit, label }) => (
                                        <button
                                            key={unit}
                                            type="button"
                                            aria-pressed={preferredUnit === unit}
                                            onClick={() => setUnit(unit)}
                                            className={`min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-bold dose-press ${
                                                preferredUnit === unit
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-zinc-400 hover:text-zinc-200'
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
                                className="w-full min-h-[46px] py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 border border-red-500/50 dose-press"
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                        <span>Saving…</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" aria-hidden="true" />
                                        <span>Save Settings</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-5">
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

                <CocktailPassportSection />

                <section className="p-5 sm:p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-4">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-red-400" aria-hidden="true" />
                        <h2 className="text-lg font-extrabold text-white">
                            My Tasting Reviews {myReviews ? `(${myReviews.totalCount})` : ''}
                        </h2>
                    </div>

                    {myReviews && myReviews.items.length > 0 ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {myReviews.items.map((rev) => (
                                    <div
                                        key={rev.id}
                                        className="p-4 rounded-xl bg-[#0c0c0f] border border-white/[0.08] flex flex-col justify-between gap-3 text-xs"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <strong className="text-sm font-bold text-white">
                                                    {rev.drinkName}
                                                </strong>
                                                <div className="flex items-center gap-1 text-amber-400 font-bold tabular-nums shrink-0">
                                                    <Star className="w-3.5 h-3.5 fill-amber-400" aria-hidden="true" />
                                                    <span>{rev.rating}/5</span>
                                                </div>
                                            </div>
                                            {rev.comment && (
                                                <p className="text-zinc-300 leading-relaxed mt-1">
                                                    &ldquo;{rev.comment}&rdquo;
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06] text-[11px] text-zinc-400">
                                            <span className="tabular-nums">
                                                {new Date(rev.createdAt).toLocaleDateString()}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setReviewIdToDelete(rev.id)}
                                                className="min-h-[32px] px-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/[0.04] flex items-center gap-1 dose-press"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
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
                        <p className="text-xs text-zinc-400 py-4">
                            You have not posted any cocktail tasting notes yet.
                        </p>
                    )}
                </section>
            </div>

            <ConfirmDialogModal
                isOpen={isLogoutModalOpen}
                title="Sign out of Dose?"
                message="You will need your credentials to log back in and track pours."
                confirmLabel="Sign Out"
                isDestructive
                onConfirm={handleConfirmLogout}
                onCancel={() => setIsLogoutModalOpen(false)}
            />

            <ConfirmDialogModal
                isOpen={!!reviewIdToDelete}
                title="Delete Tasting Review?"
                message="Are you sure you want to delete this review? This action cannot be undone."
                confirmLabel="Delete Review"
                isDestructive
                isLoading={deleteReviewMutation.isPending}
                onConfirm={() => {
                    if (reviewIdToDelete) {
                        deleteReviewMutation.mutate(reviewIdToDelete, {
                            onSettled: () => setReviewIdToDelete(null),
                        });
                    }
                }}
                onCancel={() => setReviewIdToDelete(null)}
            />
        </>
    );
};
