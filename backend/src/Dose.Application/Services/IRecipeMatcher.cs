using Dose.Domain.Entities;

namespace Dose.Application.Services;

public record MissingIngredientDto(Guid Id, string Name, string Category);

public record DrinkMatchResultDto(
    Guid DrinkId,
    string Name,
    string? ImageUrl,
    decimal CachedAbv,
    int BottleScore1To10,
    string MatchType, // "EXACT", "MISSING_ONE", "MISSING_TWO"
    int MatchPercentage,
    IReadOnlyList<MissingIngredientDto> MissingIngredients,
    IReadOnlyList<string> OptionalMissingGarnishes,
    string MatchSummaryBadge
);

public interface IRecipeMatcher
{
    IReadOnlyList<DrinkMatchResultDto> MatchDrinks(
        IEnumerable<Drink> drinks,
        ISet<Guid> availableIngredientIds,
        int maxMissingAllowed = 2);
}