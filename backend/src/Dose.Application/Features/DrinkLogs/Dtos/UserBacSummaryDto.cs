namespace Dose.Application.Features.DrinkLogs.Dtos;

public record UserBacSummaryDto(
    Guid Id,
    string Username,
    decimal CurrentBacGramsPerLiter,
    string SafetyLevel,
    DateTimeOffset? EstimatedSoberAt,
    int TotalDrinksLast12h
);

public record AdminBacOverviewDto(
    IReadOnlyList<UserBacSummaryDto> Items,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages,
    bool HasPreviousPage,
    bool HasNextPage,
    int CriticalCount
);
