using Dose.Application.Features.Gamification.Dtos;
using Dose.Domain.Enums;

namespace Dose.Application.Services;

public class MonthlyBadgeCalculator(IBacCalculator bacCalculator) : IMonthlyBadgeCalculator
{
    private const int SpiritMasterThreshold = 3;
    private const int HydrationHeroThreshold = 10;
    private const int CalorieBurnerThreshold = 1500;

    private static readonly SpiritRule[] SpiritRules =
    [
        new(
            Key: "VodkaMaster",
            Title: "Vodka Master",
            Description: $"Log {SpiritMasterThreshold}+ vodka pours in the current UTC month.",
            Icon: "sparkles",
            Tone: "sky",
            Matches: name => name.Contains("vodka", StringComparison.OrdinalIgnoreCase)),
        new(
            Key: "GinMaster",
            Title: "Gin Master",
            Description: $"Log {SpiritMasterThreshold}+ gin pours in the current UTC month.",
            Icon: "leaf",
            Tone: "emerald",
            Matches: name => name.Contains("gin", StringComparison.OrdinalIgnoreCase)
                             && !name.Contains("ginger", StringComparison.OrdinalIgnoreCase)),
        new(
            Key: "RumMaster",
            Title: "Rum Master",
            Description: $"Log {SpiritMasterThreshold}+ rum pours in the current UTC month.",
            Icon: "anchor",
            Tone: "amber",
            Matches: name => name.Contains("rum", StringComparison.OrdinalIgnoreCase)
                             || name.Contains("cachaca", StringComparison.OrdinalIgnoreCase)
                             || name.Contains("cachaça", StringComparison.OrdinalIgnoreCase)),
        new(
            Key: "AgaveMaster",
            Title: "Agave Master",
            Description: $"Log {SpiritMasterThreshold}+ tequila or mezcal pours in the current UTC month.",
            Icon: "sun",
            Tone: "orange",
            Matches: name => name.Contains("tequila", StringComparison.OrdinalIgnoreCase)
                             || name.Contains("mezcal", StringComparison.OrdinalIgnoreCase)),
        new(
            Key: "WhiskeyMaster",
            Title: "Whiskey Master",
            Description: $"Log {SpiritMasterThreshold}+ whiskey, bourbon, or scotch pours in the current UTC month.",
            Icon: "flame",
            Tone: "rose",
            Matches: name => name.Contains("whiskey", StringComparison.OrdinalIgnoreCase)
                             || name.Contains("whisky", StringComparison.OrdinalIgnoreCase)
                             || name.Contains("bourbon", StringComparison.OrdinalIgnoreCase)
                             || name.Contains("scotch", StringComparison.OrdinalIgnoreCase))
    ];

    public IReadOnlyList<MonthlyBadgeDto> ComputeMonthlyBadges(
        MonthlyBadgeUserContext userContext,
        IReadOnlyList<MonthlyDrinkLogInput> monthDrinkLogs,
        IReadOnlyList<MonthlyDrinkLogItemInput> monthDrinkLogItems,
        int monthWaterLogsCount)
    {
        var badges = new List<MonthlyBadgeDto>(SpiritRules.Length + 3);

        // 1. Spirit Master Badges (distinct drink logs containing each spirit this month)
        var activeItems = monthDrinkLogItems.Where(i => i.AmountCl > 0).ToList();
        foreach (var rule in SpiritRules)
        {
            int distinctLogs = activeItems
                .Where(i => rule.Matches(i.IngredientNameSnapshot))
                .Select(i => i.DrinkLogId)
                .Distinct()
                .Count();

            badges.Add(new MonthlyBadgeDto(
                Key: rule.Key,
                Title: rule.Title,
                Description: rule.Description,
                Category: "SpiritMaster",
                Icon: rule.Icon,
                Tone: rule.Tone,
                IsEarned: distinctLogs >= SpiritMasterThreshold,
                CurrentProgress: Math.Min(distinctLogs, SpiritMasterThreshold),
                TargetProgress: SpiritMasterThreshold
            ));
        }

        // 2. Hydration Hero (10+ water logs in active UTC month)
        badges.Add(new MonthlyBadgeDto(
            Key: "HydrationHero",
            Title: "Hydration Hero",
            Description: $"Log {HydrationHeroThreshold}+ water intakes in the current UTC month.",
            Category: "Hydration",
            Icon: "droplets",
            Tone: "cyan",
            IsEarned: monthWaterLogsCount >= HydrationHeroThreshold,
            CurrentProgress: Math.Min(monthWaterLogsCount, HydrationHeroThreshold),
            TargetProgress: HydrationHeroThreshold
        ));

        // 3. Safe Connoisseur (at least 1 drink logged this month with 0 critical BAC breaches)
        bool hasDrinks = monthDrinkLogs.Count > 0;
        bool hasCriticalBreach = hasDrinks && HasCriticalBacBreach(userContext, monthDrinkLogs);
        bool isSafeConnoisseur = hasDrinks && !hasCriticalBreach;

        badges.Add(new MonthlyBadgeDto(
            Key: "SafeConnoisseur",
            Title: "Safe Connoisseur",
            Description: "Enjoy drinks this month with zero Critical BAC breaches (< 1.50 g/L).",
            Category: "Safety",
            Icon: "shield-check",
            Tone: "emerald",
            IsEarned: isSafeConnoisseur,
            CurrentProgress: isSafeConnoisseur ? 1 : 0,
            TargetProgress: 1
        ));

        // 4. Calorie Burner (1,500+ estimated drink kcal logged in active UTC month)
        int totalMonthlyKcal = Math.Max(0, monthDrinkLogs.Sum(l => l.TotalKcal));
        badges.Add(new MonthlyBadgeDto(
            Key: "CalorieBurner",
            Title: "Calorie Burner",
            Description: $"Accumulate {CalorieBurnerThreshold:N0}+ kcal across monthly pours.",
            Category: "Calories",
            Icon: "zap",
            Tone: "violet",
            IsEarned: totalMonthlyKcal >= CalorieBurnerThreshold,
            CurrentProgress: Math.Min(totalMonthlyKcal, CalorieBurnerThreshold),
            TargetProgress: CalorieBurnerThreshold
        ));

        return badges;
    }

    private bool HasCriticalBacBreach(
        MonthlyBadgeUserContext userContext,
        IReadOnlyList<MonthlyDrinkLogInput> monthDrinkLogs)
    {
        var orderedLogs = monthDrinkLogs
            .OrderBy(l => l.ConsumedAt)
            .Select(l => new DrinkEventInput(
                l.LogId,
                l.DrinkNameSnapshot,
                l.ConsumedAt,
                l.PureAlcoholGrams,
                0m,
                0m,
                null,
                null,
                l.StomachState,
                l.TotalKcal))
            .ToList();

        for (int i = 0; i < orderedLogs.Count; i++)
        {
            DateTimeOffset evalTime = orderedLogs[i].ConsumedAt;
            DateTimeOffset windowStart = evalTime.AddHours(-12);

            var windowEvents = orderedLogs
                .Where(e => e.ConsumedAt >= windowStart && e.ConsumedAt <= evalTime);

            var bacResult = bacCalculator.ComputeRollingBac(
                userContext.WeightKg,
                userContext.HeightCm,
                userContext.Sex,
                userContext.BirthYear,
                windowEvents,
                Array.Empty<WaterEventInput>(),
                evalTime);

            if (bacResult.SafetyLevel == BacSafetyLevel.Critical)
            {
                return true;
            }
        }

        return false;
    }

    private sealed record SpiritRule(
        string Key,
        string Title,
        string Description,
        string Icon,
        string Tone,
        Func<string, bool> Matches);
}
