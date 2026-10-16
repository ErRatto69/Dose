import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { axiosClient } from '@/api/axiosClient';
import type { AuthResponse } from '@/types';
import { Wine, Lock, User, AlertCircle, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!identifier.trim() || !password.trim()) {
            setErrorMsg('Please enter both your username and password.');
            return;
        }

        try {
            setIsLoading(true);
            const { data } = await axiosClient.post<AuthResponse>('/auth/login', {
                identifier: identifier.trim(),
                password,
            });

            setAuth(data.accessToken, data.user);
            navigate('/drinks', { replace: true });
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { detail?: string } } };
                setErrorMsg(axiosErr.response?.data?.detail || 'Invalid username or password.');
            } else {
                setErrorMsg('Network error. Ensure the server is online.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-3">
                        <Wine className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Dose</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Private Bar &amp; Drinking Tracker for friends
                    </p>
                </div>

                {errorMsg && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-2.5 text-xs text-rose-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                            Username or Email
                        </label>
                        <div className="relative">
                            <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                autoComplete="username"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="e.g. admin or marco"
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-lg shadow-amber-500/20"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Signing In...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <p className="mt-6 text-center text-[11px] text-slate-500">
                    Invited members only. Accounts are created by the Host.
                </p>
            </div>
        </div>
    );
};