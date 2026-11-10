using Dose.Application.Features.Gamification.Dtos;

namespace Dose.Application.Common.Interfaces;

public interface IGamificationService
{
    Task<MonthlyBadgesResponseDto> GetMonthlyBadgesAsync(Guid userId, int year, int month, CancellationToken ct = default);

    Task<IReadOnlyDictionary<Guid, IReadOnlyList<MonthlyBadgeDto>>> GetEarnedMonthlyBadgesForUsersAsync(
        IReadOnlyCollection<Guid> userIds,
        int year,
        int month,
        CancellationToken ct = default);

    Task<AchievementPassportResponseDto> GetPassportAsync(Guid userId, CancellationToken ct = default);

    Task RecordDrinkLoggedAsync(Guid userId, string? glassType, CancellationToken ct = default);

    Task RecordWaterLoggedAsync(Guid userId, CancellationToken ct = default);

    Task RecordCustomDrinkCreatedAsync(Guid userId, CancellationToken ct = default);

    Task RecordReviewSubmittedAsync(Guid userId, CancellationToken ct = default);

    void InvalidateMonthlyBadgesCache(Guid userId, DateTimeOffset consumedAtUtc);
}
