using Dose.Domain.Common;

namespace Dose.Domain.Entities;

public class DrinkIngredient
{
    public Guid DrinkId { get; private set; }
    public virtual Drink Drink { get; private set; } = null!;

    public Guid IngredientId { get; private set; }
    public virtual Ingredient Ingredient { get; internal set; } = null!;

    public decimal AmountCl { get; private set; }
    public string? DisplayUnitNote { get; private set; }
    public bool IsOptional { get; private set; }
    public short SortOrder { get; private set; }

    protected DrinkIngredient() { }

    public DrinkIngredient(
        Guid drinkId,
        Guid ingredientId,
        decimal amountCl,
        string? displayUnitNote = null,
        bool isOptional = false,
        short sortOrder = 0)
    {
        if (amountCl < 0)
            throw new DomainException("Liquid dose cannot be negative.");

        DrinkId = drinkId;
        IngredientId = ingredientId;
        AmountCl = Math.Round(amountCl, 2);
        DisplayUnitNote = displayUnitNote?.Trim();
        IsOptional = isOptional;
        SortOrder = sortOrder;
    }

    public DrinkIngredient(
        Guid drinkId,
        Ingredient ingredient,
        decimal amountCl,
        string? displayUnitNote = null,
        bool isOptional = false,
        short sortOrder = 0)
        : this(drinkId, ingredient.Id, amountCl, displayUnitNote, isOptional, sortOrder)
    {
        Ingredient = ingredient;
    }

    public void UpdateDose(decimal amountCl, string? displayUnitNote, bool isOptional, short sortOrder)
    {
        if (amountCl < 0)
            throw new DomainException("Liquid dose cannot be negative.");

        AmountCl = Math.Round(amountCl, 2);
        DisplayUnitNote = displayUnitNote?.Trim();
        IsOptional = isOptional;
        SortOrder = sortOrder;
    }
}