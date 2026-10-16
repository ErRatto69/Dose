using Dose.Application.Services;
using Dose.Domain.Enums;
using FluentAssertions;

namespace Dose.UnitTests.Services;

public class DrinkStrengthCalculatorTests
{
    private readonly DrinkStrengthCalculator _sut = new();

    [Fact]
    public void CalculateMetrics_ForNegroni_ShouldCalculateAccurateAbvAndBottleScore()
    {
        // Arrange: 3cl Gin (43%), 3cl Campari (25%), 3cl Red Vermouth (16%), 1 Garnish (0cl, 0%)
        var components = new List<RecipeComponentInput>
        {
            new(IngredientCategory.Spirit, 3.0m, 43.0m),
            new(IngredientCategory.Spirit, 3.0m, 25.0m),
            new(IngredientCategory.Spirit, 3.0m, 16.0m),
            new(IngredientCategory.Garnish, 0.0m, 0.0m)
        };

        // Act
        var metrics = _sut.CalculateMetrics(components);

        // Assert:
        // Total liquid = 9 cl
        // Weighted alcohol = (3*0.43) + (3*0.25) + (3*0.16) = 1.29 + 0.75 + 0.48 = 2.52 cl pure EtOH
        // Final ABV = (2.52 / 9) * 100 = 28.00%
        metrics.TotalLiquidVolumeCl.Should().Be(9.0m);
        metrics.FinalAbvPercent.Should().Be(28.0m);
        metrics.PureAlcohol.Grams.Should().BeApproximately(19.88m, 0.2m);
        metrics.BottleScore1To10.Should().BeInRange(7, 9);
        metrics.BottleVisualRating.Should().BeInRange(3.5m, 4.5m);
    }

    [Fact]
    public void CalculateMetrics_WithOnlyGarnishOrZeroLiquids_ShouldReturnZeroMetrics()
    {
        // Arrange
        var components = new List<RecipeComponentInput>
        {
            new(IngredientCategory.Garnish, 0.0m, 0.0m)
        };

        // Act
        var metrics = _sut.CalculateMetrics(components);

        // Assert
        metrics.TotalLiquidVolumeCl.Should().Be(0m);
        metrics.FinalAbvPercent.Should().Be(0m);
        metrics.PureAlcohol.Grams.Should().Be(0m);
        metrics.BottleScore1To10.Should().Be(1);
    }
}