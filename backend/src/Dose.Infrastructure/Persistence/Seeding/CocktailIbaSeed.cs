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
        // 1. Core Ingredients & Multi-Brand / Flavored Variants (All in English)
        // GIN
        var ginLondonDry = new Ingredient("Tanqueray London Dry Gin", IngredientCategory.Spirit, "Gin", 43.0m, null, true, "Classic dry botanical gin");
        var ginBombay = new Ingredient("Bombay Sapphire Gin", IngredientCategory.Spirit, "Gin", 40.0m, null, true, "Aromatic vapor-infused gin");
        var ginMalfyLemon = new Ingredient("Malfy Gin con Limone", IngredientCategory.Spirit, "Gin", 41.0m, "Lemon", true, "Italian lemon-infused gin");

        // VODKA (Neutral & Flavored)
        var vodkaStandard = new Ingredient("Absolut Vodka", IngredientCategory.Spirit, "Vodka", 40.0m, null, true, "Pure neutral grain spirit");
        var vodkaSmirnoff = new Ingredient("Smirnoff Red Vodka", IngredientCategory.Spirit, "Vodka", 37.5m, null, true, "Triple distilled neutral vodka");
        var vodkaGreyGoose = new Ingredient("Grey Goose Vodka", IngredientCategory.Spirit, "Vodka", 40.0m, null, true, "Premium French wheat vodka");
        var vodkaPeach = new Ingredient("Peach Vodka (Absolut Apeach)", IngredientCategory.Spirit, "Vodka", 38.0m, "Peach", true, "Peach flavored vodka");
        var vodkaStrawberry = new Ingredient("Strawberry Vodka (Keglevich)", IngredientCategory.Spirit, "Vodka", 20.0m, "Strawberry", true, "Sweet strawberry flavored vodka");

        // RUM
        var whiteRum = new Ingredient("Bacardi Carta Blanca", IngredientCategory.Spirit, "White Rum", 37.5m, null, true, "Light Caribbean white rum");
        var havana3 = new Ingredient("Havana Club Añejo 3 Años", IngredientCategory.Spirit, "White Rum", 40.0m, null, true, "Cuban aged white rum");
        var darkRum = new Ingredient("Kraken Black Spiced Rum", IngredientCategory.Spirit, "Dark Rum", 40.0m, "Spiced", true, "Rich Caribbean black spiced rum");

        // TEQUILA
        var tequila = new Ingredient("Jose Cuervo Tequila Blanco", IngredientCategory.Spirit, "Tequila", 38.0m, null, true, "100% blue agave spirit");
        var tequilaPatron = new Ingredient("Patrón Silver Tequila", IngredientCategory.Spirit, "Tequila", 40.0m, null, true, "Ultra-premium silver tequila");

        // LIQUEURS, BITTERS & VERMOUTH
        var jagermeister = new Ingredient("Jägermeister", IngredientCategory.Liqueur, "Herbal Liqueur", 35.0m, "Herbs", true, "German digestif made with 56 herbs and spices");
        var campari = new Ingredient("Bitter Campari", IngredientCategory.Liqueur, "Bitter", 25.0m, "Bitter Herbs", true, "Iconic Italian red bitter");
        var aperol = new Ingredient("Aperol", IngredientCategory.Liqueur, "Aperitivo Bitter", 11.0m, "Bitter Orange", true, "Light orange aperitivo bitter");
        var redVermouth = new Ingredient("Martini Rosso (Sweet Vermouth)", IngredientCategory.Liqueur, "Sweet Vermouth", 15.0m, null, true, "Herbal sweet fortified wine");
        var carpanoAntica = new Ingredient("Carpano Antica Formula", IngredientCategory.Liqueur, "Sweet Vermouth", 16.5m, null, true, "Premium vanilla-noted red vermouth");
        var tripleSec = new Ingredient("Cointreau (Triple Sec)", IngredientCategory.Liqueur, "Liqueur", 40.0m, "Orange", true, "Crystal clear orange liqueur");
        var coffeeLiqueur = new Ingredient("Kahlúa (Coffee Liqueur)", IngredientCategory.Liqueur, "Liqueur", 20.0m, "Coffee", true, "Rich Mexican coffee liqueur");
        var borghetti = new Ingredient("Caffè Borghetti", IngredientCategory.Liqueur, "Liqueur", 25.0m, "Coffee", true, "Real Italian espresso liqueur");
        var limoncello = new Ingredient("Limoncello di Sorrento", IngredientCategory.Liqueur, "Liqueur", 28.0m, "Lemon", true, "Sweet Italian lemon liqueur");
        var peachSchnapps = new Ingredient("Peachtree (Peach Liqueur)", IngredientCategory.Liqueur, "Liqueur", 20.0m, "Peach", true, "Clear peach liqueur");

        // WINE & BEER
        var prosecco = new Ingredient("Prosecco DOC Brut", IngredientCategory.Wine, "Sparkling Wine", 11.5m, null, true, "Crisp Italian sparkling white wine");
        var lagerBeer = new Ingredient("Pale Lager Beer", IngredientCategory.Beer, "Lager Beer", 5.0m, null, true, "Refreshing crisp pale lager");

        // MIXERS & SYRUPS
        var tonicWater = new Ingredient("Tonic Water", IngredientCategory.Mixer, "Tonic Water", 0.0m, null, true, "Carbonated quinine water");
        var cola = new Ingredient("Coca-Cola", IngredientCategory.Mixer, "Cola", 0.0m, "Cola", true, "Classic carbonated cola");
        var energyDrink = new Ingredient("Red Bull Energy Drink", IngredientCategory.Mixer, "Energy Drink", 0.0m, null, true, "Caffeinated energy mixer");
        var limeJuice = new Ingredient("Fresh Lime Juice", IngredientCategory.Mixer, "Citrus Juice", 0.0m, "Lime", true, "Freshly squeezed lime juice");
        var lemonJuice = new Ingredient("Fresh Lemon Juice", IngredientCategory.Mixer, "Citrus Juice", 0.0m, "Lemon", true, "Freshly squeezed lemon juice");
        var cranberryJuice = new Ingredient("Cranberry Juice", IngredientCategory.Mixer, "Fruit Juice", 0.0m, "Cranberry", true, "Tart ruby cranberry juice");
        var orangeJuice = new Ingredient("Fresh Orange Juice", IngredientCategory.Mixer, "Citrus Juice", 0.0m, "Orange", true, "Freshly squeezed orange juice");
        var gingerBeer = new Ingredient("Ginger Beer", IngredientCategory.Mixer, "Ginger Beer", 0.0m, "Ginger", true, "Spicy brewed ginger soda");
        var sodaWater = new Ingredient("Club Soda / Sparkling Water", IngredientCategory.Mixer, "Soda Water", 0.0m, null, true, "Sparkling club soda");
        var espressoCoffee = new Ingredient("Espresso Coffee", IngredientCategory.Mixer, "Espresso", 0.0m, "Coffee", true, "Hot freshly brewed espresso shot");
        var sugarSyrup = new Ingredient("Simple Sugar Syrup", IngredientCategory.Syrup, "Sugar Syrup", 0.0m, "Sugar", true, "1:1 simple sugar syrup");

        // GARNISHES
        var orangeSlice = new Ingredient("Orange Slice", IngredientCategory.Garnish, "Citrus Garnish", 0.0m, "Orange", true, "Fresh citrus wheel");
        var limeWheel = new Ingredient("Lime Wheel", IngredientCategory.Garnish, "Citrus Garnish", 0.0m, "Lime", true, "Fresh lime wheel");
        var mintLeaves = new Ingredient("Fresh Mint Leaves", IngredientCategory.Garnish, "Herb Garnish", 0.0m, "Mint", true, "Aromatic fresh mint");

        var allIngredients = new List<Ingredient>
        {
            ginLondonDry, ginBombay, ginMalfyLemon,
            vodkaStandard, vodkaSmirnoff, vodkaGreyGoose, vodkaPeach, vodkaStrawberry,
            whiteRum, havana3, darkRum,
            tequila, tequilaPatron,
            jagermeister, campari, aperol, redVermouth, carpanoAntica, tripleSec, coffeeLiqueur, borghetti, limoncello, peachSchnapps,
            prosecco, lagerBeer,
            tonicWater, cola, energyDrink, limeJuice, lemonJuice, cranberryJuice, orangeJuice, gingerBeer, sodaWater, espressoCoffee, sugarSyrup,
            orangeSlice, limeWheel, mintLeaves
        };

        // 2. Classic Recipes
        var recipes = new List<(Drink Drink, IReadOnlyList<DrinkIngredient> Components)>();

        void AddRecipe(Drink drink, List<(Ingredient Ing, decimal Cl, string? Note, bool Optional, short Order)> items)
        {
            var components = items.Select(x => new DrinkIngredient(drink.Id, x.Ing, x.Cl, x.Note, x.Optional, x.Order)).ToList();
            drink.UpdateCachedMetrics(strengthCalculator.CalculateMetrics(
                items.Select(x => new RecipeComponentInput(x.Ing.Category, x.Cl, x.Ing.Abv))
            ));
            recipes.Add((drink, components));
        }

        // A. Negroni
        AddRecipe(
            new Drink(
                "Negroni",
                "The iconic Italian aperitivo balanced with equal parts Gin, Sweet Vermouth, and Bitter Campari.",
                JsonSerializer.Serialize(new[]
                {
                    "Add ice cubes to an Old Fashioned glass.",
                    "Pour Gin, Bitter Campari, and Sweet Vermouth in equal parts.",
                    "Stir gently for 20 seconds using a bar spoon.",
                    "Garnish with a fresh orange slice."
                }),
                "Old Fashioned",
                "/images/drinks/negroni.webp"
            ),
            [
                (ginLondonDry, 3.0m, null, false, 1),
                (campari, 3.0m, null, false, 2),
                (redVermouth, 3.0m, null, false, 3),
                (orangeSlice, 0.0m, "1 slice", true, 4)
            ]
        );

        // B. Gin & Tonic
        AddRecipe(
            new Drink(
                "Gin & Tonic",
                "A crisp, refreshing highball drink pairing dry botanical gin with cold tonic water.",
                JsonSerializer.Serialize(new[]
                {
                    "Fill a highball or balloon glass with fresh ice cubes.",
                    "Pour in your chosen Gin.",
                    "Top gently with cold Tonic Water to preserve carbonation.",
                    "Stir once and garnish with a lime wheel."
                }),
                "Highball",
                "/images/drinks/gin-tonic.webp"
            ),
            [
                (ginLondonDry, 5.0m, null, false, 1),
                (tonicWater, 12.0m, "Top up", false, 2),
                (limeWheel, 0.0m, "1 wheel", true, 3)
            ]
        );

        // C. Margarita
        AddRecipe(
            new Drink(
                "Margarita",
                "The quintessential agave cocktail combining Tequila, orange liqueur, and fresh lime juice.",
                JsonSerializer.Serialize(new[]
                {
                    "Rim half of a chilled coupe glass with salt (optional).",
                    "Add Tequila, Triple Sec, and Fresh Lime Juice into a shaker with ice.",
                    "Shake vigorously for 15 seconds.",
                    "Double strain into the glass."
                }),
                "Coupe",
                "/images/drinks/margarita.webp"
            ),
            [
                (tequila, 5.0m, null, false, 1),
                (tripleSec, 2.0m, null, false, 2),
                (limeJuice, 2.0m, null, false, 3),
                (limeWheel, 0.0m, "1 wheel", true, 4)
            ]
        );

        // D. Moscow Mule
        AddRecipe(
            new Drink(
                "Moscow Mule",
                "A zesty and refreshing highball made with neutral Vodka, spicy Ginger Beer, and fresh lime.",
                JsonSerializer.Serialize(new[]
                {
                    "Fill a copper mug or highball glass with ice.",
                    "Pour in Vodka and fresh lime juice.",
                    "Top with cold Ginger Beer and stir gently.",
                    "Garnish with a lime wheel."
                }),
                "Copper Mug",
                "/images/drinks/moscow-mule.webp"
            ),
            [
                (vodkaStandard, 4.5m, null, false, 1),
                (limeJuice, 1.5m, null, false, 2),
                (gingerBeer, 12.0m, "Top up", false, 3),
                (limeWheel, 0.0m, "1 wheel", true, 4)
            ]
        );

        // E. Espresso Martini
        AddRecipe(
            new Drink(
                "Espresso Martini",
                "A rich, velvety pick-me-up combining Vodka, Coffee Liqueur, and freshly brewed espresso.",
                JsonSerializer.Serialize(new[]
                {
                    "Pour Vodka, Coffee Liqueur, sugar syrup, and espresso into a shaker.",
                    "Fill with ice and shake hard for 15 seconds to create a thick foam.",
                    "Double strain into a chilled Martini glass."
                }),
                "Martini",
                "/images/drinks/espresso-martini.webp"
            ),
            [
                (vodkaStandard, 5.0m, null, false, 1),
                (coffeeLiqueur, 3.0m, null, false, 2),
                (espressoCoffee, 3.0m, "1 shot", false, 3),
                (sugarSyrup, 1.0m, null, true, 4)
            ]
        );

        // F. Peach Breeze
        AddRecipe(
            new Drink(
                "Peach Breeze",
                "Fruity and vibrant highball crafted with Peach Vodka, cranberry juice, and a squeeze of lime.",
                JsonSerializer.Serialize(new[]
                {
                    "Fill a highball glass with cubed ice.",
                    "Pour in Peach Vodka and Cranberry Juice.",
                    "Add a splash of fresh lime juice and stir."
                }),
                "Highball",
                "/images/drinks/peach-breeze.webp"
            ),
            [
                (vodkaPeach, 5.0m, null, false, 1),
                (cranberryJuice, 10.0m, null, false, 2),
                (limeJuice, 1.5m, null, false, 3)
            ]
        );

        // G. Cuba Libre
        AddRecipe(
            new Drink(
                "Cuba Libre",
                "Classic Caribbean highball pairing White Rum with Cola and fresh lime juice.",
                JsonSerializer.Serialize(new[]
                {
                    "Fill a highball glass with ice.",
                    "Squeeze and drop in fresh lime juice, then pour White Rum.",
                    "Top with cold Coca-Cola and stir gently."
                }),
                "Highball",
                "/images/drinks/cuba-libre.webp"
            ),
            [
                (whiteRum, 5.0m, null, false, 1),
                (cola, 12.0m, "Top up", false, 2),
                (limeJuice, 1.0m, null, false, 3)
            ]
        );

        return (allIngredients, recipes);
    }
}