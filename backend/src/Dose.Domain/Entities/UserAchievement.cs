using Dose.Domain.Common;

namespace Dose.Domain.Entities;

public class UserAchievement : BaseEntity
{
    public Guid UserId { get; private set; }
    public virtual User User { get; private set; } = null!;

    public string AchievementKey { get; private set; } = null!;
    public int? CurrentProgress { get; private set; }
    public int TargetProgress { get; private set; }
    public DateTimeOffset? UnlockedAtUtc { get; private set; }

    public bool IsUnlocked => UnlockedAtUtc.HasValue;

    protected UserAchievement() { }

    public UserAchievement(
        Guid userId,
        string achievementKey,
        int targetProgress,
        int? currentProgress = null,
        DateTimeOffset? unlockedAtUtc = null)
    {
        if (userId == Guid.Empty)
            throw new DomainException("User ID cannot be empty.");

        if (string.IsNullOrWhiteSpace(achievementKey))
            throw new DomainException("Achievement key cannot be empty.");

        if (targetProgress <= 0)
            throw new DomainException("Target progress must be greater than zero.");

        UserId = userId;
        AchievementKey = achievementKey.Trim();
        TargetProgress = targetProgress;
        CurrentProgress = currentProgress.HasValue ? Math.Max(0, currentProgress.Value) : null;
        UnlockedAtUtc = unlockedAtUtc;
    }

    public void UpdateProgress(int currentProgress, DateTimeOffset utcNow)
    {
        int clamped = Math.Max(0, currentProgress);

        if (UnlockedAtUtc.HasValue)
        {
            CurrentProgress = Math.Max(CurrentProgress ?? TargetProgress, Math.Min(clamped, TargetProgress));
            return;
        }

        CurrentProgress = clamped;
        if (clamped >= TargetProgress)
        {
            UnlockedAtUtc = utcNow;
        }

        UpdateTimestamp();
    }

    public void IncrementProgress(int delta, DateTimeOffset utcNow)
    {
        UpdateProgress((CurrentProgress ?? 0) + Math.Max(0, delta), utcNow);
    }
}
