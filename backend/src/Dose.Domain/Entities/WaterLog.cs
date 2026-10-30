using Dose.Domain.Common;

namespace Dose.Domain.Entities;

public class WaterLog : BaseEntity
{
    public Guid UserId { get; private set; }
    public virtual User User { get; private set; } = null!;
    public decimal AmountCl { get; private set; }
    public DateTimeOffset ConsumedAt { get; private set; }

    protected WaterLog() { }

    public WaterLog(Guid userId, decimal amountCl, DateTimeOffset consumedAt)
    {
        UserId = userId;
        AmountCl = Math.Round(amountCl, 2);
        ConsumedAt = consumedAt;
    }

    public void UpdateDetails(decimal amountCl, DateTimeOffset consumedAt)
    {
        if (amountCl <= 0)
            throw new DomainException("Water volume must be greater than zero.");

        AmountCl = Math.Round(amountCl, 2);
        ConsumedAt = consumedAt;
        UpdateTimestamp();
    }
}