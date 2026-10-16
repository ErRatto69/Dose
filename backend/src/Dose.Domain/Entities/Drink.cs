using Dose.Domain.Common;
using Dose.Domain.ValueObjects;

namespace Dose.Domain.Entities;

public class Drink : BaseEntity
{
    public string Name { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public string PreparationStepsJson { get; private set; } = "[]";
    public string? GlassType { get; private set; }
    public string? ImageUrl { get; private set; }
    public bool IsPublished { get; private set; } = true;

    // Metriche calcolate e cachate sul database per evitare ri-calcoli continui
    public decimal CachedTotalVolumeCl { get; private set; }
    public decimal CachedAbv { get; private set; }
    public decimal CachedPureAlcoholGrams { get; private set; }
    public int CachedBottleScore { get; private set; } = 1;

    public Guid? CreatedByUserId { get; private set; }
    public virtual User? CreatedByUser { get; private set; }

    // Navigation properties
    public virtual ICollection<DrinkIngredient> DrinkIngredients { get; private set; } = new List<DrinkIngredient>();
    public virtual ICollection<Review> Reviews { get; private set; } = new List<Review>();
    public virtual ICollection<DrinkLog> DrinkLogs { get; private set; } = new List<DrinkLog>();

    protected Drink() { }

    public Drink(
        string name,
        string description,
        string preparationStepsJson,
        string? glassType = null,
        string? imageUrl = null,
        Guid? createdByUserId = null)
    {
        UpdateDetails(name, description, preparationStepsJson, glassType, imageUrl);
        CreatedByUserId = createdByUserId;
    }

    public void UpdateDetails(
        string name,
        string description,
        string preparationStepsJson,
        string? glassType,
        string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("The name of the drink cannot be null or empty.");
        if (string.IsNullOrWhiteSpace(description))
            throw new DomainException("The drink description cannot be null or empty.");

        Name = name.Trim();
        Description = description.Trim();
        PreparationStepsJson = string.IsNullOrWhiteSpace(preparationStepsJson) ? "[]" : preparationStepsJson.Trim();
        GlassType = glassType?.Trim();
        ImageUrl = imageUrl?.Trim();
        UpdateTimestamp();
    }

    public void UpdateCachedMetrics(DrinkMetrics metrics)
    {
        CachedTotalVolumeCl = metrics.TotalLiquidVolumeCl;
        CachedAbv = metrics.FinalAbvPercent;
        CachedPureAlcoholGrams = metrics.PureAlcohol.Grams;
        CachedBottleScore = metrics.BottleScore1To10;
        UpdateTimestamp();
    }

    public void SetPublished(bool isPublished)
    {
        IsPublished = isPublished;
        UpdateTimestamp();
    }
}