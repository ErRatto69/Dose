using Dose.Domain.Enums;
using Dose.Domain.ValueObjects;

namespace Dose.Application.Services;

public record RecipeComponentInput(
    IngredientCategory Category,
    decimal AmountCl,
    decimal AbvPercent,
    string? IngredientName = null
);

public interface IDrinkStrengthCalculator
{
    DrinkMetrics CalculateMetrics(IEnumerable<RecipeComponentInput> components);
}