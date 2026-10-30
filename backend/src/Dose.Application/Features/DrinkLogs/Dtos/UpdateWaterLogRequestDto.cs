namespace Dose.Application.Features.DrinkLogs.Dtos;

public record UpdateWaterLogRequestDto(
    decimal AmountCl,
    DateTimeOffset? ConsumedAt = null
);