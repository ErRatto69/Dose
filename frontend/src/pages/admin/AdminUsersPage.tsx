import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { drinksApi } from '@/api/drinks.api';
import { useAuthStore } from '@/store/useAuthStore';
import { PaginationControls } from '@/components/common/PaginationControls';
import { ConfirmDialogModal } from '@/components/common/ConfirmDialogModal';
import { ModalShell } from '@/components/common/ModalShell';
import type { BiologicalSex, UserProfile, UserRole } from '@/types';
import {
    UserPlus,
    Edit3,
    Trash2,
    Search,
    X,
    Check,
    Shield,
    Loader2,
    AlertCircle,
    UserCheck,
    MessageSquare,
    Star,
} from 'lucide-react';

interface UserFormState {
    id?: string;
    username: string;
    email: string;
    password: string;
    role: UserRole;
    weightKg: string;
    heightCm: string;
    sex: BiologicalSex;
    birthYear: string;
    preferredUnit: 'Cl' | 'Oz';
    isActive: boolean;
}

const DEFAULT_FORM: UserFormState = {
    username: '',
    email: '',
    password: '',
    role: 'Drinker',
    weightKg: '75',
    heightCm: '175',
    sex: 'Male',
    birthYear: '1998',
    preferredUnit: 'Cl',
    isActive: true,
};

export const AdminUsersPage: React.FC = () => {
    const { user: currentUser } = useAuthStore();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pageNumber, setPageNumber] = useState(1);
    const [requestsPage, setRequestsPage] = useState(1);
    const pageSize = 12;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<UserFormState>(DEFAULT_FORM);
    const [formError, setFormError] = useState<string | null>(null);

    const [inspectingUser, setInspectingUser] = useState<UserProfile | null>(null);
    const [userReviewsPage, setUserReviewsPage] = useState(1);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [reviewIdToDelete, setReviewIdToDelete] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPageNumber(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: pagedUsers, isLoading } = useQuery({
        queryKey: ['admin-users-list', pageNumber, debouncedSearch],
        queryFn: () =>
            usersApi.getAllUsers({
                pageNumber,
                pageSize,
                search: debouncedSearch.trim() || undefined,
            }),
    });

    const { data: pagedRequests } = useQuery({
        queryKey: ['admin-registration-requests', requestsPage],
        queryFn: () => usersApi.getRegistrationRequests({ pageNumber: requestsPage, pageSize: 10 }),
    });

    const { data: inspectedUserReviews } = useQuery({
        queryKey: ['admin-user-reviews', inspectingUser?.id, userReviewsPage],
        queryFn: () =>
            usersApi.getAdminReviews({
                userId: inspectingUser!.id,
                pageNumber: userReviewsPage,
                pageSize: 8,
            }),
        enabled: !!inspectingUser,
    });

    const openCreateModal = () => {
        setForm(DEFAULT_FORM);
        setFormError(null);
        setIsModalOpen(true);
    };

    const openEditModal = (u: UserProfile) => {
        setForm({
            id: u.id,
            username: u.username,
            email: u.email,
            password: '',
            role: u.role,
            weightKg: String(u.weightKg),
            heightCm: String(u.heightCm),
            sex: u.sex,
            birthYear: u.birthYear ? String(u.birthYear) : '',
            preferredUnit: String(u.preferredUnit).toLowerCase() === 'oz' ? 'Oz' : 'Cl',
            isActive: u.isActive,
        });
        setFormError(null);
        setIsModalOpen(true);
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            setFormError(null);
            if (form.id) {
                return usersApi.updateUser(form.id, {
                    username: form.username.trim(),
                    email: form.email.trim(),
                    role: form.role,
                    weightKg: Number(form.weightKg),
                    heightCm: Number(form.heightCm),
                    sex: form.sex,
                    birthYear: form.birthYear ? Number(form.birthYear) : null,
                    preferredUnit: form.preferredUnit,
                    isActive: form.isActive,
                    newPassword: form.password.trim() ? form.password.trim() : null,
                });
            } else {
                return usersApi.createUser({
                    username: form.username.trim(),
                    email: form.email.trim(),
                    password: form.password,
                    role: form.role,
                    weightKg: Number(form.weightKg),
                    heightCm: Number(form.heightCm),
                    sex: form.sex,
                    birthYear: form.birthYear ? Number(form.birthYear) : null,
                    preferredUnit: form.preferredUnit,
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
            setIsModalOpen(false);
        },
        onError: (err: unknown) => {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { detail?: string } } };
                setFormError(axiosErr.response?.data?.detail || 'Failed to save user.');
            } else {
                setFormError('Failed to save user.');
            }
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => usersApi.deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
        },
    });

    const approveRequestMutation = useMutation({
        mutationFn: (id: string) => usersApi.approveRegistrationRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-registration-requests'] });
            queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
        },
    });

    const rejectRequestMutation = useMutation({
        mutationFn: (id: string) => usersApi.rejectRegistrationRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-registration-requests'] });
        },
    });

    const deleteReviewMutation = useMutation({
        mutationFn: (id: string) => drinksApi.deleteReview(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-user-reviews'] });
            queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog-infinite'] });
        },
    });

    const pendingCount = pagedRequests?.totalCount ?? 0;

    return (
        <>
            <div className="space-y-6">
                {/* Page Header */}
                <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-wide leading-none">
                            USER MANAGEMENT
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                            Manage bar guest accounts, roles, biometrics, and pending access requests.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 border border-red-500/50 self-start sm:self-auto dose-press"
                    >
                        <UserPlus className="w-4 h-4" aria-hidden="true" />
                        <span>Add User</span>
                    </button>
                </section>

                {/* Tabs */}
                <div
                    role="tablist"
                    aria-label="User administration views"
                    className="flex items-center gap-2 border-b border-white/[0.08] pb-3"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'users'}
                        onClick={() => setActiveTab('users')}
                        className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold border tabular-nums dose-press ${
                            activeTab === 'users'
                                ? 'bg-red-600 text-white border-red-500/60'
                                : 'bg-[#111114] text-zinc-400 hover:text-white border-white/[0.08]'
                        }`}
                    >
                        Active Users ({pagedUsers?.totalCount ?? 0})
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'requests'}
                        onClick={() => setActiveTab('requests')}
                        className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 tabular-nums dose-press ${
                            activeTab === 'requests'
                                ? 'bg-red-600 text-white border-red-500/60'
                                : 'bg-[#111114] text-zinc-400 hover:text-white border-white/[0.08]'
                        }`}
                    >
                        <UserCheck className="w-4 h-4" aria-hidden="true" />
                        <span>Access Requests</span>
                        {pendingCount > 0 && (
                            <span
                                className={`px-1.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                                    activeTab === 'requests'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-red-600 text-white'
                                }`}
                            >
                                {pendingCount}
                            </span>
                        )}
                    </button>
                </div>

                {activeTab === 'users' ? (
                    <div className="space-y-4">
                        <div className="relative max-w-md">
                            <Search
                                className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                aria-hidden="true"
                            />
                            <input
                                type="search"
                                aria-label="Filter users by username or email"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Filter users by username or email…"
                                className="w-full min-h-[44px] pl-10 pr-10 py-2.5 rounded-xl text-sm dose-input"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    aria-label="Clear user filter"
                                    className="w-9 h-9 rounded-lg flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" aria-hidden="true" />
                                </button>
                            )}
                        </div>

                        {isLoading ? (
                            <div className="space-y-2.5" aria-busy="true" aria-label="Loading users">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-16 rounded-2xl bg-[#111114] border border-white/[0.08]" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Desktop Dense Operational Table */}
                                <div className="hidden md:block rounded-2xl bg-[#111114] border border-white/[0.08] overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/[0.08] bg-[#0c0c0f] text-zinc-400 font-bold">
                                                <th className="py-3 px-4">Member</th>
                                                <th className="py-3 px-4">Role</th>
                                                <th className="py-3 px-4">Biometrics</th>
                                                <th className="py-3 px-4">Status</th>
                                                <th className="py-3 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.06]">
                                            {pagedUsers?.items.map((u) => {
                                                const isSelf = currentUser?.id === u.id;
                                                return (
                                                    <tr
                                                        key={u.id}
                                                        className={`hover:bg-white/[0.02] transition-colors ${
                                                            !u.isActive ? 'opacity-65' : ''
                                                        }`}
                                                    >
                                                        <td className="py-3 px-4">
                                                            <div className="font-bold text-white text-sm">
                                                                {u.username}
                                                            </div>
                                                            <div className="text-zinc-400">{u.email}</div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0c0c0f] border border-white/[0.08] text-red-400">
                                                                <Shield className="w-3 h-3" aria-hidden="true" />
                                                                <span>{u.role}</span>
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 tabular-nums text-zinc-200">
                                                            {u.weightKg} kg · {u.heightCm} cm · {u.sex}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            {u.isActive ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300">
                                                                    Active
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-300">
                                                                    Disabled
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openEditModal(u)}
                                                                    className="min-h-[36px] px-3 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-zinc-200 font-bold flex items-center gap-1.5 dose-press"
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                                                                    <span>Edit</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setUserReviewsPage(1);
                                                                        setInspectingUser(u);
                                                                    }}
                                                                    className="min-h-[36px] px-3 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-zinc-200 font-bold flex items-center gap-1.5 dose-press"
                                                                >
                                                                    <MessageSquare className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                                                                    <span>Reviews</span>
                                                                </button>
                                                                {!isSelf && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setUserToDelete(u)}
                                                                        aria-label={`Delete ${u.username}`}
                                                                        className="w-9 h-9 rounded-xl bg-[#0c0c0f] hover:bg-red-950/60 border border-white/[0.08] text-zinc-400 hover:text-red-400 flex items-center justify-center dose-press"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden grid grid-cols-1 gap-3">
                                    {pagedUsers?.items.map((u) => {
                                        const isSelf = currentUser?.id === u.id;
                                        return (
                                            <div
                                                key={u.id}
                                                className={`p-4 rounded-2xl border space-y-3 ${
                                                    u.isActive
                                                        ? 'bg-[#111114] border-white/[0.08]'
                                                        : 'bg-[#0c0c0f] border-red-900/40 opacity-75'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                                                            <span className="truncate">{u.username}</span>
                                                            {!u.isActive && (
                                                                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">
                                                                    Disabled
                                                                </span>
                                                            )}
                                                        </h2>
                                                        <p className="text-xs text-zinc-400 truncate">{u.email}</p>
                                                    </div>
                                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0c0c0f] border border-white/[0.08] text-red-400 flex items-center gap-1 shrink-0">
                                                        <Shield className="w-3 h-3" aria-hidden="true" />
                                                        <span>{u.role}</span>
                                                    </span>
                                                </div>

                                                <div className="pt-2.5 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-xs tabular-nums">
                                                    <div>
                                                        <span className="text-zinc-400 block text-[11px]">Weight</span>
                                                        <strong className="text-zinc-100">{u.weightKg} kg</strong>
                                                    </div>
                                                    <div>
                                                        <span className="text-zinc-400 block text-[11px]">Height</span>
                                                        <strong className="text-zinc-100">{u.heightCm} cm</strong>
                                                    </div>
                                                    <div>
                                                        <span className="text-zinc-400 block text-[11px]">Sex</span>
                                                        <strong className="text-zinc-100">{u.sex}</strong>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.06]">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(u)}
                                                        className="flex-1 min-h-[40px] rounded-xl bg-[#0c0c0f] border border-white/[0.08] text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 dose-press"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                                                        <span>Edit</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setUserReviewsPage(1);
                                                            setInspectingUser(u);
                                                        }}
                                                        className="min-h-[40px] px-3 rounded-xl bg-[#0c0c0f] border border-white/[0.08] text-zinc-200 font-bold text-xs flex items-center gap-1.5 dose-press"
                                                    >
                                                        <MessageSquare className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                                                        <span>Reviews</span>
                                                    </button>
                                                    {!isSelf && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setUserToDelete(u)}
                                                            aria-label={`Delete ${u.username}`}
                                                            className="w-10 h-10 rounded-xl bg-[#0c0c0f] border border-white/[0.08] text-zinc-400 hover:text-red-400 flex items-center justify-center dose-press"
                                                        >
                                                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {pagedUsers && (
                                    <PaginationControls
                                        pageNumber={pagedUsers.pageNumber}
                                        totalPages={pagedUsers.totalPages}
                                        totalCount={pagedUsers.totalCount}
                                        hasPreviousPage={pagedUsers.hasPreviousPage}
                                        hasNextPage={pagedUsers.hasNextPage}
                                        onPageChange={(p) => setPageNumber(p)}
                                        itemLabel="users"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pagedRequests && pagedRequests.items.length > 0 ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {pagedRequests.items.map((req) => (
                                        <div
                                            key={req.id}
                                            className="p-4 rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col justify-between gap-3 text-xs"
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <strong className="text-base font-extrabold text-white">
                                                        {req.username}
                                                    </strong>
                                                    <span className="text-[11px] text-zinc-400 tabular-nums">
                                                        {new Date(req.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-zinc-300">{req.email}</p>
                                                <div className="text-[11px] text-zinc-400 mt-1 tabular-nums">
                                                    {req.weightKg} kg · {req.heightCm} cm · {req.sex}
                                                </div>
                                                {req.requestNote && (
                                                    <p className="mt-2.5 p-2.5 rounded-xl bg-[#0c0c0f] text-zinc-200 italic border border-white/[0.06]">
                                                        &ldquo;{req.requestNote}&rdquo;
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 pt-2.5 border-t border-white/[0.08]">
                                                <button
                                                    type="button"
                                                    onClick={() => approveRequestMutation.mutate(req.id)}
                                                    disabled={approveRequestMutation.isPending}
                                                    className="flex-1 min-h-[40px] py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 dose-press"
                                                >
                                                    <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                                                    <span>Approve</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => rejectRequestMutation.mutate(req.id)}
                                                    disabled={rejectRequestMutation.isPending}
                                                    className="min-h-[40px] py-2 px-4 rounded-xl bg-[#0c0c0f] hover:bg-red-950/60 border border-white/[0.08] text-zinc-300 hover:text-red-300 font-bold text-xs dose-press"
                                                >
                                                    <span>Reject</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <PaginationControls
                                    pageNumber={pagedRequests.pageNumber}
                                    totalPages={pagedRequests.totalPages}
                                    totalCount={pagedRequests.totalCount}
                                    hasPreviousPage={pagedRequests.hasPreviousPage}
                                    hasNextPage={pagedRequests.hasNextPage}
                                    onPageChange={(p) => setRequestsPage(p)}
                                    itemLabel="requests"
                                />
                            </div>
                        ) : (
                            <div className="py-16 text-center text-zinc-400 bg-[#111114] border border-white/[0.08] rounded-2xl text-sm">
                                No pending access requests.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Inspect User Reviews Modal */}
            <ModalShell
                isOpen={!!inspectingUser}
                onClose={() => setInspectingUser(null)}
                title={inspectingUser ? `Reviews by ${inspectingUser.username}` : 'User Reviews'}
                subtitle={`Total: ${inspectedUserReviews?.totalCount ?? 0} tasting review(s)`}
                maxWidthClass="max-w-xl"
            >
                <div className="space-y-3">
                    {inspectedUserReviews && inspectedUserReviews.items.length > 0 ? (
                        <>
                            <div className="space-y-2.5">
                                {inspectedUserReviews.items.map((rev) => (
                                    <div
                                        key={rev.id}
                                        className="p-3.5 rounded-xl bg-[#0c0c0f] border border-white/[0.08] text-xs space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <strong className="text-white font-bold">{rev.drinkName}</strong>
                                            <div className="flex items-center gap-1 text-amber-400 font-bold tabular-nums">
                                                <Star className="w-3 h-3 fill-amber-400" aria-hidden="true" />
                                                <span>{rev.rating}/5</span>
                                            </div>
                                        </div>
                                        {rev.comment && (
                                            <p className="text-zinc-300">&ldquo;{rev.comment}&rdquo;</p>
                                        )}
                                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400">
                                            <span className="tabular-nums">
                                                {new Date(rev.createdAt).toLocaleDateString()}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setReviewIdToDelete(rev.id)}
                                                className="min-h-[32px] px-2 rounded-lg text-zinc-400 hover:text-red-400 flex items-center gap-1 dose-press"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <PaginationControls
                                pageNumber={inspectedUserReviews.pageNumber}
                                totalPages={inspectedUserReviews.totalPages}
                                totalCount={inspectedUserReviews.totalCount}
                                hasPreviousPage={inspectedUserReviews.hasPreviousPage}
                                hasNextPage={inspectedUserReviews.hasNextPage}
                                onPageChange={(p) => setUserReviewsPage(p)}
                                itemLabel="reviews"
                            />
                        </>
                    ) : (
                        <p className="text-xs text-zinc-400 text-center py-8">
                            This user has not posted any tasting reviews yet.
                        </p>
                    )}
                </div>
            </ModalShell>

            {/* Create / Edit User Modal */}
            <ModalShell
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={form.id ? `Edit: ${form.username}` : 'Add New Member'}
                maxWidthClass="max-w-lg"
                closeDisabled={saveMutation.isPending}
                footer={
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            disabled={saveMutation.isPending}
                            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0c0c0f] hover:bg-[#18181d] border border-white/[0.08] text-zinc-300 text-xs font-bold dose-press"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="admin-user-form"
                            disabled={saveMutation.isPending}
                            className="min-h-[42px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold flex items-center gap-1.5 border border-red-500/50 dose-press"
                        >
                            {saveMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                            )}
                            <span>Save User</span>
                        </button>
                    </div>
                }
            >
                <form
                    id="admin-user-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        saveMutation.mutate();
                    }}
                    className="space-y-4"
                >
                    {formError && (
                        <div
                            role="alert"
                            className="p-3 rounded-xl bg-red-950/60 border border-red-700/60 text-red-200 text-xs flex items-center gap-2"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" aria-hidden="true" />
                            <span>{formError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="admin-form-username" className="text-xs font-bold text-zinc-200 block mb-1">
                                Username
                            </label>
                            <input
                                id="admin-form-username"
                                type="text"
                                required
                                spellCheck={false}
                                autoCapitalize="none"
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                className="w-full min-h-[42px] px-3 py-2 rounded-xl text-xs dose-input"
                            />
                        </div>
                        <div>
                            <label htmlFor="admin-form-email" className="text-xs font-bold text-zinc-200 block mb-1">
                                Email
                            </label>
                            <input
                                id="admin-form-email"
                                type="email"
                                required
                                spellCheck={false}
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full min-h-[42px] px-3 py-2 rounded-xl text-xs dose-input"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="admin-form-password" className="text-xs font-bold text-zinc-200 block mb-1">
                                {form.id ? 'New Password (optional)' : 'Password (min 8 chars)'}
                            </label>
                            <input
                                id="admin-form-password"
                                type="password"
                                required={!form.id}
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="w-full min-h-[42px] px-3 py-2 rounded-xl text-xs dose-input"
                            />
                        </div>
                        <div>
                            <label htmlFor="admin-form-role" className="text-xs font-bold text-zinc-200 block mb-1">
                                Role
                            </label>
                            <select
                                id="admin-form-role"
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                                className="w-full min-h-[42px] px-3 py-2 rounded-xl text-xs dose-input"
                            >
                                <option value="Drinker">Drinker</option>
                                <option value="Bartender">Bartender</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label htmlFor="admin-form-weight" className="text-xs font-bold text-zinc-200 block mb-1">
                                Weight (kg)
                            </label>
                            <input
                                id="admin-form-weight"
                                type="number"
                                inputMode="decimal"
                                step="0.5"
                                required
                                value={form.weightKg}
                                onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                                className="w-full min-h-[42px] px-3 py-2 rounded-xl text-xs tabular-nums dose-input"
                            />
                        </div>
                        <div>
                            <label htmlFor="admin-form-height" className="text-xs font-bold text-zinc-200 block mb-1">
                                Height (cm)
                            </label>
                            <input
                                id="admin-form-height"
                                type="number"
                                inputMode="numeric"
                                required
                                value={form.heightCm}
                                onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                                className="w-full min-h-[42px] px-3 py-2 rounded-xl text-xs tabular-nums dose-input"
                            />
                        </div>
                        <div>
                            <label htmlFor="admin-form-sex" className="text-xs font-bold text-zinc-200 block mb-1">
                                Sex
                            </label>
                            <select
                                id="admin-form-sex"
                                value={form.sex}
                                onChange={(e) => setForm({ ...form, sex: e.target.value as BiologicalSex })}
                                className="w-full min-h-[42px] px-3 py-2 rounded-xl text-xs dose-input"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>

                    {form.id && (
                        <label className="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer min-h-[36px]">
                            <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                className="rounded border-white/20 accent-red-600"
                            />
                            <span>Account is active (allow sign in)</span>
                        </label>
                    )}
                </form>
            </ModalShell>

            <ConfirmDialogModal
                isOpen={!!userToDelete}
                title={`Delete User “${userToDelete?.username ?? ''}”?`}
                message="This permanently deletes the user account and cascades all personal drink and water logs."
                confirmLabel="Delete User"
                isDestructive
                isLoading={deleteMutation.isPending}
                onConfirm={() => {
                    if (userToDelete) {
                        deleteMutation.mutate(userToDelete.id, {
                            onSettled: () => setUserToDelete(null),
                        });
                    }
                }}
                onCancel={() => setUserToDelete(null)}
            />

            <ConfirmDialogModal
                isOpen={!!reviewIdToDelete}
                title="Delete User Review?"
                message="Permanently remove this user's tasting review?"
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
