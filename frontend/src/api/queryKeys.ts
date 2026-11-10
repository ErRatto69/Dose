export const queryKeys = {
    bac: {
        me: () => ['my-bac-status'] as const,
        adminOverview: (page: number, search?: string) =>
            ['admin', 'users', 'bac-overview', { page, search: search || '' }] as const,
    },
    leaderboard: {
        monthly: (period?: string) =>
            period ? (['monthly-leaderboard', period] as const) : (['monthly-leaderboard'] as const),
    },
    gamification: {
        monthlyBadges: () => ['badges', 'monthly'] as const,
        passport: () => ['achievements', 'passport'] as const,
    },
};
