using Dose.Domain.Common;
using Dose.Domain.Enums;

namespace Dose.Domain.Entities;

public class Ingredient : BaseEntity
{
    public string Name { get; private set; } = null!;
    public IngredientCategory Category { get; private set; }
    public string SubCategory { get; private set; } = null!;
    public string? Flavor { get; private set; }
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
        string subCategory,
        decimal abv,
        string? flavor = null,
        bool isAvailableInBar = true,
        string? description = null,
        string? imageUrl = null)
    {
        SetDetails(name, category, subCategory, abv, flavor);
        IsAvailableInBar = isAvailableInBar;
        Description = description;
        ImageUrl = imageUrl;
    }

    public void SetDetails(
        string name,
        IngredientCategory category,
        string subCategory,
        decimal abv,
        string? flavor = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("The name cannot be empty.");

        if (string.IsNullOrWhiteSpace(subCategory))
            throw new DomainException("The sub-category (type) cannot be empty.");

        if (abv is < 0 or > 96)
            throw new DomainException("The ABV must be between 0 and 96.");

        bool isAlcoholicCategory = category is IngredientCategory.Spirit
            or IngredientCategory.Liqueur
            or IngredientCategory.Wine
            or IngredientCategory.Beer;

        if (isAlcoholicCategory && abv <= 0)
            throw new DomainException("Alcoholic beverages must have an ABV greater than 0%.");

        if (category is IngredientCategory.Mixer or IngredientCategory.Syrup or IngredientCategory.Garnish && abv > 0)
            throw new DomainException("Mixers, syrups, and garnishes must have an ABV of 0%.");

        Name = name.Trim();
        Category = category;
        SubCategory = subCategory.Trim();
        Flavor = string.IsNullOrWhiteSpace(flavor) ? null : flavor.Trim();
        Abv = Math.Round(abv, 2);
        UpdateTimestamp();
    }
    
    public bool MatchesRequirement(Ingredient requiredIngredient)
    {
        if (Id == requiredIngredient.Id)
            return true;

        bool sameSubCategory = string.Equals(
            SubCategory,
            requiredIngredient.SubCategory,
            StringComparison.OrdinalIgnoreCase);

        bool sameFlavor = string.Equals(
            Flavor ?? string.Empty,
            requiredIngredient.Flavor ?? string.Empty,
            StringComparison.OrdinalIgnoreCase);

        return sameSubCategory && sameFlavor;
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