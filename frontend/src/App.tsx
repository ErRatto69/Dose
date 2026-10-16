import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { Layout } from '@/components/common/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { CatalogPage } from '@/pages/CatalogPage';
import { CabinetMatcherPage } from '@/pages/CabinetMatcherPage';
import { MyBacDashboardPage } from '@/pages/MyBacDashboardPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { AdminSafetyMonitorPage } from '@/pages/admin/AdminSafetyMonitorPage';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 2, // 2 minuti di cache standard
            retry: 1,
        },
    },
});

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requireAdmin && user?.role !== 'Admin') {
        return <Navigate to="/drinks" replace />;
    }

    return <>{children}</>;
};

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    {/* Public Authentication Route */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected Application Routes inside Master Shell */}
                    <Route
                        element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="/" element={<Navigate to="/drinks" replace />} />
                        <Route path="/drinks" element={<CatalogPage />} />
                        <Route path="/cabinet" element={<CabinetMatcherPage />} />
                        <Route path="/bac" element={<MyBacDashboardPage />} />
                        <Route path="/leaderboard" element={<LeaderboardPage />} />

                        {/* Admin-only Live Safety Telemetry */}
                        <Route
                            path="/admin/safety"
                            element={
                                <ProtectedRoute requireAdmin>
                                    <AdminSafetyMonitorPage />
                                </ProtectedRoute>
                            }
                        />
                    </Route>

                    {/* Fallback Catch-All */}
                    <Route path="*" element={<Navigate to="/drinks" replace />} />
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    );
}