using Dose.Domain.Common;
using Dose.Domain.Enums;

namespace Dose.Domain.Entities;

public class DrinkLogItem
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public Guid DrinkLogId { get; set; }
    public virtual DrinkLog DrinkLog { get; private set; } = null!;

    public Guid? IngredientId { get; private set; }
    public string IngredientNameSnapshot { get; private set; } = null!;
    public IngredientCategory CategorySnapshot { get; private set; }
    public decimal AbvSnapshot { get; private set; }
    public decimal AmountCl { get; private set; }
    public decimal PureAlcoholGrams { get; private set; }

    protected DrinkLogItem() { }

    // Costruttore originale (necessario per POST /{id}/log e POST /custom/log)
    public DrinkLogItem(
        Guid? ingredientId,
        string ingredientNameSnapshot,
        IngredientCategory categorySnapshot,
        decimal abvSnapshot,
        decimal amountCl,
        decimal pureAlcoholGrams)
    {
        if (string.IsNullOrWhiteSpace(ingredientNameSnapshot))
            throw new DomainException("The name of the registered ingredient cannot be empty.");

        IngredientId = ingredientId;
        IngredientNameSnapshot = ingredientNameSnapshot.Trim();
        CategorySnapshot = categorySnapshot;
        AbvSnapshot = Math.Round(abvSnapshot, 2);
        AmountCl = Math.Round(amountCl, 2);
        PureAlcoholGrams = Math.Round(pureAlcoholGrams, 2);
    }

    // Costruttore con DrinkLogId
    public DrinkLogItem(
        Guid drinkLogId,
        Guid? ingredientId,
        string ingredientNameSnapshot,
        IngredientCategory categorySnapshot,
        decimal abvSnapshot,
        decimal amountCl,
        decimal pureAlcoholGrams)
        : this(ingredientId, ingredientNameSnapshot, categorySnapshot, abvSnapshot, amountCl, pureAlcoholGrams)
    {
        DrinkLogId = drinkLogId;
    }
}