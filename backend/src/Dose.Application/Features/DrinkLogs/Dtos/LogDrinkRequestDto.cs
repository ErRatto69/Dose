using Dose.Domain.Enums;

namespace Dose.Application.Features.DrinkLogs.Dtos;

public record LogDrinkRequestDto(
    DateTimeOffset? ConsumedAt,
    string? Notes,
    IReadOnlyList<CustomIngredientDoseDto>? CustomComponents,
    StomachState? StomachState = null
);