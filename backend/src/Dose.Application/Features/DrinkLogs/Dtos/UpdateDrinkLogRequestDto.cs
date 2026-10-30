using Dose.Domain.Enums;

namespace Dose.Application.Features.DrinkLogs.Dtos;

public record UpdateDrinkLogRequestDto(
    string? CustomName,
    DateTimeOffset? ConsumedAt,
    string? Notes,
    IReadOnlyList<CustomIngredientDoseDto>? Components = null,
    StomachState? StomachState = null
);