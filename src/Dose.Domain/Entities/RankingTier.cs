using Dose.Domain.Common;

namespace Dose.Domain.Entities;

public class RankingTier : BaseEntity
{
    public string Name { get; private set; } = null!;
    public short TierOrder { get; private set; }
    public decimal MinPureAlcoholGrams { get; private set; }
    public decimal MinPureAlcoholCl { get; private set; }
    public string BadgeIcon { get; private set; } = null!;
    public string ColorHex { get; private set; } = "#10B981";

    protected RankingTier() { }

    public RankingTier(
        string name,
        short tierOrder,
        decimal minPureAlcoholGrams,
        decimal minPureAlcoholCl,
        string badgeIcon,
        string colorHex)
    {
        UpdateDetails(name, tierOrder, minPureAlcoholGrams, minPureAlcoholCl, badgeIcon, colorHex);
    }

    public void UpdateDetails(
        string name,
        short tierOrder,
        decimal minPureAlcoholGrams,
        decimal minPureAlcoholCl,
        string badgeIcon,
        string colorHex)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("The tier name cannot be empty.");
        if (minPureAlcoholGrams < 0 || minPureAlcoholCl < 0)
            throw new DomainException("Minimum thresholds for pure alcohol cannot be negative.");
        if (string.IsNullOrWhiteSpace(badgeIcon))
            throw new DomainException("The badge icon is mandatory.");

        Name = name.Trim();
        TierOrder = tierOrder;
        MinPureAlcoholGrams = Math.Round(minPureAlcoholGrams, 2);
        MinPureAlcoholCl = Math.Round(minPureAlcoholCl, 2);
        BadgeIcon = badgeIcon.Trim();
        ColorHex = string.IsNullOrWhiteSpace(colorHex) ? "#10B981" : colorHex.Trim();
        UpdateTimestamp();
    }
}