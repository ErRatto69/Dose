using Dose.Application.Services;

namespace Dose.Application.Features.DrinkLogs.Dtos;

public record LoggedMetricsDto(
    decimal TotalVolumeCl,
    decimal EffectiveAbv,
    decimal PureAlcoholGrams,
    int BottleScore1To10
);

public record DrinkLogResponseDto(
    Guid LogId,
    string DrinkNameSnapshot,
    bool IsCustomized,
    DateTimeOffset ConsumedAt,
    LoggedMetricsDto LoggedMetrics,
    BacCalculationResult UpdatedBacStatus
);