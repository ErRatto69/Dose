using Dose.Domain.Common;
using Dose.Domain.Enums;

namespace Dose.Domain.Entities;

public class Ingredient : BaseEntity
{
    public string Name { get; private set; } = null!;
    public IngredientCategory Category { get; private set; }
    public decimal Abv { get; private set; }
    public bool IsAvailableInBar { get; private set; } = true;
    public string? Description { get; private set; }
    public string? ImageUrl { get; private set; }

    // Navigation properties
    public virtual ICollection<DrinkIngredient> DrinkIngredients { get; private set; } = new List<DrinkIngredient>();
    public virtual ICollection<CabinetItem> CabinetUsers { get; private set; } = new List<CabinetItem>();

    protected Ingredient() { }

    public Ingredient(
        string name,
        IngredientCategory category,
        decimal abv,
        bool isAvailableInBar = true,
        string? description = null,
        string? imageUrl = null)
    {
        SetNameAndCategory(name, category, abv);
        IsAvailableInBar = isAvailableInBar;
        Description = description;
        ImageUrl = imageUrl;
    }

    public void SetNameAndCategory(string name, IngredientCategory category, decimal abv)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("The name cannot be empty.");

        if (abv is < 0 or > 96)
            throw new DomainException("The ABV must be between 0 and 96.");

        if (category == IngredientCategory.Spirit && abv <= 0)
            throw new DomainException("Alcoholic beverages must have an ABV greater than 0%.");

        if (category is IngredientCategory.Mixer or IngredientCategory.Garnish && abv > 0)
            throw new DomainException("Mixers and garnishes must have an ABV of 0%.");

        Name = name.Trim();
        Category = category;
        Abv = Math.Round(abv, 2);
        UpdateTimestamp();
    }

    public void SetBarAvailability(bool isAvailable)
    {
        IsAvailableInBar = isAvailable;
        UpdateTimestamp();
    }

    public void UpdateInfo(string? description, string? imageUrl)
    {
        Description = description;
        ImageUrl = imageUrl;
        UpdateTimestamp();
    }
}