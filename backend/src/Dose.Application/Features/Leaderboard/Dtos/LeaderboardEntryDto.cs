using Dose.Application.Features.Gamification.Dtos;

namespace Dose.Application.Features.Leaderboard.Dtos;

public record LeaderboardEntryDto(
    int Rank,
    Guid UserId,
    string Username,
    int DrinksCount,
    decimal MonthlyPureAlcoholGrams,
    decimal MonthlyPureAlcoholCl,
    RankingTierDto CurrentTier,
    decimal NextTierProgressPercent,
    decimal GramsToNextTier,
    IReadOnlyList<MonthlyBadgeDto>? MonthlyBadges = null
);

public record MonthlyLeaderboardResponseDto(
    string Period, // "YYYY-MM"
    DateTimeOffset ResetsAt,
    IReadOnlyList<LeaderboardEntryDto> Entries
);