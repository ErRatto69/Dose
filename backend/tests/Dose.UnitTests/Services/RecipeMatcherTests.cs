using Dose.Application.Services;
using Dose.Domain.Entities;
using Dose.Domain.Enums;
using FluentAssertions;

namespace Dose.UnitTests.Services;

public class RecipeMatcherTests
{
    private readonly RecipeMatcher _sut = new();
    /*
    [Fact]
    public void MatchDrinks_WhenAllEssentialIngredientsPresent_ShouldReturnExactMatch()
    {
        // Arrange
        var ginId = Guid.NewGuid();
        var tonicId = Guid.NewGuid();
        var limeId = Guid.NewGuid();

        var gin = new Ingredient("Gin", IngredientCategory.Spirit, 40m);
        var tonic = new Ingredient("Tonic", IngredientCategory.Mixer, 0m);
        var lime = new Ingredient("Lime Wheel", IngredientCategory.Garnish, 0m);

        var ginTonic = new Drink("Gin & Tonic", "Classic", "[]");
        ginTonic.DrinkIngredients.Add(new DrinkIngredient(ginTonic.Id, ginId, 5.0m, null, false, 1) { Ingredient = gin });
        ginTonic.DrinkIngredients.Add(new DrinkIngredient(ginTonic.Id, tonicId, 12.0m, null, false, 2) { Ingredient = tonic });
        ginTonic.DrinkIngredients.Add(new DrinkIngredient(ginTonic.Id, limeId, 0.0m, null, true, 3) { Ingredient = lime });

        // User has Gin and Tonic, but NO Lime
        var userCabinet = new HashSet<Guid> { ginId, tonicId };

        // Act
        var matches = _sut.MatchDrinks([ginTonic], userCabinet);

        // Assert: Lime is optional/garnish, so match must remain EXACT (100%)
        matches.Should().ContainSingle();
        matches[0].MatchType.Should().Be("EXACT");
        matches[0].MatchPercentage.Should().Be(100);
        matches[0].MissingIngredients.Should().BeEmpty();
        matches[0].OptionalMissingGarnishes.Should().Contain("Lime Wheel");
    }

    [Fact]
    public void MatchDrinks_WhenMissingOneEssentialIngredient_ShouldReturnMissingOne()
    {
        // Arrange
        var ginId = Guid.NewGuid();
        var campariId = Guid.NewGuid();
        var vermouthId = Guid.NewGuid();

        var gin = new Ingredient("Gin", IngredientCategory.Spirit, 43m);
        var campari = new Ingredient("Campari", IngredientCategory.Spirit, 25m);
        var vermouth = new Ingredient("Vermouth", IngredientCategory.Spirit, 16m);

        var negroni = new Drink("Negroni", "Classic", "[]");
        negroni.DrinkIngredients.Add(new DrinkIngredient(negroni.Id, ginId, 3.0m) { Ingredient = gin });
        negroni.DrinkIngredients.Add(new DrinkIngredient(negroni.Id, campariId, 3.0m) { Ingredient = campari });
        negroni.DrinkIngredients.Add(new DrinkIngredient(negroni.Id, vermouthId, 3.0m) { Ingredient = vermouth });

        // User only has Gin and Vermouth
        var userCabinet = new HashSet<Guid> { ginId, vermouthId };

        // Act
        var matches = _sut.MatchDrinks([negroni], userCabinet);

        // Assert
        matches.Should().ContainSingle();
        matches[0].MatchType.Should().Be("MISSING_ONE");
        matches[0].MissingIngredients.Should().ContainSingle(m => m.Name == "Campari");
    }
    */
}