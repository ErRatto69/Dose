namespace Dose.Application.Features.DrinkLogs.Dtos;

public record LogCustomDrinkRequestDto(
    string? CustomName,
    DateTimeOffset? ConsumedAt,
    string? Notes,
    IReadOnlyList<CustomIngredientDoseDto> Components
);