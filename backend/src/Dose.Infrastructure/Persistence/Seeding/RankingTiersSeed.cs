using Dose.Domain.Entities;

namespace Dose.Infrastructure.Persistence.Seeding;

public static class RankingTiersSeed
{
    public static IReadOnlyList<RankingTier> GetInitialTiers() =>
    [
        new("Observer", 0, 0.00m, 0.00m, "eye", "#9CA3AF"),
        new("Casual Drinker", 1, 40.00m, 5.07m, "beer", "#38BDF8"),
        new("Amateur Mixer", 2, 120.00m, 15.21m, "martini", "#10B981"),
        new("Pro Taster", 3, 240.00m, 30.42m, "flame", "#F59E0B"),
        new("Master Alchemist", 4, 400.00m, 50.70m, "crown", "#EF4444")
    ];
}