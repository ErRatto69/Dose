namespace Dose.Domain.Entities;

public class CabinetItem
{
    public Guid UserId { get; private set; }
    public virtual User User { get; private set; } = null!;

    public Guid IngredientId { get; private set; }
    public virtual Ingredient Ingredient { get; private set; } = null!;

    public DateTimeOffset AddedAt { get; private set; } = DateTimeOffset.UtcNow;

    protected CabinetItem() { }

    public CabinetItem(Guid userId, Guid ingredientId)
    {
        UserId = userId;
        IngredientId = ingredientId;
        AddedAt = DateTimeOffset.UtcNow;
    }
}