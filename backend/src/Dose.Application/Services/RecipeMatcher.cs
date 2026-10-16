using Dose.Domain.Entities;
using Dose.Domain.Enums;

namespace Dose.Application.Services;

public class RecipeMatcher : IRecipeMatcher
{
    public IReadOnlyList<DrinkMatchResultDto> MatchDrinks(
        IEnumerable<Drink> drinks,
        ISet<Guid> availableIngredientIds,
        int maxMissingAllowed = 2)
    {
        var results = new List<DrinkMatchResultDto>();

        foreach (var drink in drinks)
        {
            // Essential ingredients: excluding garnishes and optional additions
            var essentialRecipeItems = drink.DrinkIngredients
                .Where(di => di.Ingredient.Category != IngredientCategory.Garnish && !di.IsOptional)
                .ToList();

            if (essentialRecipeItems.Count == 0) continue;

            var missingEssential = essentialRecipeItems
                .Where(di => !availableIngredientIds.Contains(di.IngredientId))
                .Select(di => new MissingIngredientDto(
                    di.IngredientId,
                    di.Ingredient.Name,
                    di.Ingredient.Category.ToString()))
                .ToList();

            if (missingEssential.Count > maxMissingAllowed)
                continue;

            var missingGarnishes = drink.DrinkIngredients
                .Where(di => (di.Ingredient.Category == IngredientCategory.Garnish || di.IsOptional)
                             && !availableIngredientIds.Contains(di.IngredientId))
                .Select(di => di.Ingredient.Name)
                .ToList();

            int matchedCount = essentialRecipeItems.Count - missingEssential.Count;
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
                1 => $"Missing only: {missingEssential[0].Name}",
                _ => $"Missing 2 items: {string.Join(", ", missingEssential.Select(m => m.Name))}"
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
}