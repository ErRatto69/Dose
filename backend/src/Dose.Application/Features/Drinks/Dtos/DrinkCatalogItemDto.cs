namespace Dose.Application.Features.Drinks.Dtos;

public record DrinkCatalogItemDto(
    Guid Id,
    string Name,
    string Description,
    string? GlassType,
    string? ImageUrl,
    decimal TotalVolumeCl,
    decimal AbvPercent,
    int BottleScore1To10,
    double AverageRating,
    int ReviewCount,
    bool IsPublished,
    Guid? CreatedByUserId = null,
    bool IsLockedByCreator = false,
    bool CanEdit = false,
    bool CanDelete = false,
    int EstimatedKcal = 0
);