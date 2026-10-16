using Dose.Domain.Common;

namespace Dose.Domain.Entities;

public class Review : BaseEntity
{
    public Guid DrinkId { get; private set; }
    public virtual Drink Drink { get; private set; } = null!;

    public Guid UserId { get; private set; }
    public virtual User User { get; private set; } = null!;

    public short Rating { get; private set; }
    public string? Comment { get; private set; }

    protected Review() { }

    public Review(Guid drinkId, Guid userId, short rating, string? comment = null)
    {
        DrinkId = drinkId;
        UserId = userId;
        SetRating(rating, comment);
    }

    public void SetRating(short rating, string? comment)
    {
        if (rating is < 1 or > 5)
            throw new DomainException("The rating must be between 1 and 5 stars.");

        Rating = rating;
        Comment = comment?.Trim();
        UpdateTimestamp();
    }
}