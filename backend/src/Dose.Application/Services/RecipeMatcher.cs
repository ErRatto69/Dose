using Dose.Domain.Entities;
using Dose.Domain.Enums;

namespace Dose.Application.Services;

public class RecipeMatcher : IRecipeMatcher
{
    public IReadOnlyList<DrinkMatchResultDto> MatchDrinks(
        IEnumerable<Drink> drinks,
        IReadOnlyCollection<Ingredient> availableIngredients,
        int maxMissingAllowed = 2)
    {
        var results = new List<DrinkMatchResultDto>();

        if (availableIngredients.Count == 0)
            return results;

        foreach (var drink in drinks)
        {
            var essentialRecipeItems = drink.DrinkIngredients
                .Where(di => di.Ingredient.Category != IngredientCategory.Garnish && !di.IsOptional)
                .ToList();

            if (essentialRecipeItems.Count == 0) continue;

            var missingEssential = essentialRecipeItems
                .Where(di => !availableIngredients.Any(userIng => userIng.MatchesRequirement(di.Ingredient)))
                .Select(di => new MissingIngredientDto(
                    di.IngredientId,
                    FormatRequirementName(di.Ingredient),
                    di.Ingredient.Category.ToString(),
                    string.IsNullOrWhiteSpace(di.Ingredient.SubCategory) ? di.Ingredient.Name : di.Ingredient.SubCategory,
                    di.Ingredient.Flavor))
                .ToList();

            int matchedCount = essentialRecipeItems.Count - missingEssential.Count;

            // Never suggest a drink if the user has 0 matching ingredients for it!
            if (matchedCount <= 0 || missingEssential.Count > maxMissingAllowed)
                continue;

            var missingGarnishes = drink.DrinkIngredients
                .Where(di => (di.Ingredient.Category == IngredientCategory.Garnish || di.IsOptional)
                             && !availableIngredients.Any(userIng => userIng.MatchesRequirement(di.Ingredient)))
                .Select(di => di.Ingredient.Name)
                .ToList();

            int matchPercentage = (int)Math.Round((double)matchedCount / essentialRecipeItems.Count * 100.0);

            string matchType = missingEssential.Count switch
            {
                0 => "EXACT",
                1 => "MISSING_ONE",
                _ => "MISSING_TWO"
            };

            string badgeText = missingEssential.Count switch
            {
                0 => "Ready to mix (100%)",
                1 => $"Missing 1: {missingEssential[0].Name}",
                _ => $"Missing {missingEssential.Count}: {string.Join(", ", missingEssential.Select(m => m.Name))}"
            };

            results.Add(new DrinkMatchResultDto(
                DrinkId: drink.Id,
                Name: drink.Name,
                ImageUrl: drink.ImageUrl,
                CachedAbv: drink.CachedAbv,
                BottleScore1To10: drink.CachedBottleScore,
                MatchType: matchType,
                MatchPercentage: matchPercentage,
                MissingIngredients: missingEssential,
                OptionalMissingGarnishes: missingGarnishes,
                MatchSummaryBadge: badgeText
            ));
        }

        return results
            .OrderBy(r => r.MissingIngredients.Count)
            .ThenByDescending(r => r.MatchPercentage)
            .ThenBy(r => r.Name)
            .ToList();
    }

    private static string FormatRequirementName(Ingredient ing)
    {
        string baseType = !string.IsNullOrWhiteSpace(ing.SubCategory) &&
                          !ing.SubCategory.Equals("Generic", StringComparison.OrdinalIgnoreCase) &&
                          !ing.SubCategory.Equals("Spirit", StringComparison.OrdinalIgnoreCase) &&
                          !ing.SubCategory.Equals("Mixer", StringComparison.OrdinalIgnoreCase)
            ? ing.SubCategory
            : ing.Name;

        if (!string.IsNullOrWhiteSpace(ing.Flavor) &&
            !baseType.Contains(ing.Flavor, StringComparison.OrdinalIgnoreCase))
        {
            return $"{baseType} ({ing.Flavor})";
        }

        return baseType;
    }
}