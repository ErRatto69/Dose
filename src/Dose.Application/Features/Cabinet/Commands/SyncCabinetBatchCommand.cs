namespace Dose.Application.Features.Cabinet.Commands;

public record SyncCabinetBatchCommand(
    IReadOnlyList<Guid> IngredientIds
);