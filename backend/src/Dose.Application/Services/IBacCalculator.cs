using Dose.Domain.Enums;

namespace Dose.Application.Services;

public record LoggedDrinkComponentDto(
    Guid? IngredientId,
    string Name,
    string Category,
    decimal Abv,
    decimal AmountCl
);

public record DrinkEventInput(
    Guid LogId,
    string DrinkName,
    DateTimeOffset ConsumedAt,
    decimal PureAlcoholGrams,
    decimal TotalVolumeCl = 0m,
    decimal EffectiveAbv = 0m,
    string? Notes = null,
    IReadOnlyList<LoggedDrinkComponentDto>? Components = null,
    StomachState StomachState = StomachState.LightSnack,
    int TotalKcal = 0
);

public record WaterEventInput(
    Guid Id,
    decimal AmountCl,
    DateTimeOffset ConsumedAt
);

public record BacTimelinePoint(
    DateTimeOffset Timestamp,
    decimal BacGramsPerDl,
    decimal BacGramsPerLiter
);

public record BacCalculationResult(
    decimal CurrentBacGramsPerDl,
    decimal CurrentBacGramsPerLiter,
    BacSafetyLevel SafetyLevel,
    string SafetyMessage,
    DateTimeOffset? EstimatedSoberAt,
    decimal TotalAlcoholGramsLast12h,
    IReadOnlyList<BacTimelinePoint> Timeline,
    int HangoverRiskPercent = 0,
    int ResponsibleDrinkingScore = 100,
    int TotalKcalLast12h = 0,
    decimal TotalWaterClLast12h = 0m,
    int WaterLogsCountLast12h = 0
);

public interface IBacCalculator
{
    decimal CalculateWatsonTbwLiters(
        decimal weightKg,
        decimal heightCm,
        BiologicalSex sex,
        int? birthYear,
        DateTimeOffset referenceTime);

    BacCalculationResult ComputeRollingBac(
        decimal weightKg,
        decimal heightCm,
        BiologicalSex sex,
        int? birthYear,
        IEnumerable<DrinkEventInput> logsLast12Hours,
        IEnumerable<WaterEventInput> waterLogsLast12Hours,
        DateTimeOffset now);
}