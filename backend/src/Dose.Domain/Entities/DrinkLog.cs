using Dose.Domain.Common;
using Dose.Domain.Enums;
using Dose.Domain.ValueObjects;

namespace Dose.Domain.Entities;

public class DrinkLog : BaseEntity
{
    public Guid UserId { get; private set; }
    public virtual User User { get; private set; } = null!;

    public Guid? DrinkId { get; private set; }
    public virtual Drink? Drink { get; private set; }

    public string DrinkNameSnapshot { get; private set; } = null!;
    public bool IsCustomized { get; private set; }
    public DateTimeOffset ConsumedAt { get; private set; }
    
    public decimal TotalVolumeCl { get; private set; }
    public decimal EffectiveAbv { get; private set; }
    public decimal TotalPureAlcoholCl { get; private set; }
    public decimal TotalPureAlcoholGrams { get; private set; }
    public string? Notes { get; private set; }
    public StomachState StomachState { get; private set; } = StomachState.LightSnack;
    public int TotalKcal { get; private set; } = 0;
    
    public virtual ICollection<DrinkLogItem> Items { get; private set; } = new List<DrinkLogItem>();

    protected DrinkLog() { }

    public DrinkLog(
        Guid userId,
        Guid? drinkId,
        string drinkNameSnapshot,
        bool isCustomized,
        DateTimeOffset consumedAt,
        decimal totalVolumeCl,
        decimal effectiveAbv,
        PureAlcohol pureAlcohol,
        string? notes = null,
        StomachState stomachState = StomachState.LightSnack,
        int totalKcal = 0)
    {
        if (string.IsNullOrWhiteSpace(drinkNameSnapshot))
            throw new DomainException("The registered drink name cannot be empty.");

        UserId = userId;
        DrinkId = drinkId;
        DrinkNameSnapshot = drinkNameSnapshot.Trim();
        IsCustomized = isCustomized;
        ConsumedAt = consumedAt;
        TotalVolumeCl = Math.Round(totalVolumeCl, 2);
        EffectiveAbv = Math.Round(effectiveAbv, 2);
        TotalPureAlcoholCl = pureAlcohol.PureAlcoholCl;
        TotalPureAlcoholGrams = pureAlcohol.Grams;
        Notes = notes?.Trim();
        StomachState = stomachState;
        TotalKcal = totalKcal;
    }

    public void UpdateLogDetails(
        string drinkNameSnapshot,
        bool isCustomized,
        DateTimeOffset consumedAt,
        decimal totalVolumeCl,
        decimal effectiveAbv,
        PureAlcohol pureAlcohol,
        string? notes,
        StomachState stomachState = StomachState.LightSnack,
        int totalKcal = 0)
    {
        if (string.IsNullOrWhiteSpace(drinkNameSnapshot))
            throw new DomainException("The registered drink name cannot be empty.");

        DrinkNameSnapshot = drinkNameSnapshot.Trim();
        IsCustomized = isCustomized;
        ConsumedAt = consumedAt;
        TotalVolumeCl = Math.Round(totalVolumeCl, 2);
        EffectiveAbv = Math.Round(effectiveAbv, 2);
        TotalPureAlcoholCl = pureAlcohol.PureAlcoholCl;
        TotalPureAlcoholGrams = pureAlcohol.Grams;
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        StomachState = stomachState;
        TotalKcal = totalKcal;
        UpdateTimestamp();
    }

    public void ClearItems() => Items.Clear();
    public void AddItem(DrinkLogItem item) => Items.Add(item);
}