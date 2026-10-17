import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { useAuthStore } from '@/store/useAuthStore';
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

    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<UserFormState>(DEFAULT_FORM);
    const [formError, setFormError] = useState<string | null>(null);

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['admin-users-list'],
        queryFn: usersApi.getAllUsers,
    });

    const filteredUsers = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return users;
        return users.filter(
            (u) =>
                u.username.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                String(u.role).toLowerCase().includes(q)
        );
    }, [users, search]);

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
                setFormError(
                    axiosErr.response?.data?.detail ||
                    'Validation error. Check username, email, password (min 8 chars), and biometrics.'
                );
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                        Administration
                    </span>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-amber-400" />
                        User Management ({users.length})
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Create accounts, assign roles (Admin, Bartender, Drinker), and manage guest biometrics.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openCreateModal}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                >
                    <UserPlus className="w-4 h-4" />
                    Add New User
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter users by username, email, or role..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
            </div>

            {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
                    <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                    <span className="text-xs">Loading users directory...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map((u) => {
                        const isSelf = currentUser?.id === u.id;
                        return (
                            <div
                                key={u.id}
                                className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${
                                    u.isActive
                                        ? 'bg-slate-900 border-slate-800'
                                        : 'bg-slate-950/60 border-rose-900/40 opacity-75'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                                <span>{u.username}</span>
                                                {!u.isActive && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
                                                        Disabled
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-xs text-slate-400">{u.email}</p>
                                        </div>

                                        <span
                                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                                                u.role === 'Admin'
                                                    ? 'bg-amber-500/20 text-amber-400'
                                                    : u.role === 'Bartender'
                                                        ? 'bg-purple-500/20 text-purple-300'
                                                        : 'bg-slate-800 text-slate-300'
                                            }`}
                                        >
                                            <Shield className="w-3 h-3" />
                                            {u.role}
                                        </span>
                                    </div>

                                    <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <span className="text-slate-500 block text-[10px]">Weight</span>
                                            <strong className="text-slate-200">{u.weightKg} kg</strong>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block text-[10px]">Height</span>
                                            <strong className="text-slate-200">{u.heightCm} cm</strong>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block text-[10px]">Sex</span>
                                            <strong className="text-slate-200">{u.sex}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(u)}
                                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        Edit User
                                    </button>
                                    {!isSelf && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        `Are you sure you want to delete ${u.username}?`
                                                    )
                                                ) {
                                                    deleteMutation.mutate(u.id);
                                                }
                                            }}
                                            className="p-2 rounded-xl bg-slate-950 hover:bg-rose-950/70 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
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
            )}

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h2 className="text-lg font-bold text-white">
                                {form.id ? `Edit User: ${form.username}` : 'Create New User'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {formError && (
                            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
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
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        {form.id ? 'New Password (optional)' : 'Password (min 8 chars)'}
                                    </label>
                                    <input
                                        type="password"
                                        required={!form.id}
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        placeholder={form.id ? 'Leave blank to keep current' : '••••••••'}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Role
                                    </label>
                                    <select
                                        value={form.role}
                                        onChange={(e) =>
                                            setForm({ ...form, role: e.target.value as UserRole })
                                        }
                                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                                    >
                                        <option value="Drinker">Drinker</option>
                                        <option value="Bartender">Bartender</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Weight (kg)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        required
                                        value={form.weightKg}
                                        onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Height (cm)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={form.heightCm}
                                        onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Sex
                                    </label>
                                    <select
                                        value={form.sex}
                                        onChange={(e) =>
                                            setForm({ ...form, sex: e.target.value as BiologicalSex })
                                        }
                                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                            </div>

                            {form.id && (
                                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.isActive}
                                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                        className="rounded border-slate-700"
                                    />
                                    Account is active (allow login)
                                </label>
                            )}

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saveMutation.isPending}
                                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
                                >
                                    {saveMutation.isPending ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    )}
                                    Save User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};