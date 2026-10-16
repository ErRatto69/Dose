using Dose.Domain.Enums;

namespace Dose.Application.Services;

public class BacCalculator : IBacCalculator
{
    private const decimal BloodWaterFraction = 0.806m;
    private const decimal BetaEliminationPerHour = 0.015m; // 0.015 g/dL per hour = 0.15 g/L per hour
    private const int DefaultReferenceAge = 25;

    public decimal CalculateWatsonTbwLiters(
        decimal weightKg,
        decimal heightCm,
        BiologicalSex sex,
        int? birthYear,
        DateTimeOffset referenceTime)
    {
        int age = birthYear.HasValue
            ? Math.Clamp(referenceTime.Year - birthYear.Value, 18, 99)
            : DefaultReferenceAge;

        decimal tbw = sex == BiologicalSex.Male
            ? 2.447m - (0.09516m * age) + (0.1074m * heightCm) + (0.3362m * weightKg)
            : -2.097m + (0.1069m * heightCm) + (0.2466m * weightKg);

        // Fallback to standard Widmark distribution volume if inputs yield extreme values
        if (tbw <= 10m)
        {
            decimal widmarkR = sex == BiologicalSex.Male ? 0.68m : 0.55m;
            tbw = weightKg * widmarkR * BloodWaterFraction;
        }

        return Math.Round(tbw, 3);
    }

    public BacCalculationResult ComputeRollingBac(
        decimal weightKg,
        decimal heightCm,
        BiologicalSex sex,
        int? birthYear,
        IEnumerable<DrinkEventInput> logsLast12Hours,
        DateTimeOffset now)
    {
        decimal tbwLiters = CalculateWatsonTbwLiters(weightKg, heightCm, sex, birthYear, now);

        var orderedEvents = logsLast12Hours
            .Where(e => e.ConsumedAt <= now && e.ConsumedAt >= now.AddHours(-12))
            .OrderBy(e => e.ConsumedAt)
            .ToList();

        decimal currentBac = 0m; // in g/dL
        DateTimeOffset? lastTimestamp = null;
        var timeline = new List<BacTimelinePoint>();

        foreach (var ev in orderedEvents)
        {
            if (lastTimestamp.HasValue)
            {
                decimal elapsedHours = (decimal)(ev.ConsumedAt - lastTimestamp.Value).TotalHours;
                if (elapsedHours > 0)
                {
                    currentBac = Math.Max(0m, currentBac - (BetaEliminationPerHour * elapsedHours));
                }
            }

            // Timeline node right before intake
            timeline.Add(new BacTimelinePoint(
                ev.ConsumedAt,
                Math.Round(currentBac, 4),
                Math.Round(currentBac * 10m, 3)
            ));

            // Instantaneous peak increment
            decimal deltaBac = (ev.PureAlcoholGrams * (BloodWaterFraction / 10m)) / tbwLiters;
            currentBac += deltaBac;
            lastTimestamp = ev.ConsumedAt;

            // Timeline node right after intake
            timeline.Add(new BacTimelinePoint(
                ev.ConsumedAt,
                Math.Round(currentBac, 4),
                Math.Round(currentBac * 10m, 3)
            ));
        }

        // Metabolic decay from the latest logged drink until current instant
        if (lastTimestamp.HasValue)
        {
            decimal hoursSinceLastDrink = (decimal)(now - lastTimestamp.Value).TotalHours;
            if (hoursSinceLastDrink > 0)
            {
                currentBac = Math.Max(0m, currentBac - (BetaEliminationPerHour * hoursSinceLastDrink));
            }
        }

        currentBac = Math.Round(currentBac, 4);
        decimal currentBacGramsPerLiter = Math.Round(currentBac * 10m, 3);

        timeline.Add(new BacTimelinePoint(now, currentBac, currentBacGramsPerLiter));

        DateTimeOffset? estimatedSoberAt = null;
        if (currentBac > 0m)
        {
            double hoursToZero = (double)(currentBac / BetaEliminationPerHour);
            estimatedSoberAt = now.AddHours(hoursToZero);
            timeline.Add(new BacTimelinePoint(estimatedSoberAt.Value, 0m, 0m));
        }

        var (safetyLevel, safetyMessage) = EvaluateSafety(currentBac);
        decimal totalGrams = orderedEvents.Sum(x => x.PureAlcoholGrams);

        return new BacCalculationResult(
            CurrentBacGramsPerDl: currentBac,
            CurrentBacGramsPerLiter: currentBacGramsPerLiter,
            SafetyLevel: safetyLevel,
            SafetyMessage: safetyMessage,
            EstimatedSoberAt: estimatedSoberAt,
            TotalAlcoholGramsLast12h: Math.Round(totalGrams, 2),
            Timeline: timeline
        );
    }

    private static (BacSafetyLevel Level, string Message) EvaluateSafety(decimal bacGramsPerDl) =>
        bacGramsPerDl switch
        {
            <= 0.0001m => (BacSafetyLevel.Sober, "Blood alcohol level is zero. You are completely sober."),
            < 0.05m    => (BacSafetyLevel.Safe, "Within the legal driving limit (below 0.50 g/L). Drive carefully or assign a designated driver."),
            < 0.08m    => (BacSafetyLevel.Caution, "Driving limit exceeded (0.50 - 0.80 g/L). Do NOT drive. Drink plenty of water."),
            < 0.15m    => (BacSafetyLevel.Warning, "Significant impairment (0.80 - 1.50 g/L). Stop drinking alcohol immediately and hydrate."),
            _          => (BacSafetyLevel.Critical, "CRITICAL SAFETY ALERT (above 1.50 g/L). Stop alcohol consumption, stay with friends and monitor your condition.")
        };
}