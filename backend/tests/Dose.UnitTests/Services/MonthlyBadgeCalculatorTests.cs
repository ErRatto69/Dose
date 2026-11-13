using Dose.Application.Services;
using Dose.Domain.Entities;
using Dose.Domain.Enums;
using FluentAssertions;

namespace Dose.UnitTests.Services;

public class MonthlyBadgeCalculatorTests
{
    private readonly MonthlyBadgeCalculator _sut = new(new BacCalculator());

    private static readonly MonthlyBadgeUserContext StandardMale = new(
        WeightKg: 75m,
        HeightCm: 180m,
        Sex: BiologicalSex.Male,
        BirthYear: 1995
    );

    [Fact]
    public void ComputeMonthlyBadges_ShouldAwardSpiritMasterAndExcludeGingerFromGin()
    {
        var baseTime = new DateTimeOffset(2026, 11, 2, 20, 0, 0, TimeSpan.Zero);
        var log1 = Guid.NewGuid();
        var log2 = Guid.NewGuid();
        var log3 = Guid.NewGuid();
        var log4 = Guid.NewGuid();

        var logs = new List<MonthlyDrinkLogInput>
        {
            new(log1, "Moscow Mule", baseTime, 14m, StomachState.LightSnack, 180),
            new(log2, "Moscow Mule", baseTime.AddDays(1), 14m, StomachState.LightSnack, 180),
            new(log3, "Vodka Tonic", baseTime.AddDays(2), 14m, StomachState.LightSnack, 160),
            new(log4, "Gin & Tonic", baseTime.AddDays(3), 14m, StomachState.LightSnack, 160)
        };

        var items = new List<MonthlyDrinkLogItemInput>
        {
            new(log1, "Absolut Vodka", 4m),
            new(log1, "Ginger Beer", 12m),
            new(log2, "Absolut Vodka", 4m),
            new(log2, "Ginger Beer", 12m),
            new(log3, "Grey Goose Vodka", 4m),
            new(log4, "Tanqueray London Dry Gin", 4m),
            new(log4, "Ginger Beer", 12m)
        };

        var badges = _sut.ComputeMonthlyBadges(StandardMale, logs, items, monthWaterLogsCount: 10);

        badges.Single(b => b.Key == "VodkaMaster").IsEarned.Should().BeTrue();
        badges.Single(b => b.Key == "GinMaster").IsEarned.Should().BeFalse();
        badges.Single(b => b.Key == "GinMaster").CurrentProgress.Should().Be(1);
        badges.Single(b => b.Key == "HydrationHero").IsEarned.Should().BeTrue();
        badges.Single(b => b.Key == "SafeConnoisseur").IsEarned.Should().BeTrue();
        badges.Single(b => b.Key == "CalorieBurner").IsEarned.Should().BeFalse();
    }

    [Fact]
    public void ComputeMonthlyBadges_WhenCriticalBacBreachOccurs_ShouldNotAwardSafeConnoisseur()
    {
        var baseTime = new DateTimeOffset(2026, 11, 5, 22, 0, 0, TimeSpan.Zero);
        var logId = Guid.NewGuid();

        // 120g pure ethanol in a single empty-stomach session exceeds 1.50 g/L Critical BAC threshold
        var logs = new List<MonthlyDrinkLogInput>
        {
            new(logId, "Extreme Long Island", baseTime, 120m, StomachState.Empty, 1600)
        };

        var badges = _sut.ComputeMonthlyBadges(StandardMale, logs, [], monthWaterLogsCount: 2);

        badges.Single(b => b.Key == "SafeConnoisseur").IsEarned.Should().BeFalse();
        badges.Single(b => b.Key == "CalorieBurner").IsEarned.Should().BeTrue();
        badges.Single(b => b.Key == "HydrationHero").IsEarned.Should().BeFalse();
    }

    [Fact]
    public void UserAchievement_OnceUnlocked_ShouldRemainDurablyUnlocked()
    {
        var userId = Guid.NewGuid();
        var unlockTime = new DateTimeOffset(2026, 11, 10, 12, 0, 0, TimeSpan.Zero);
        var laterTime = unlockTime.AddDays(1);

        var achievement = new UserAchievement(userId, AchievementDefinitions.MasterAlchemistKey, targetProgress: 5, currentProgress: 4);
        achievement.IsUnlocked.Should().BeFalse();

        achievement.IncrementProgress(1, unlockTime);
        achievement.IsUnlocked.Should().BeTrue();
        achievement.UnlockedAtUtc.Should().Be(unlockTime);
        achievement.CurrentProgress.Should().Be(5);

        // Attempt to update with lower value should never revoke or overwrite original unlock timestamp
        achievement.UpdateProgress(2, laterTime);
        achievement.IsUnlocked.Should().BeTrue();
        achievement.UnlockedAtUtc.Should().Be(unlockTime);
        achievement.CurrentProgress.Should().Be(5);
    }
}
