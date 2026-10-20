namespace Dose.Application.Features.Admin.Dtos;

public record CocktailDbSyncStatusDto(
    bool IsRunning,
    string CurrentLetter,
    int ProcessedDrinks,
    int NewDrinksAdded,
    int ExistingDrinksUpdated,
    int ImagesDownloaded,
    int FailedImages,
    string? LastError,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt
);