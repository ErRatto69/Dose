using Dose.Domain.Common;

namespace Dose.Domain.ValueObjects;

public sealed record DrinkMetrics
{
    public decimal TotalLiquidVolumeCl { get; }
    public decimal FinalAbvPercent { get; }
    public PureAlcohol PureAlcohol { get; }
    public int BottleScore1To10 { get; }
    public decimal BottleVisualRating { get; }
    public int EstimatedKcal { get; }

    public DrinkMetrics(
        decimal totalLiquidVolumeCl,
        decimal finalAbvPercent,
        PureAlcohol pureAlcohol,
        int bottleScore1To10,
        decimal bottleVisualRating,
        int estimatedKcal = 0)
    {
        if (totalLiquidVolumeCl < 0)
            throw new DomainException("The total volume of the liquid cannot be negative.");
        if (finalAbvPercent is < 0 or > 96)
            throw new DomainException("The alcohol content must be between 0 and 96%.");
        if (bottleScore1To10 is < 1 or > 10)
            throw new DomainException("The score for the bottles must be between 1 and 10.");

        TotalLiquidVolumeCl = Math.Round(totalLiquidVolumeCl, 2);
        FinalAbvPercent = Math.Round(finalAbvPercent, 2);
        PureAlcohol = pureAlcohol;
        BottleScore1To10 = bottleScore1To10;
        BottleVisualRating = Math.Round(bottleVisualRating, 2);
        EstimatedKcal = Math.Max(0, estimatedKcal);
    }

    public static DrinkMetrics Zero => new(0m, 0m, PureAlcohol.Zero, 1, 0.5m, 0);
}