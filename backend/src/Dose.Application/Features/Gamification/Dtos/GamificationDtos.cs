namespace Dose.Application.Features.Gamification.Dtos;

public record MonthlyBadgeDto(
    string Key,
    string Title,
    string Description,
    string Category,
    string Icon,
    string Tone,
    bool IsEarned,
    int CurrentProgress,
    int TargetProgress
);

public record MonthlyBadgesResponseDto(
    string Period,
    DateTimeOffset ResetsAtUtc,
    IReadOnlyList<MonthlyBadgeDto> Badges
);

public record AchievementPassportItemDto(
    string Key,
    string Title,
    string Subtitle,
    string Description,
    string Category,
    string Icon,
    bool IsUnlocked,
    DateTimeOffset? UnlockedAtUtc,
    int CurrentProgress,
    int TargetProgress,
    decimal ProgressPercent
);

public record AchievementPassportResponseDto(
    int UnlockedCount,
    int TotalCount,
    IReadOnlyList<AchievementPassportItemDto> Achievements
);
