using Dose.Domain.Enums;
using Dose.Domain.ValueObjects;

namespace Dose.Application.Services;

public class DrinkStrengthCalculator : IDrinkStrengthCalculator
{
    public DrinkMetrics CalculateMetrics(IEnumerable<RecipeComponentInput> components)
    {
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

        // Calorie calculation: Pure ethanol (7.1 kcal/g) + estimated residual carbs/sugars by category
        decimal ethanolKcal = pureAlcohol.Grams * 7.1m;
        decimal sugarCarbsKcal = 0m;

        foreach (var item in liquidItems)
        {
            string name = (item.IngredientName ?? string.Empty).ToLowerInvariant();
            bool isZeroCal = name.Contains("zero") || name.Contains("diet") || name.Contains("soda") || name.Contains("water") || name.Contains("seltz");

            sugarCarbsKcal += item.Category switch
            {
                IngredientCategory.Syrup => item.AmountCl * 26.0m,
                IngredientCategory.Liqueur => item.AmountCl * 12.0m,
                IngredientCategory.Mixer when !isZeroCal => item.AmountCl * 4.2m,
                IngredientCategory.Wine => item.AmountCl * 2.5m,
                IngredientCategory.Beer => item.AmountCl * 1.8m,
                _ => 0m
            };
        }

        int totalKcal = (int)Math.Round(ethanolKcal + sugarCarbsKcal);

        decimal normalizedAbv = Math.Clamp(finalAbv / 35.0m, 0m, 1m);
        decimal normalizedGrams = Math.Clamp(pureAlcohol.Grams / 28.0m, 0m, 1m);
        decimal compositeIndex = (normalizedAbv * 0.70m) + (normalizedGrams * 0.30m);

        int scale1To10 = finalAbv == 0m ? 1 : (int)Math.Clamp(Math.Ceiling(compositeIndex * 10m), 1, 10);
        decimal rawBottles = Math.Clamp(compositeIndex * 5m, 0.25m, 5.0m);
        decimal quarterBottleRating = Math.Round(rawBottles * 4m, MidpointRounding.AwayFromZero) / 4m;

        return new DrinkMetrics(
            totalLiquidVolumeCl: totalVolumeCl,
            finalAbvPercent: finalAbv,
            pureAlcohol: pureAlcohol,
            bottleScore1To10: scale1To10,
            bottleVisualRating: quarterBottleRating,
            estimatedKcal: totalKcal
        );
    }
}