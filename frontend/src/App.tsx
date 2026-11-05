import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Layout } from '@/components/common/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { CatalogPage } from '@/pages/CatalogPage';
import { CabinetMatcherPage } from '@/pages/CabinetMatcherPage';
import { MyBacDashboardPage } from '@/pages/MyBacDashboardPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AdminSafetyMonitorPage } from '@/pages/admin/AdminSafetyMonitorPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminReviewsPage } from '@/pages/admin/AdminReviewsPage';
import {isAdmin} from "@/utils/auth";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const hasAdminAccess = isAdmin(user);
    if (requireAdmin && !hasAdminAccess) {
        return <Navigate to="/drinks" replace />;
    }

    return <>{children}</>;
};

export default function App() {
    return (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
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
                    <Route path="/profile" element={<ProfilePage />} />

                    {/* Admin Routes */}
                    <Route
                        path="/admin/users"
                        element={
                            <ProtectedRoute requireAdmin>
                                <AdminUsersPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/reviews"
                        element={
                            <ProtectedRoute requireAdmin>
                                <AdminReviewsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/safety"
                        element={
                            <ProtectedRoute requireAdmin>
                                <AdminSafetyMonitorPage />
                            </ProtectedRoute>
                        }
                    />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/drinks" replace />} />
            </Routes>
        </BrowserRouter>
    );
}