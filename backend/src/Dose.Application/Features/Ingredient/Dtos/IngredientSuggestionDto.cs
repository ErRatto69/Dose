using Dose.Domain.Enums;

namespace Dose.Application.Features.Ingredients.Dtos;

public record IngredientSuggestionDto(
    Guid Id,
    string Name,
    IngredientCategory Category,
    decimal Abv,
    bool IsAvailableInBar
);