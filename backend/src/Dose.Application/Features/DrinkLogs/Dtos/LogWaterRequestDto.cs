namespace Dose.Application.Features.DrinkLogs.Dtos;

public record LogWaterRequestDto(
    decimal? AmountCl = null,
    DateTimeOffset? ConsumedAt = null
);