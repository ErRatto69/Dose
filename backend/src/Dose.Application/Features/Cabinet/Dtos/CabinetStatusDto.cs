using Dose.Application.Features.Ingredients.Dtos;

namespace Dose.Application.Features.Cabinet.Dtos;

public record CabinetStatusDto(
    Guid UserId,
    IReadOnlyList<IngredientDto> Ingredients
);