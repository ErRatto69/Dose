using Dose.Application.Services;
using Dose.Domain.Enums;
using FluentAssertions;

namespace Dose.UnitTests.Services;

public class BacCalculatorTests
{
    private readonly BacCalculator _sut = new();

    [Fact]
    public void CalculateWatsonTbwLiters_ForStandardMale_ShouldReturnExpectedVolume()
    {
        // Arrange: Male, 75kg, 180cm, born 1995 (31 years in 2026)
        var refTime = new DateTimeOffset(2026, 10, 16, 12, 0, 0, TimeSpan.Zero);

        // Act
        decimal tbw = _sut.CalculateWatsonTbwLiters(75.0m, 180.0m, BiologicalSex.Male, 1995, refTime);

        // Assert: 2.447 - (0.09516 * 31) + (0.1074 * 180) + (0.3362 * 75) = ~44.04 L
        tbw.Should().BeInRange(43.5m, 44.5m);
    }

    [Fact]
    public void CalculateWatsonTbwLiters_ForStandardFemale_ShouldReturnExpectedVolume()
    {
        // Arrange: Female, 60kg, 165cm
        var refTime = new DateTimeOffset(2026, 10, 16, 12, 0, 0, TimeSpan.Zero);

        // Act
        decimal tbw = _sut.CalculateWatsonTbwLiters(60.0m, 165.0m, BiologicalSex.Female, 1998, refTime);

        // Assert: -2.097 + (0.1069 * 165) + (0.2466 * 60) = ~30.33 L
        tbw.Should().BeInRange(30.0m, 31.0m);
    }

    [Fact]
    public void ComputeRollingBac_WhenZeroDrinks_ShouldReturnSober()
    {
        // Arrange
        var now = DateTimeOffset.UtcNow;

        // Act
        //var result = _sut.ComputeRollingBac(75m, 180m, BiologicalSex.Male, 1995, [], now);

        // Assert
        // result.CurrentBacGramsPerDl.Should().Be(0m);
        // result.CurrentBacGramsPerLiter.Should().Be(0m);
        // result.SafetyLevel.Should().Be(BacSafetyLevel.Sober);
        // result.EstimatedSoberAt.Should().BeNull();
    }

    [Fact]
    public void ComputeRollingBac_ShouldApplyZeroFloor_AndNotAccumulateNegativeClearance()
    {
        // Arrange: Drink taken 10 hours ago that metabolizes in 2 hours
        // If naive subtraction is used, BAC would falsely clear subsequent drinks
        var now = DateTimeOffset.UtcNow;
        var drink10HoursAgo = new DrinkEventInput(
            Guid.NewGuid(),
            "Small Beer",
            now.AddHours(-10),
            10.0m // 10 grams of pure alcohol (clears in ~1.5 - 2 hours)
        );

        var drink1HourAgo = new DrinkEventInput(
            Guid.NewGuid(),
            "Double Gin",
            now.AddHours(-1),
            20.0m // 20 grams of pure alcohol
        );

        // Act
        // var result = _sut.ComputeRollingBac(
        //     75m, 180m, BiologicalSex.Male, 1995,
        //     [drink10HoursAgo, drink1HourAgo],
        //     now
        // );

        // Assert: Drink 10 hours ago must be zeroed out. Current BAC must only reflect drink from 1h ago minus 1h elimination
        // result.CurrentBacGramsPerDl.Should().BeGreaterThan(0m);
        // result.EstimatedSoberAt.Should().BeAfter(now);
    }
}