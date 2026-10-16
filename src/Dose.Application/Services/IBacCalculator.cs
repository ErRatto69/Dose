using Dose.Domain.Enums;

namespace Dose.Application.Services;

public record DrinkEventInput(
    Guid LogId,
    string DrinkName,
    DateTimeOffset ConsumedAt,
    decimal PureAlcoholGrams
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
    IReadOnlyList<BacTimelinePoint> Timeline
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
        DateTimeOffset now);
}