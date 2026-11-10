namespace Dose.Application.Services;

public sealed record AchievementDefinition(
    string Key,
    string Title,
    string Subtitle,
    string Description,
    string Category,
    string Icon,
    int TargetProgress
);

public static class AchievementDefinitions
{
    public const string FirstDropKey = "FirstDrop";
    public const string GlobetrotterKey = "Globetrotter";
    public const string MasterAlchemistKey = "MasterAlchemist";
    public const string TheCriticKey = "TheCritic";
    public const string HydrationSavantKey = "HydrationSavant";
    public const string CenturyPourKey = "CenturyPour";

    public static readonly IReadOnlyList<AchievementDefinition> All =
    [
        new(
            Key: FirstDropKey,
            Title: "First Drop",
            Subtitle: "Inaugural Pour",
            Description: "Log your very first drink in Dose.",
            Category: "Milestone",
            Icon: "wine",
            TargetProgress: 1
        ),
        new(
            Key: GlobetrotterKey,
            Title: "Globetrotter",
            Subtitle: "Glassware Collector",
            Description: "Enjoy catalog cocktails served in 8+ distinct glass types.",
            Category: "Exploration",
            Icon: "compass",
            TargetProgress: 8
        ),
        new(
            Key: MasterAlchemistKey,
            Title: "Master Alchemist (Recipe Creator)",
            Subtitle: "Lifetime Craft Stamp",
            Description: "Author 5 custom cocktail recipes in the Dose catalog.",
            Category: "Craftsmanship",
            Icon: "flask-conical",
            TargetProgress: 5
        ),
        new(
            Key: TheCriticKey,
            Title: "The Critic",
            Subtitle: "Palate Judge",
            Description: "Submit 10 tasting reviews across the cocktail catalog.",
            Category: "Community",
            Icon: "message-square-quote",
            TargetProgress: 10
        ),
        new(
            Key: HydrationSavantKey,
            Title: "Hydration Savant",
            Subtitle: "Balance Keeper",
            Description: "Log 25 water hydration entries across all sessions.",
            Category: "Wellness",
            Icon: "droplets",
            TargetProgress: 25
        ),
        new(
            Key: CenturyPourKey,
            Title: "Century Pour",
            Subtitle: "Seasoned Connoisseur",
            Description: "Log 100 drinks across your lifetime Dose passport.",
            Category: "Milestone",
            Icon: "award",
            TargetProgress: 100
        )
    ];

    public static readonly IReadOnlyDictionary<string, AchievementDefinition> ByKey =
        All.ToDictionary(a => a.Key, StringComparer.OrdinalIgnoreCase);
}
