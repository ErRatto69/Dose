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
        <div className="min-h-[100dvh] bg-[#09090b] flex flex-col lg:grid lg:grid-cols-12 relative overflow-hidden">
            {/* Ruby atmospheric glow anchored top-center on mobile, left stage on desktop */}
            <div
                className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 lg:left-1/4 w-full max-w-[560px] h-[340px] opacity-35"
                style={{
                    background: 'radial-gradient(ellipse at center top, rgba(185, 28, 28, 0.36), transparent 72%)',
                }}
                aria-hidden="true"
            />

            {/* Brand Stage (Top on Mobile, Left Split on Desktop) */}
            <div className="relative lg:col-span-5 lg:border-r lg:border-white/[0.08] lg:bg-[#0b0b0e] flex flex-col justify-end lg:justify-between px-6 pt-[max(2.75rem,env(safe-area-inset-top))] pb-6 lg:p-12">
                <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-red-600" aria-hidden="true" />
                    <span>Self-Hosted Bar &amp; Telemetry</span>
                </div>

                <div className="flex flex-col items-start text-left max-w-sm">
                    {!iconError ? (
                        <img
                            src={appIconUrl}
                            alt="Dose"
                            width={68}
                            height={68}
                            onError={() => setIconError(true)}
                            className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl object-cover border border-red-600/45 bg-[#09090b] mb-4"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-red-600/15 border border-red-600/45 flex items-center justify-center text-red-500 mb-4">
                            <Wine className="w-8 h-8" aria-hidden="true" />
                        </div>
                    )}
                    <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-wide leading-none" translate="no">
                        DOSE
                    </h1>
                    <p className="text-sm text-zinc-300 mt-2.5 leading-relaxed text-pretty">
                        {mode === 'login'
                            ? 'Craft cocktail catalog, custom pours, and real-time BAC telemetry.'
                            : 'Request bar access from your host with baseline BAC biometrics.'}
                    </p>
                </div>

                {/* Calibrated horizontal hairline accent on desktop */}
                <div className="hidden lg:grid grid-cols-3 gap-4 pt-6 border-t border-white/[0.08] text-xs">
                    <div>
                        <span className="text-zinc-400 block">Precision</span>
                        <strong className="text-zinc-100 font-bold tabular-nums">cl / oz live scale</strong>
                    </div>
                    <div>
                        <span className="text-zinc-400 block">Telemetry</span>
                        <strong className="text-zinc-100 font-bold tabular-nums">0.50 g/L curve</strong>
                    </div>
                    <div>
                        <span className="text-zinc-400 block">Collection</span>
                        <strong className="text-zinc-100 font-bold">Cocktail Passport</strong>
                    </div>
                </div>
            </div>

            {/* Form Stage (Borderless Full-Width Mobile Canvas, Clean Right Column on Desktop) */}
            <div className="relative lg:col-span-7 flex-1 flex flex-col justify-start lg:justify-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:px-16">
                <div className="w-full max-w-md mx-auto lg:mx-0">
                    {errorMsg && (
                        <div
                            role="alert"
                            aria-live="polite"
                            className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-700/60 flex items-center gap-2.5 text-xs text-red-200"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" aria-hidden="true" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {mode === 'login' ? (
                        <>
                            <form onSubmit={handleLoginSubmit} className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="login-identifier"
                                        className="text-xs font-bold text-zinc-300 block mb-1.5"
                                    >
                                        Username or Email
                                    </label>
                                    <div className="relative">
                                        <User
                                            className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                            aria-hidden="true"
                                        />
                                        <input
                                            id="login-identifier"
                                            name="username"
                                            type="text"
                                            autoComplete="username"
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                            spellCheck={false}
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            placeholder="Enter username or email…"
                                            className="w-full min-h-[48px] pl-10 pr-4 py-3 rounded-xl text-sm dose-input"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="login-password"
                                        className="text-xs font-bold text-zinc-300 block mb-1.5"
                                    >
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Lock
                                            className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                            aria-hidden="true"
                                        />
                                        <input
                                            id="login-password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full min-h-[48px] pl-10 pr-4 py-3 rounded-xl text-sm dose-input"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full min-h-[48px] mt-2 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 border border-red-500/50 dose-press"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                            <span>Signing In…</span>
                                        </>
                                    ) : (
                                        <span>Sign In</span>
                                    )}
                                </button>
                            </form>

                            <div className="mt-7 pt-5 border-t border-white/[0.08] flex items-center justify-between gap-3">
                                <span className="text-xs text-zinc-400">New at the bar?</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setErrorMsg(null);
                                        setMode('request');
                                    }}
                                    className="min-h-[40px] px-3.5 rounded-xl bg-[#111114] hover:bg-[#18181d] border border-white/[0.08] text-xs font-bold text-red-400 hover:text-red-300 inline-flex items-center gap-1.5 dose-press"
                                >
                                    <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Request Access</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            {requestSentSuccess ? (
                                <div className="p-5 rounded-2xl bg-emerald-950/35 border border-emerald-700/50 text-center space-y-2">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" aria-hidden="true" />
                                    <h2 className="text-sm font-extrabold text-white">
                                        Access Request Sent
                                    </h2>
                                    <p className="text-xs text-zinc-300 leading-relaxed">
                                        Your request is awaiting approval by the host. Once approved,
                                        sign in with the username and password you chose.
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleRequestAccessSubmit} className="space-y-3.5">
                                    <input
                                        type="text"
                                        name="websiteUrl"
                                        tabIndex={-1}
                                        aria-hidden="true"
                                        autoComplete="off"
                                        value={websiteUrl}
                                        onChange={(e) => setWebsiteUrl(e.target.value)}
                                        className="hidden"
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label
                                                htmlFor="req-username"
                                                className="text-xs font-bold text-zinc-300 block mb-1"
                                            >
                                                Username
                                            </label>
                                            <div className="relative">
                                                <User
                                                    className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                                    aria-hidden="true"
                                                />
                                                <input
                                                    id="req-username"
                                                    name="reqUsername"
                                                    type="text"
                                                    required
                                                    minLength={3}
                                                    maxLength={50}
                                                    autoComplete="username"
                                                    autoCapitalize="none"
                                                    autoCorrect="off"
                                                    spellCheck={false}
                                                    value={reqUsername}
                                                    onChange={(e) => setReqUsername(e.target.value)}
                                                    placeholder="alex_bar…"
                                                    className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl text-xs dose-input"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label
                                                htmlFor="req-email"
                                                className="text-xs font-bold text-zinc-300 block mb-1"
                                            >
                                                Email
                                            </label>
                                            <div className="relative">
                                                <Mail
                                                    className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                                    aria-hidden="true"
                                                />
                                                <input
                                                    id="req-email"
                                                    name="reqEmail"
                                                    type="email"
                                                    required
                                                    autoComplete="email"
                                                    spellCheck={false}
                                                    value={reqEmail}
                                                    onChange={(e) => setReqEmail(e.target.value)}
                                                    placeholder="you@example.com…"
                                                    className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl text-xs dose-input"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="req-password"
                                            className="text-xs font-bold text-zinc-300 block mb-1"
                                        >
                                            Password (min 8 characters)
                                        </label>
                                        <div className="relative">
                                            <Lock
                                                className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                                aria-hidden="true"
                                            />
                                            <input
                                                id="req-password"
                                                name="newPassword"
                                                type="password"
                                                required
                                                minLength={8}
                                                autoComplete="new-password"
                                                value={reqPassword}
                                                onChange={(e) => setReqPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl text-xs dose-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2.5">
                                        <div>
                                            <label
                                                htmlFor="req-weight"
                                                className="text-xs font-bold text-zinc-300 block mb-1"
                                            >
                                                Weight (kg)
                                            </label>
                                            <input
                                                id="req-weight"
                                                type="number"
                                                inputMode="decimal"
                                                step="0.5"
                                                min="30"
                                                max="250"
                                                required
                                                value={reqWeightKg}
                                                onChange={(e) => setReqWeightKg(e.target.value)}
                                                className="w-full min-h-[44px] px-2.5 py-2 rounded-xl text-xs tabular-nums dose-input"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                htmlFor="req-height"
                                                className="text-xs font-bold text-zinc-300 block mb-1"
                                            >
                                                Height (cm)
                                            </label>
                                            <input
                                                id="req-height"
                                                type="number"
                                                inputMode="numeric"
                                                min="100"
                                                max="230"
                                                required
                                                value={reqHeightCm}
                                                onChange={(e) => setReqHeightCm(e.target.value)}
                                                className="w-full min-h-[44px] px-2.5 py-2 rounded-xl text-xs tabular-nums dose-input"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                htmlFor="req-birth"
                                                className="text-xs font-bold text-zinc-300 block mb-1"
                                            >
                                                Birth Year
                                            </label>
                                            <input
                                                id="req-birth"
                                                type="number"
                                                inputMode="numeric"
                                                min="1920"
                                                max="2010"
                                                required
                                                value={reqBirthYear}
                                                onChange={(e) => setReqBirthYear(e.target.value)}
                                                className="w-full min-h-[44px] px-2.5 py-2 rounded-xl text-xs tabular-nums dose-input"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-xs font-bold text-zinc-300 block mb-1">
                                            Biological Sex (for BAC calculation)
                                        </span>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(['Male', 'Female'] as BiologicalSex[]).map((s) => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setReqSex(s)}
                                                    aria-pressed={reqSex === s}
                                                    className={`min-h-[44px] py-2 rounded-xl text-xs font-bold border dose-press ${
                                                        reqSex === s
                                                            ? 'bg-red-600/20 border-red-500 text-red-200'
                                                            : 'bg-[#0c0c0f] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
                                                    }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="req-note"
                                            className="text-xs font-bold text-zinc-300 block mb-1"
                                        >
                                            Note for the Host (optional)
                                        </label>
                                        <input
                                            id="req-note"
                                            type="text"
                                            maxLength={200}
                                            value={reqNote}
                                            onChange={(e) => setReqNote(e.target.value)}
                                            placeholder="e.g., Marco's friend from Saturday…"
                                            className="w-full min-h-[44px] px-3 py-2 rounded-xl text-xs dose-input"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full min-h-[48px] py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 border border-red-500/50 dose-press"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                                <span>Submitting Request…</span>
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="w-4 h-4" aria-hidden="true" />
                                                <span>Send Access Request</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            <div className="pt-4 border-t border-white/[0.08]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setErrorMsg(null);
                                        setMode('login');
                                    }}
                                    className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-zinc-400 hover:text-white inline-flex items-center gap-1.5 dose-press"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Back to Sign In</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
