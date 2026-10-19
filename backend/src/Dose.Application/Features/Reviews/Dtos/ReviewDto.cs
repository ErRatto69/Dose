namespace Dose.Application.Features.Reviews.Dtos;

public record ReviewDto(
    Guid Id,
    Guid DrinkId,
    string DrinkName,
    Guid UserId,
    string Username,
    short Rating,
    string? Comment,
    DateTimeOffset CreatedAt
);