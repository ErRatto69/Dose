using Dose.Domain.Enums;

namespace Dose.Application.Features.DrinkLogs.Dtos;

public record LogCustomDrinkRequestDto(
    string? CustomName,
    DateTimeOffset? ConsumedAt,
    string? Notes,
    IReadOnlyList<CustomIngredientDoseDto> Components,
    StomachState? StomachState = null
);