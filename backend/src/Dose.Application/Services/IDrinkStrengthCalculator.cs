using Dose.Domain.Enums;
using Dose.Domain.ValueObjects;

namespace Dose.Application.Services;

public record RecipeComponentInput(
    IngredientCategory Category,
    decimal AmountCl,
    decimal AbvPercent
);

public interface IDrinkStrengthCalculator
{
    DrinkMetrics CalculateMetrics(IEnumerable<RecipeComponentInput> components);
}