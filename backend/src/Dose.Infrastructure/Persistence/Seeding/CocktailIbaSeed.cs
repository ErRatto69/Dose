using System.Text.Json;
using Dose.Application.Services;
using Dose.Domain.Entities;
using Dose.Domain.Enums;

namespace Dose.Infrastructure.Persistence.Seeding;

public static class CocktailIbaSeed
{
    public static (IReadOnlyList<Ingredient> Ingredients, IReadOnlyList<(Drink Drink, IReadOnlyList<DrinkIngredient> Components)> Recipes) GetSeedData(
        IDrinkStrengthCalculator strengthCalculator)
    {
        // 1. Core Ingredients
        var gin = new Ingredient("London Dry Gin", IngredientCategory.Spirit, 43.0m, true, "Classic botanical gin");
        var campari = new Ingredient("Bitter Campari", IngredientCategory.Spirit, 25.0m, true, "Italian red bitter");
        var redVermouth = new Ingredient("Sweet Red Vermouth", IngredientCategory.Spirit, 16.0m, true, "Herbal fortified wine");
        var tonicWater = new Ingredient("Tonic Water", IngredientCategory.Mixer, 0.0m, true, "Carbonated quinine water");
        var tequila = new Ingredient("Tequila Blanco", IngredientCategory.Spirit, 38.0m, true, "Agave spirit");
        var tripleSec = new Ingredient("Triple Sec (Cointreau)", IngredientCategory.Spirit, 40.0m, true, "Orange liqueur");
        var limeJuice = new Ingredient("Fresh Lime Juice", IngredientCategory.Mixer, 0.0m, true, "Freshly squeezed lime");
        var whiteRum = new Ingredient("White Rum", IngredientCategory.Spirit, 40.0m, true, "Light Caribbean rum");
        var sugarSyrup = new Ingredient("Simple Sugar Syrup", IngredientCategory.Mixer, 0.0m, true, "1:1 sugar water");
        var vodka = new Ingredient("Vodka", IngredientCategory.Spirit, 40.0m, true, "Pure neutral grain spirit");
        var gingerBeer = new Ingredient("Ginger Beer", IngredientCategory.Mixer, 0.0m, true, "Spicy brewed ginger soda");
        var orangeSlice = new Ingredient("Orange Slice", IngredientCategory.Garnish, 0.0m, true, "Fresh citrus wheel");
        var limeWheel = new Ingredient("Lime Wheel", IngredientCategory.Garnish, 0.0m, true, "Fresh lime wheel");

        var allIngredients = new List<Ingredient>
        {
            gin, campari, redVermouth, tonicWater, tequila, tripleSec,
            limeJuice, whiteRum, sugarSyrup, vodka, gingerBeer, orangeSlice, limeWheel
        };

        // 2. Classic Recipes
        var recipes = new List<(Drink Drink, IReadOnlyList<DrinkIngredient> Components)>();

        // A. Negroni
        var negroni = new Drink(
            "Negroni",
            "The iconic Italian aperitivo balanced with equal parts gin, sweet vermouth, and Campari.",
            JsonSerializer.Serialize(new[]
            {
                "Add ice cubes to an Old Fashioned glass.",
                "Pour Gin, Campari, and Sweet Red Vermouth in equal parts.",
                "Stir gently for 20 seconds using a bar spoon.",
                "Garnish with a fresh orange slice."
            }),
            "Old Fashioned",
            "/images/drinks/negroni.webp"
        );
        var negroniComponents = new List<DrinkIngredient>
        {
            new(negroni.Id, gin.Id, 3.0m, null, false, 1),
            new(negroni.Id, campari.Id, 3.0m, null, false, 2),
            new(negroni.Id, redVermouth.Id, 3.0m, null, false, 3),
            new(negroni.Id, orangeSlice.Id, 0.0m, "1 slice", true, 4)
        };
        negroni.UpdateCachedMetrics(strengthCalculator.CalculateMetrics(negroniComponents.Select(c =>
            new RecipeComponentInput(c.Ingredient?.Category ?? IngredientCategory.Spirit, c.AmountCl, c.Ingredient?.Abv ?? 40m))));
        recipes.Add((negroni, negroniComponents));

        // B. Gin & Tonic
        var ginTonic = new Drink(
            "Gin & Tonic",
            "A crisp, refreshing highball drink pairing dry botanical gin with tonic water.",
            JsonSerializer.Serialize(new[]
            {
                "Fill a highball or balloon glass with fresh ice cubes.",
                "Pour in London Dry Gin.",
                "Top gently with cold Tonic Water to preserve carbonation.",
                "Stir once and drop a lime wheel on top."
            }),
            "Highball",
            "/images/drinks/gin-tonic.webp"
        );
        var ginTonicComponents = new List<DrinkIngredient>
        {
            new(ginTonic.Id, gin.Id, 5.0m, null, false, 1),
            new(ginTonic.Id, tonicWater.Id, 12.0m, "Top up", false, 2),
            new(ginTonic.Id, limeWheel.Id, 0.0m, "1 wheel", true, 3)
        };
        ginTonic.UpdateCachedMetrics(strengthCalculator.CalculateMetrics(ginTonicComponents.Select(c =>
            new RecipeComponentInput(c.Ingredient?.Category ?? IngredientCategory.Spirit, c.AmountCl, c.Ingredient?.Abv ?? 40m))));
        recipes.Add((ginTonic, ginTonicComponents));

        // C. Margarita
        var margarita = new Drink(
            "Margarita",
            "The quintessential tequila cocktail combining agave notes with crisp lime and orange liqueur.",
            JsonSerializer.Serialize(new[]
            {
                "Rim a coupe or margarita glass with salt (optional).",
                "Add Tequila Blanco, Triple Sec, and Lime Juice into a shaker with ice.",
                "Shake vigorously for 15 seconds.",
                "Double strain into the chilled glass."
            }),
            "Coupe",
            "/images/drinks/margarita.webp"
        );
        var margaritaComponents = new List<DrinkIngredient>
        {
            new(margarita.Id, tequila.Id, 5.0m, null, false, 1),
            new(margarita.Id, tripleSec.Id, 2.0m, null, false, 2),
            new(margarita.Id, limeJuice.Id, 2.0m, null, false, 3),
            new(margarita.Id, limeWheel.Id, 0.0m, "1 wheel", true, 4)
        };
        margarita.UpdateCachedMetrics(strengthCalculator.CalculateMetrics(margaritaComponents.Select(c =>
            new RecipeComponentInput(c.Ingredient?.Category ?? IngredientCategory.Spirit, c.AmountCl, c.Ingredient?.Abv ?? 40m))));
        recipes.Add((margarita, margaritaComponents));

        return (allIngredients, recipes);
    }
}