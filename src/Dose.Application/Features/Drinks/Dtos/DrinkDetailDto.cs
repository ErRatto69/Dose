namespace Dose.Application.Features.Drinks.Dtos;

public record DrinkIngredientDetailDto(
    Guid IngredientId,
    string Name,
    string Category,
    decimal Abv,
    decimal AmountCl,
    decimal AmountOz,
    string? DisplayUnitNote,
    bool IsOptional,
    short SortOrder
);

public record DrinkMetricsDto(
    decimal TotalVolumeCl,
    decimal TotalVolumeOz,
    decimal AbvPercent,
    decimal PureAlcoholGrams,
    int BottleScore1To10,
    decimal BottleVisualRating
);

public record DrinkDetailDto(
    Guid Id,
    string Name,
    string Description,
    string? GlassType,
    string? ImageUrl,
    IReadOnlyList<string> PreparationSteps,
    DrinkMetricsDto Metrics,
    double AverageRating,
    int ReviewCount,
    IReadOnlyList<DrinkIngredientDetailDto> Ingredients
);