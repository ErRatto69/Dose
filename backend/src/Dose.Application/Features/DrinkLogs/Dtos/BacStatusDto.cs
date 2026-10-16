using Dose.Application.Services;
using Dose.Domain.Enums;

namespace Dose.Application.Features.DrinkLogs.Dtos;

public record BacStatusDto(
    Guid UserId,
    DateTimeOffset CalculatedAt,
    decimal CurrentBacGramsPerDl,
    decimal CurrentBacGramsPerLiter,
    BacSafetyLevel SafetyLevel,
    string SafetyMessage,
    DateTimeOffset? EstimatedSoberAt,
    decimal TotalAlcoholGramsLast12h,
    IReadOnlyList<DrinkEventInput> ActiveLogsLast12h,
    IReadOnlyList<BacTimelinePoint> Timeline
);