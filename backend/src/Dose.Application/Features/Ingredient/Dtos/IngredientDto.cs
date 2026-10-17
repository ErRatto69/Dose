using Dose.Domain.Enums;

namespace Dose.Application.Features.Ingredients.Dtos;

public record IngredientDto(
    Guid Id,
    string Name,
    IngredientCategory Category,
    string SubCategory,
    string? Flavor,
    decimal Abv,
    bool IsAvailableInBar,
    string? Description,
    string? ImageUrl
);