import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { drinksApi } from '@/api/drinks.api';
import { useAuthStore } from '@/store/useAuthStore';
import { PaginationControls } from '@/components/common/PaginationControls';
import type { BiologicalSex, UserProfile, UserRole } from '@/types';
import {
    Users,
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

    // Modal state for viewing reviews left by a specific user
    const [inspectingUser, setInspectingUser] = useState<UserProfile | null>(null);
    const [userReviewsPage, setUserReviewsPage] = useState(1);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPageNumber(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Paginated users query
    const { data: pagedUsers, isLoading } = useQuery({
        queryKey: ['admin-users-list', pageNumber, debouncedSearch],
        queryFn: () =>
            usersApi.getAllUsers({
                pageNumber,
                pageSize,
                search: debouncedSearch.trim() || undefined,
            }),
    });

    // Pending registration requests query
    const { data: pagedRequests } = useQuery({
        queryKey: ['admin-registration-requests', requestsPage],
        queryFn: () => usersApi.getRegistrationRequests({ pageNumber: requestsPage, pageSize: 10 }),
    });

    // Reviews by inspected user query
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
            queryClient.invalidateQueries({ queryKey: ['drinks-catalog'] });
        },
    });

    const pendingCount = pagedRequests?.totalCount ?? 0;

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-red-500" />
                        <span>User Management</span>
                    </h1>
                    <p className="text-xs text-neutral-400 mt-0.5">
                        Manage member accounts, permissions, and registration requests.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openCreateModal}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 transition-all"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Add New User</span>
                </button>
            </div>

            {/* Navigation Tabs (Users vs Pending Requests) */}
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
                <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'users'
                            ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                            : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                >
                    Active Users ({pagedUsers?.totalCount ?? 0})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('requests')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'requests'
                            ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                            : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                >
                    <UserCheck className="w-4 h-4" />
                    <span>Access Requests</span>
                    {pendingCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black">
                            {pendingCount}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'users' ? (
                <>
                    {/* Search Bar */}
                    <div className="relative max-w-md">
                        <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Filter users by username or email..."
                            className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                        />
                    </div>

                    {isLoading ? (
                        <div className="py-24 flex flex-col items-center justify-center text-neutral-500 gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                            <span className="text-xs">Loading directory...</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {pagedUsers?.items.map((u) => {
                                    const isSelf = currentUser?.id === u.id;
                                    return (
                                        <div
                                            key={u.id}
                                            className={`p-5 rounded-3xl border flex flex-col justify-between gap-4 shadow-md ${
                                                u.isActive
                                                    ? 'bg-neutral-900 border-neutral-800'
                                                    : 'bg-neutral-950 border-red-900/40 opacity-70'
                                            }`}
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                                            <span>{u.username}</span>
                                                            {!u.isActive && (
                                                                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                                                                    Disabled
                                                                </span>
                                                            )}
                                                        </h3>
                                                        <p className="text-xs text-neutral-400">{u.email}</p>
                                                    </div>
                                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-950 border border-neutral-800 text-red-400 flex items-center gap-1">
                                                        <Shield className="w-3 h-3" />
                                                        {u.role}
                                                    </span>
                                                </div>

                                                <div className="pt-2 border-t border-neutral-800 grid grid-cols-3 gap-2 text-xs">
                                                    <div>
                                                        <span className="text-neutral-500 block text-[10px]">
                                                            Weight
                                                        </span>
                                                        <strong className="text-neutral-200">{u.weightKg} kg</strong>
                                                    </div>
                                                    <div>
                                                        <span className="text-neutral-500 block text-[10px]">
                                                            Height
                                                        </span>
                                                        <strong className="text-neutral-200">{u.heightCm} cm</strong>
                                                    </div>
                                                    <div>
                                                        <span className="text-neutral-500 block text-[10px]">
                                                            Sex
                                                        </span>
                                                        <strong className="text-neutral-200">{u.sex}</strong>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 pt-2 border-t border-neutral-800">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(u)}
                                                    className="flex-1 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                    <span>Edit</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUserReviewsPage(1);
                                                        setInspectingUser(u);
                                                    }}
                                                    className="py-2 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-bold text-xs flex items-center gap-1 transition-colors"
                                                    title="View user reviews"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5 text-red-500" />
                                                    <span>Reviews</span>
                                                </button>

                                                {!isSelf && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (window.confirm(`Delete ${u.username}?`)) {
                                                                deleteMutation.mutate(u.id);
                                                            }
                                                        }}
                                                        className="p-2 rounded-xl bg-neutral-950 hover:bg-red-950/70 border border-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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
                </>
            ) : (
                /* Registration Requests Tab */
                <div className="space-y-4">
                    {pagedRequests && pagedRequests.items.length > 0 ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {pagedRequests.items.map((req) => (
                                    <div
                                        key={req.id}
                                        className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between gap-3 text-xs shadow-md"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <strong className="text-base font-bold text-white">
                                                    {req.username}
                                                </strong>
                                                <span className="text-[10px] text-neutral-400 font-mono">
                                                    {new Date(req.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-neutral-400">{req.email}</p>
                                            <div className="text-[11px] text-neutral-400 mt-1">
                                                {req.weightKg} kg • {req.heightCm} cm • {req.sex}
                                            </div>
                                            {req.requestNote && (
                                                <p className="mt-2 p-2.5 rounded-xl bg-neutral-950 text-neutral-300 italic border border-neutral-800">
                                                    &quot;{req.requestNote}&quot;
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                                            <button
                                                type="button"
                                                onClick={() => approveRequestMutation.mutate(req.id)}
                                                disabled={approveRequestMutation.isPending}
                                                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                                            >
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                <span>Approve</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => rejectRequestMutation.mutate(req.id)}
                                                disabled={rejectRequestMutation.isPending}
                                                className="py-2 px-4 rounded-xl bg-neutral-950 hover:bg-red-950/70 border border-neutral-800 text-neutral-400 hover:text-red-400 font-bold text-xs transition-colors"
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
                        <div className="py-16 text-center text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-3xl text-sm">
                            No pending access requests.
                        </div>
                    )}
                </div>
            )}

            {/* Modal for reviews left by an inspected user */}
            {inspectingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
                    <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                            <div>
                                <h2 className="text-base font-bold text-white">
                                    Reviews by {inspectingUser.username}
                                </h2>
                                <p className="text-xs text-neutral-400">
                                    Total: {inspectedUserReviews?.totalCount ?? 0} review(s)
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectingUser(null)}
                                className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
                            {inspectedUserReviews && inspectedUserReviews.items.length > 0 ? (
                                inspectedUserReviews.items.map((rev) => (
                                    <div
                                        key={rev.id}
                                        className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <strong className="text-white font-bold">{rev.drinkName}</strong>
                                            <div className="flex items-center gap-1 text-amber-400 font-bold">
                                                <Star className="w-3 h-3 fill-amber-400" />
                                                <span>{rev.rating}/5</span>
                                            </div>
                                        </div>
                                        {rev.comment && <p className="text-neutral-300">&quot;{rev.comment}&quot;</p>}
                                        <div className="flex items-center justify-between pt-1 border-t border-neutral-800 text-[11px] text-neutral-500">
                                            <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (window.confirm('Delete this user review?')) {
                                                        deleteReviewMutation.mutate(rev.id);
                                                    }
                                                }}
                                                className="text-neutral-400 hover:text-red-400 flex items-center gap-1"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-neutral-500 text-center py-8">
                                    This user has not posted any reviews yet.
                                </p>
                            )}
                        </div>

                        {inspectedUserReviews && (
                            <PaginationControls
                                pageNumber={inspectedUserReviews.pageNumber}
                                totalPages={inspectedUserReviews.totalPages}
                                totalCount={inspectedUserReviews.totalCount}
                                hasPreviousPage={inspectedUserReviews.hasPreviousPage}
                                hasNextPage={inspectedUserReviews.hasNextPage}
                                onPageChange={(p) => setUserReviewsPage(p)}
                                itemLabel="reviews"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Create / Edit User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                            <h2 className="text-lg font-black text-white">
                                {form.id ? `Edit: ${form.username}` : 'Add New Member'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {formError && (
                            <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                saveMutation.mutate();
                            }}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                        {form.id ? 'New Password (optional)' : 'Password (min 8 chars)'}
                                    </label>
                                    <input
                                        type="password"
                                        required={!form.id}
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                        Role
                                    </label>
                                    <select
                                        value={form.role}
                                        onChange={(e) =>
                                            setForm({ ...form, role: e.target.value as UserRole })
                                        }
                                        className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                                    >
                                        <option value="Drinker">Drinker</option>
                                        <option value="Bartender">Bartender</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                        Weight (kg)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        required
                                        value={form.weightKg}
                                        onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                        Height (cm)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={form.heightCm}
                                        onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                        Sex
                                    </label>
                                    <select
                                        value={form.sex}
                                        onChange={(e) =>
                                            setForm({ ...form, sex: e.target.value as BiologicalSex })
                                        }
                                        className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                            </div>

                            {form.id && (
                                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.isActive}
                                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                        className="rounded border-neutral-700"
                                    />
                                    <span>Account is active (allow sign in)</span>
                                </label>
                            )}

                            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saveMutation.isPending}
                                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20"
                                >
                                    {saveMutation.isPending ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    )}
                                    <span>Save User</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};