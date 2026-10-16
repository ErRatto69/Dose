namespace Dose.Application.Features.DrinkLogs.Dtos;

public record CustomIngredientDoseDto(
    Guid IngredientId,
    decimal AmountCl
);