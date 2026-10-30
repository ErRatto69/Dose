using Dose.Domain.Enums;

namespace Dose.Application.Services;

public class BacCalculator : IBacCalculator
{
    private const decimal BloodWaterFraction = 0.806m;
    private const decimal BetaEliminationPerHour = 0.015m; // 0.15 g/L per hour
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
        IEnumerable<WaterEventInput> waterLogsLast12Hours,
        DateTimeOffset now)
    {
        decimal tbwLiters = CalculateWatsonTbwLiters(weightKg, heightCm, sex, birthYear, now);

        var orderedEvents = logsLast12Hours
            .Where(e => e.ConsumedAt <= now && e.ConsumedAt >= now.AddHours(-12))
            .OrderBy(e => e.ConsumedAt)
            .ToList();

        var orderedWater = waterLogsLast12Hours
            .Where(w => w.ConsumedAt <= now && w.ConsumedAt >= now.AddHours(-12))
            .ToList();

        decimal EvaluateBacAt(DateTimeOffset targetTime)
        {
            decimal bac = 0m;
            DateTimeOffset? lastTime = null;

            foreach (var ev in orderedEvents.Where(e => e.ConsumedAt <= targetTime))
            {
                if (lastTime.HasValue)
                {
                    decimal elapsedHours = (decimal)(ev.ConsumedAt - lastTime.Value).TotalHours;
                    if (elapsedHours > 0)
                        bac = Math.Max(0m, bac - (BetaEliminationPerHour * elapsedHours));
                }

                decimal stomachFactor = ev.StomachState switch
                {
                    StomachState.Empty => 1.10m,
                    StomachState.FullMeal => 0.78m,
                    _ => 0.95m
                };

                decimal deltaBac = (ev.PureAlcoholGrams * stomachFactor * (BloodWaterFraction / 10m)) / tbwLiters;
                bac += deltaBac;
                lastTime = ev.ConsumedAt;
            }

            if (lastTime.HasValue)
            {
                decimal hoursAfterLast = (decimal)(targetTime - lastTime.Value).TotalHours;
                if (hoursAfterLast > 0)
                    bac = Math.Max(0m, bac - (BetaEliminationPerHour * hoursAfterLast));
            }

            return Math.Round(bac, 4);
        }

        decimal currentBac = EvaluateBacAt(now);
        decimal currentBacGramsPerLiter = Math.Round(currentBac * 10m, 3);

        DateTimeOffset? estimatedSoberAt = null;
        if (currentBac > 0m)
        {
            double hoursToZero = (double)(currentBac / BetaEliminationPerHour);
            estimatedSoberAt = now.AddHours(hoursToZero);
        }

        var timeline = new List<BacTimelinePoint>();

        if (orderedEvents.Count == 0)
        {
            for (int i = 4; i >= 0; i--)
            {
                var t = now.AddMinutes(-i * 30);
                timeline.Add(new BacTimelinePoint(t, 0m, 0m));
            }
        }
        else
        {
            DateTimeOffset startWindow = orderedEvents.First().ConsumedAt.AddMinutes(-15);
            DateTimeOffset endWindow = estimatedSoberAt ?? now.AddMinutes(30);
            double totalSpanMinutes = Math.Max(30, (endWindow - startWindow).TotalMinutes);
            int stepMinutes = totalSpanMinutes <= 180 ? 15 : totalSpanMinutes <= 420 ? 30 : 45;

            var sampleTimes = new List<DateTimeOffset> { startWindow };
            var cursor = startWindow.AddMinutes(stepMinutes);
            while (cursor < endWindow)
            {
                sampleTimes.Add(cursor);
                cursor = cursor.AddMinutes(stepMinutes);
            }

            sampleTimes.Add(now);
            foreach (var ev in orderedEvents) sampleTimes.Add(ev.ConsumedAt);
            if (estimatedSoberAt.HasValue) sampleTimes.Add(estimatedSoberAt.Value);

            var distinctMinutePoints = sampleTimes
                .OrderBy(t => t)
                .GroupBy(t => new DateTimeOffset(t.Year, t.Month, t.Day, t.Hour, t.Minute, 0, t.Offset))
                .Select(g => g.Last())
                .ToList();

            foreach (var pt in distinctMinutePoints)
            {
                decimal bacDl = EvaluateBacAt(pt);
                timeline.Add(new BacTimelinePoint(pt, bacDl, Math.Round(bacDl * 10m, 3)));
            }
        }

        decimal totalGrams = orderedEvents.Sum(x => x.PureAlcoholGrams);
        int totalKcal = orderedEvents.Sum(x => x.TotalKcal);
        decimal totalWaterCl = orderedWater.Sum(x => x.AmountCl);
        int waterLogsCount = orderedWater.Count;

        decimal baseHangover = weightKg > 0 ? (totalGrams / (weightKg * 0.55m)) * 45m : 0m;
        if (orderedEvents.Any(e => e.StomachState == StomachState.Empty)) baseHangover += 15m;
        
        decimal waterRelief = (totalWaterCl / 10m) * 5.0m;
        int hangoverPercent = (int)Math.Clamp(Math.Round(baseHangover - waterRelief), 0m, 100m);

        int responsiblePoints = 100;
        responsiblePoints += (int)Math.Round(totalWaterCl / 25m) * 20;
        responsiblePoints += orderedEvents.Count(e => e.StomachState == StomachState.FullMeal) * 20;
        if (currentBacGramsPerLiter >= 0.80m) responsiblePoints = Math.Max(10, responsiblePoints - 50);
        else if (currentBacGramsPerLiter >= 0.50m) responsiblePoints = Math.Max(30, responsiblePoints - 25);

        var (safetyLevel, safetyMessage) = EvaluateSafety(currentBac);

        return new BacCalculationResult(
            CurrentBacGramsPerDl: currentBac,
            CurrentBacGramsPerLiter: currentBacGramsPerLiter,
            SafetyLevel: safetyLevel,
            SafetyMessage: safetyMessage,
            EstimatedSoberAt: estimatedSoberAt,
            TotalAlcoholGramsLast12h: Math.Round(totalGrams, 2),
            Timeline: timeline,
            HangoverRiskPercent: hangoverPercent,
            ResponsibleDrinkingScore: responsiblePoints,
            TotalKcalLast12h: totalKcal,
            TotalWaterClLast12h: totalWaterCl,
            WaterLogsCountLast12h: waterLogsCount
        );
    }

    private static (BacSafetyLevel Level, string Message) EvaluateSafety(decimal bacGramsPerDl) =>
        bacGramsPerDl switch
        {
            <= 0.0001m => (BacSafetyLevel.Sober, "Blood alcohol level is zero. You are completely sober."),
            < 0.05m    => (BacSafetyLevel.Safe, "Within the legal driving limit (below 0.50 g/L). Drive carefully or assign a designated driver."),
            < 0.08m    => (BacSafetyLevel.Caution, "Driving limit exceeded (0.50 - 0.80 g/L). Do NOT drive. Drink water and hydrate."),
            < 0.15m    => (BacSafetyLevel.Warning, "Significant impairment (0.80 - 1.50 g/L). Stop drinking alcohol immediately and hydrate."),
            _          => (BacSafetyLevel.Critical, "CRITICAL SAFETY ALERT (above 1.50 g/L). Stop alcohol consumption, stay with friends and monitor your condition.")
        };
}