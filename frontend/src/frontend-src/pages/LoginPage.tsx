import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi } from '@/api/auth.api';
import type { BiologicalSex } from '@/types';
import {
    Wine,
    Lock,
    User,
    Mail,
    AlertCircle,
    CheckCircle2,
    Loader2,
    UserPlus,
    ArrowLeft,
} from 'lucide-react';

const REQUEST_SUBMITTED_STORAGE_KEY = 'dose_access_request_sent_at';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();

    const [mode, setMode] = useState<'login' | 'request'>('login');
    const [iconError, setIconError] = useState(false);

    // Login state
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Access Request state
    const [reqUsername, setReqUsername] = useState('');
    const [reqEmail, setReqEmail] = useState('');
    const [reqPassword, setReqPassword] = useState('');
    const [reqWeightKg, setReqWeightKg] = useState('75');
    const [reqHeightCm, setReqHeightCm] = useState('175');
    const [reqSex, setReqSex] = useState<BiologicalSex>('Male');
    const [reqBirthYear, setReqBirthYear] = useState('1998');
    const [reqNote, setReqNote] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState(''); // Honeypot anti-bot field
    const [requestSentSuccess, setRequestSentSuccess] = useState<boolean>(() => {
        const saved = localStorage.getItem(REQUEST_SUBMITTED_STORAGE_KEY);
        if (!saved) return false;
        const elapsedHours = (Date.now() - Number(saved)) / (1000 * 60 * 60);
        return elapsedHours < 12;
    });

    const appIconUrl = `${import.meta.env.BASE_URL}icons/icon-192.png`;

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!identifier.trim() || !password.trim()) {
            setErrorMsg('Please enter both your username and password.');
            return;
        }

        try {
            setIsLoading(true);
            const data = await authApi.login(identifier.trim(), password);
            setAuth(data.accessToken, data.user);
            navigate('/drinks', { replace: true });
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { detail?: string } } };
                setErrorMsg(
                    axiosErr.response?.data?.detail ||
                    'Invalid credentials or account disabled.'
                );
            } else {
                setErrorMsg('Network error. Ensure the server is online.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestAccessSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (reqPassword.length < 8) {
            setErrorMsg('Password must be at least 8 characters long.');
            return;
        }

        try {
            setIsLoading(true);
            await authApi.submitRegistrationRequest({
                username: reqUsername.trim(),
                email: reqEmail.trim(),
                password: reqPassword,
                weightKg: Number(reqWeightKg),
                heightCm: Number(reqHeightCm),
                sex: reqSex,
                birthYear: reqBirthYear ? Number(reqBirthYear) : null,
                requestNote: reqNote.trim() || undefined,
                websiteUrl: websiteUrl || undefined,
            });

            localStorage.setItem(REQUEST_SUBMITTED_STORAGE_KEY, String(Date.now()));
            setRequestSentSuccess(true);
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { detail?: string } } };
                setErrorMsg(
                    axiosErr.response?.data?.detail ||
                    'Could not submit access request. Check your details.'
                );
            } else {
                setErrorMsg('Network error while submitting request.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center px-4 py-8">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
                <div className="flex flex-col items-center text-center mb-6">
                    {!iconError ? (
                        <img
                            src={appIconUrl}
                            alt="Dose"
                            onError={() => setIconError(true)}
                            className="w-14 h-14 rounded-2xl object-cover border border-red-600/40 mb-3 shadow-lg shadow-red-600/20"
                        />
                    ) : (
                        <div className="w-14 h-14 rounded-2xl bg-red-600/15 border border-red-600/40 flex items-center justify-center text-red-500 mb-3">
                            <Wine className="w-7 h-7" />
                        </div>
                    )}
                    <h1 className="text-2xl font-black text-white tracking-tight">Dose</h1>
                    <p className="text-xs text-neutral-400 mt-1">
                        {mode === 'login'
                            ? 'Sign in to your account'
                            : 'Request an account from the host'}
                    </p>
                </div>

                {errorMsg && (
                    <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/70 flex items-center gap-2.5 text-xs text-red-300">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {mode === 'login' ? (
                    <>
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                                    Username or Email
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        autoComplete="username"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        placeholder="Enter username or email"
                                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-2 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-lg shadow-red-600/25"
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

                        <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setErrorMsg(null);
                                    setMode('request');
                                }}
                                className="text-xs font-bold text-red-400 hover:text-red-300 inline-flex items-center gap-1.5 transition-colors"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                Don&apos;t have an account? Request Access
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="space-y-4">
                        {requestSentSuccess ? (
                            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/70 text-center space-y-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                                <h3 className="text-sm font-bold text-white">
                                    Access Request Sent!
                                </h3>
                                <p className="text-xs text-neutral-300 leading-relaxed">
                                    Your request is awaiting approval by the host. Once approved,
                                    you can sign in using the username and password you chose.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleRequestAccessSubmit} className="space-y-3.5">
                                {/* Honeypot field (hidden from real users) */}
                                <input
                                    type="text"
                                    name="websiteUrl"
                                    tabIndex={-1}
                                    autoComplete="off"
                                    value={websiteUrl}
                                    onChange={(e) => setWebsiteUrl(e.target.value)}
                                    className="hidden"
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                            Username
                                        </label>
                                        <div className="relative">
                                            <User className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                required
                                                minLength={3}
                                                maxLength={50}
                                                value={reqUsername}
                                                onChange={(e) => setReqUsername(e.target.value)}
                                                placeholder="yourname"
                                                className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                            Email
                                        </label>
                                        <div className="relative">
                                            <Mail className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="email"
                                                required
                                                value={reqEmail}
                                                onChange={(e) => setReqEmail(e.target.value)}
                                                placeholder="you@example.com"
                                                className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                        Password (min 8 characters)
                                    </label>
                                    <div className="relative">
                                        <Lock className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="password"
                                            required
                                            minLength={8}
                                            value={reqPassword}
                                            onChange={(e) => setReqPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                            Weight (kg)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="30"
                                            max="250"
                                            required
                                            value={reqWeightKg}
                                            onChange={(e) => setReqWeightKg(e.target.value)}
                                            className="w-full px-2.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                            Height (cm)
                                        </label>
                                        <input
                                            type="number"
                                            min="100"
                                            max="230"
                                            required
                                            value={reqHeightCm}
                                            onChange={(e) => setReqHeightCm(e.target.value)}
                                            className="w-full px-2.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                            Birth Year
                                        </label>
                                        <input
                                            type="number"
                                            min="1920"
                                            max="2010"
                                            required
                                            value={reqBirthYear}
                                            onChange={(e) => setReqBirthYear(e.target.value)}
                                            className="w-full px-2.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                        Biological Sex (for BAC calculation)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['Male', 'Female'] as BiologicalSex[]).map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setReqSex(s)}
                                                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                                    reqSex === s
                                                        ? 'bg-red-600/20 border-red-600 text-red-300'
                                                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                                                }`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                                        Note for the Host (optional)
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={200}
                                        value={reqNote}
                                        onChange={(e) => setReqNote(e.target.value)}
                                        placeholder="e.g., Marco's friend from Saturday party"
                                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 transition-all"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Submitting Request...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            Send Access Request
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        <div className="pt-3 border-t border-neutral-800 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setErrorMsg(null);
                                    setMode('login');
                                }}
                                className="text-xs font-bold text-neutral-400 hover:text-white inline-flex items-center gap-1.5 transition-colors"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Back to Sign In
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};