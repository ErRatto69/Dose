using Dose.Domain.Enums;
using Dose.Domain.ValueObjects;

namespace Dose.Application.Services;

public class DrinkStrengthCalculator : IDrinkStrengthCalculator
{
    public DrinkMetrics CalculateMetrics(IEnumerable<RecipeComponentInput> components)
    {
        // Garnishes do not contribute to liquid volume or ABV dilution
        var liquidItems = components
            .Where(c => c.Category != IngredientCategory.Garnish && c.AmountCl > 0)
            .ToList();

        decimal totalVolumeCl = liquidItems.Sum(c => c.AmountCl);
        if (totalVolumeCl <= 0)
        {
            return DrinkMetrics.Zero;
        }

        decimal weightedAlcoholVolume = liquidItems.Sum(c => c.AmountCl * (c.AbvPercent / 100m));
        decimal finalAbv = Math.Round((weightedAlcoholVolume / totalVolumeCl) * 100m, 2);
        var pureAlcohol = PureAlcohol.FromClAndAbv(totalVolumeCl, finalAbv);

        // ABV normalization (0% -> 0.0, >= 35% -> 1.0)
        decimal normalizedAbv = Math.Clamp(finalAbv / 35.0m, 0m, 1m);

        // Alcohol mass normalization (0g -> 0.0, >= 28g [~2.5 standard drinks] -> 1.0)
        decimal normalizedGrams = Math.Clamp(pureAlcohol.Grams / 28.0m, 0m, 1m);

        // Composite strength score (70% ABV mouth-feel + 30% absolute ethanol load)
        decimal compositeIndex = (normalizedAbv * 0.70m) + (normalizedGrams * 0.30m);

        int scale1To10 = finalAbv == 0m
            ? 1
            : (int)Math.Clamp(Math.Ceiling(compositeIndex * 10m), 1, 10);

        // Visual rating mapped onto a 0.25 - 5.00 range rounded to the nearest quarter bottle
        decimal rawBottles = Math.Clamp(compositeIndex * 5m, 0.25m, 5.0m);
        decimal quarterBottleRating = Math.Round(rawBottles * 4m, MidpointRounding.AwayFromZero) / 4m;

        return new DrinkMetrics(
            totalLiquidVolumeCl: totalVolumeCl,
            finalAbvPercent: finalAbv,
            pureAlcohol: pureAlcohol,
            bottleScore1To10: scale1To10,
            bottleVisualRating: quarterBottleRating
        );
    }
}