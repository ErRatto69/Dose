using Dose.Application.Common.Interfaces;
using Dose.Application.Services;
using Dose.Domain.Entities;
using Dose.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Dose.Infrastructure.Persistence.Seeding;

public class DatabaseSeeder(
    DoseDbContext context,
    IPasswordHasher passwordHasher,
    IDrinkStrengthCalculator strengthCalculator,
    ILogger<DatabaseSeeder> logger)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        // 0. Esecuzione immediata DDL
        await context.Database.ExecuteSqlRawAsync("""
                                                      ALTER TABLE drinks ADD COLUMN IF NOT EXISTS "IsLockedByCreator" boolean NOT NULL DEFAULT FALSE;
                                                      ALTER TABLE drinks ADD COLUMN IF NOT EXISTS "CachedKcal" integer NOT NULL DEFAULT 0;
                                                      ALTER TABLE drink_logs ADD COLUMN IF NOT EXISTS "StomachState" character varying(20) NOT NULL DEFAULT 'LightSnack';
                                                      ALTER TABLE drink_logs ADD COLUMN IF NOT EXISTS "TotalKcal" integer NOT NULL DEFAULT 0;
                                                      ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS "SubCategory" character varying(60) NOT NULL DEFAULT 'Generic';
                                                      ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS "Flavor" character varying(60) NULL;
                                                      CREATE INDEX IF NOT EXISTS "IX_ingredients_SubCategory_Flavor" ON ingredients ("SubCategory", "Flavor");

                                                      CREATE TABLE IF NOT EXISTS water_logs (
                                                          "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
                                                          "UserId" uuid NOT NULL,
                                                          "AmountCl" numeric(6,2) NOT NULL DEFAULT 25.00,
                                                          "ConsumedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                                                          "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                                                          "UpdatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                                                          CONSTRAINT "PK_water_logs" PRIMARY KEY ("Id"),
                                                          CONSTRAINT "FK_water_logs_users_UserId" FOREIGN KEY ("UserId") REFERENCES users ("Id") ON DELETE CASCADE
                                                      );
                                                      CREATE INDEX IF NOT EXISTS "IX_water_logs_UserId_ConsumedAt" ON water_logs ("UserId", "ConsumedAt");
                                                  """, cancellationToken);

        // 1. Auto-riparazione bicchieri doppi ("Beer Glass Glass") e ingredienti con ABV errato dal sync
        await context.Database.ExecuteSqlRawAsync("""
            -- Riparazione GlassType
            UPDATE drinks SET "GlassType" = 'Beer Glass' WHERE "GlassType" ILIKE '%Beer Glass%';
            UPDATE drinks SET "GlassType" = REPLACE("GlassType", 'Glass Glass', 'Glass') WHERE "GlassType" ILIKE '%Glass Glass%';
            UPDATE drinks SET "GlassType" = REPLACE("GlassType", 'glass Glass', 'Glass') WHERE "GlassType" ILIKE '%glass Glass%';

            -- Riparazione Lager e Birre erroneamente settate al 40%
            UPDATE ingredients SET "Abv" = 5.00, "Category" = 'Beer', "SubCategory" = 'Beer' 
            WHERE LOWER("Name") IN ('lager', 'beer', 'stout', 'pilsner', 'guinness', 'ale') AND "Abv" = 40.00;

            -- Riparazione analcolici erroneamente settati al 40%
            UPDATE ingredients SET "Abv" = 0.00, "Category" = 'Mixer', "SubCategory" = 'Mixer' 
            WHERE LOWER("Name") IN ('sugar', 'salt', 'pepper', 'egg', 'water', 'ice', 'tabasco sauce', 'worcestershire sauce', 'lemon', 'lime', 'orange', 'mint') AND "Abv" = 40.00;
        """, cancellationToken);

        // 2. Ricalcolo delle metriche dei drink che contengono ingredienti corretti (es. 110 in the shade)
        var drinksToRecalculate = await context.Drinks
            .Include(d => d.DrinkIngredients)
            .ThenInclude(di => di.Ingredient)
            .Where(d => d.DrinkIngredients.Any(di => di.Ingredient.Category == IngredientCategory.Beer))
            .ToListAsync(cancellationToken);

        foreach (var drink in drinksToRecalculate)
        {
            var comps = drink.DrinkIngredients
                .Select(di => new RecipeComponentInput(di.Ingredient.Category, di.AmountCl, di.Ingredient.Abv))
                .ToList();
            drink.UpdateCachedMetrics(strengthCalculator.CalculateMetrics(comps));
        }
        await context.SaveChangesAsync(cancellationToken);

        // 3. Tabella delle richieste di registrazione e configurazione ranking tier
        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS registration_requests (
                "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "Username" character varying(50) NOT NULL,
                "Email" character varying(120) NOT NULL,
                "PasswordHash" character varying(255) NOT NULL,
                "WeightKg" numeric(5,2) NOT NULL,
                "HeightCm" numeric(5,2) NOT NULL,
                "Sex" character varying(10) NOT NULL,
                "BirthYear" integer NULL,
                "RequestNote" character varying(300) NULL,
                "ClientIpAddress" character varying(64) NULL,
                "Status" character varying(20) NOT NULL DEFAULT 'Pending',
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_registration_requests" PRIMARY KEY ("Id")
            );
            CREATE INDEX IF NOT EXISTS "IX_registration_requests_Status" ON registration_requests ("Status");
            CREATE INDEX IF NOT EXISTS "IX_registration_requests_ClientIpAddress" ON registration_requests ("ClientIpAddress");

            UPDATE ranking_tiers SET "BadgeIcon" = 'beer' WHERE "Name" = 'Casual Drinker';
            UPDATE ranking_tiers SET "BadgeIcon" = 'martini' WHERE "Name" = 'Amateur Mixer';
        """, cancellationToken);

        // 4. Seed Ranking Tiers
        if (!await context.RankingTiers.AnyAsync(cancellationToken))
        {
            logger.LogInformation("Seeding initial ranking tiers...");
            await context.RankingTiers.AddRangeAsync(RankingTiersSeed.GetInitialTiers(), cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
        }

        // 5. Seed Default Admin User
        if (!await context.Users.AnyAsync(u => u.Role == UserRole.Admin, cancellationToken))
        {
            logger.LogInformation("Seeding default admin user...");
            string adminPassword = "AdminDose2026!";
            string passwordHash = passwordHasher.HashPassword(adminPassword);

            var admin = new User(
                username: "admin",
                email: "admin@dose.local",
                passwordHash: passwordHash,
                role: UserRole.Admin,
                weightKg: 75.0m,
                heightCm: 178.0m,
                sex: BiologicalSex.Male,
                birthYear: 1995,
                preferredUnit: VolumeUnit.Cl
            );

            await context.Users.AddAsync(admin, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
        }

        // 6. Seed or Update Classic Ingredients and Drinks
        var (seedIngredients, seedRecipes) = CocktailIbaSeed.GetSeedData(strengthCalculator);
        var existingIngredients = await context.Ingredients.ToListAsync(cancellationToken);

        foreach (var seedIng in seedIngredients)
        {
            if (!existingIngredients.Any(i => i.Name.Equals(seedIng.Name, StringComparison.OrdinalIgnoreCase)))
            {
                await context.Ingredients.AddAsync(seedIng, cancellationToken);
                existingIngredients.Add(seedIng);
            }
        }
        await context.SaveChangesAsync(cancellationToken);

        // Rimozione del vecchio ingrediente generico "Vodka" in presenza di "Absolut Vodka"
        var genericVodka = existingIngredients.FirstOrDefault(i => i.Name.Equals("Vodka", StringComparison.OrdinalIgnoreCase));
        var absolutVodka = existingIngredients.FirstOrDefault(i => i.Name.Equals("Absolut Vodka", StringComparison.OrdinalIgnoreCase));

        if (genericVodka is not null && absolutVodka is not null && genericVodka.Id != absolutVodka.Id)
        {
            var linksToMove = await context.DrinkIngredients
                .Where(di => di.IngredientId == genericVodka.Id)
                .ToListAsync(cancellationToken);

            foreach (var link in linksToMove)
            {
                bool alreadyHasAbsolut = await context.DrinkIngredients
                    .AnyAsync(di => di.DrinkId == link.DrinkId && di.IngredientId == absolutVodka.Id, cancellationToken);

                context.DrinkIngredients.Remove(link);
                if (!alreadyHasAbsolut)
                {
                    await context.DrinkIngredients.AddAsync(
                        new DrinkIngredient(link.DrinkId, absolutVodka.Id, link.AmountCl, link.DisplayUnitNote, link.IsOptional, link.SortOrder),
                        cancellationToken);
                }
            }

            context.Ingredients.Remove(genericVodka);
            existingIngredients.Remove(genericVodka);
            await context.SaveChangesAsync(cancellationToken);
        }

        // Normalizzazione ingredienti legacy
        foreach (var existing in existingIngredients)
        {
            if (string.IsNullOrWhiteSpace(existing.SubCategory) ||
                existing.SubCategory.Equals("Generic", StringComparison.OrdinalIgnoreCase) ||
                existing.SubCategory.Equals("Spirit", StringComparison.OrdinalIgnoreCase) ||
                existing.SubCategory.Equals("Mixer", StringComparison.OrdinalIgnoreCase))
            {
                var (subCat, flavor, newCat) = InferSubCategoryAndFlavor(existing.Name, existing.Abv, existing.Category);
                existing.SetDetails(existing.Name, newCat, subCat, existing.Abv, flavor ?? existing.Flavor);
            }
        }
        await context.SaveChangesAsync(cancellationToken);

        // 7. Seed Classic Recipes
        var existingDrinkNames = await context.Drinks.Select(d => d.Name).ToListAsync(cancellationToken);

        foreach (var (drink, components) in seedRecipes)
        {
            if (existingDrinkNames.Any(n => n.Equals(drink.Name, StringComparison.OrdinalIgnoreCase)))
                continue;

            await context.Drinks.AddAsync(drink, cancellationToken);

            foreach (var comp in components)
            {
                var matchedDbIng = existingIngredients.First(i =>
                    i.Name.Equals(comp.Ingredient.Name, StringComparison.OrdinalIgnoreCase) ||
                    (i.SubCategory.Equals(comp.Ingredient.SubCategory, StringComparison.OrdinalIgnoreCase) &&
                     string.Equals(i.Flavor ?? "", comp.Ingredient.Flavor ?? "", StringComparison.OrdinalIgnoreCase)));

                await context.DrinkIngredients.AddAsync(new DrinkIngredient(
                    drink.Id,
                    matchedDbIng.Id,
                    comp.AmountCl,
                    comp.DisplayUnitNote,
                    comp.IsOptional,
                    comp.SortOrder
                ), cancellationToken);
            }
        }

        await context.SaveChangesAsync(cancellationToken);
    }

    private static (string SubCategory, string? Flavor, IngredientCategory Category) InferSubCategoryAndFlavor(
        string name,
        decimal abv,
        IngredientCategory currentCat)
    {
        string lower = name.ToLowerInvariant();

        // 1. Ingredienti analcolici (ABV == 0)
        if (abv <= 0)
        {
            if (lower.Contains("ginger"))
                return ("Ginger Beer", "Ginger", IngredientCategory.Mixer);
            if (lower.Contains("tonic"))
                return ("Tonic Water", null, IngredientCategory.Mixer);
            if (lower.Contains("cola"))
                return ("Cola", "Cola", IngredientCategory.Mixer);
            if (lower.Contains("energy") || lower.Contains("bull"))
                return ("Energy Drink", null, IngredientCategory.Mixer);
            if (lower.Contains("soda") || lower.Contains("seltz"))
                return ("Soda Water", null, IngredientCategory.Mixer);
            if (lower.Contains("coffee") || lower.Contains("espresso") || lower.Contains("caffè"))
                return ("Espresso", "Coffee", IngredientCategory.Mixer);
            if (lower.Contains("syrup") || lower.Contains("sugar") || lower.Contains("sciroppo"))
                return ("Sugar Syrup", "Sugar", IngredientCategory.Syrup);
            if (lower.Contains("slice") || lower.Contains("wheel") || lower.Contains("leaves") || currentCat == IngredientCategory.Garnish)
                return ("Citrus Garnish", lower.Contains("orange") ? "Orange" : lower.Contains("lime") ? "Lime" : null, IngredientCategory.Garnish);
            if (lower.Contains("lime"))
                return ("Citrus Juice", "Lime", IngredientCategory.Mixer);
            if (lower.Contains("lemon"))
                return ("Citrus Juice", "Lemon", IngredientCategory.Mixer);
            if (lower.Contains("orange"))
                return ("Citrus Juice", "Orange", IngredientCategory.Mixer);
            if (lower.Contains("cranberry"))
                return ("Fruit Juice", "Cranberry", IngredientCategory.Mixer);

            var safeNonAlcoholicCat = currentCat is IngredientCategory.Syrup or IngredientCategory.Garnish or IngredientCategory.Pantry
                ? currentCat
                : IngredientCategory.Mixer;

            return (name, null, safeNonAlcoholicCat);
        }

        // 2. Ingredienti alcolici (ABV > 0)
        if (lower.Contains("vodka"))
        {
            string? flavor = lower.Contains("peach") || lower.Contains("pesca") ? "Peach"
                : lower.Contains("straw") || lower.Contains("fragola") ? "Strawberry"
                : null;
            return ("Vodka", flavor, IngredientCategory.Spirit);
        }

        if (lower.Contains("gin") && !lower.Contains("ginger"))
        {
            string? flavor = lower.Contains("lemon") || lower.Contains("limone") ? "Lemon" : null;
            return ("Gin", flavor, IngredientCategory.Spirit);
        }

        if (lower.Contains("rum"))
        {
            bool isDark = lower.Contains("dark") || lower.Contains("black") || lower.Contains("spiced") || lower.Contains("scuro");
            return (isDark ? "Dark Rum" : "White Rum", isDark ? "Spiced" : null, IngredientCategory.Spirit);
        }

        if (lower.Contains("tequila"))
            return ("Tequila", null, IngredientCategory.Spirit);

        if (lower.Contains("jager") || lower.Contains("jäger"))
            return ("Herbal Liqueur", "Herbs", IngredientCategory.Liqueur);

        if (lower.Contains("campari"))
            return ("Bitter", "Bitter Herbs", IngredientCategory.Liqueur);

        if (lower.Contains("aperol"))
            return ("Aperitivo Bitter", "Bitter Orange", IngredientCategory.Liqueur);

        if (lower.Contains("vermouth"))
            return ("Sweet Vermouth", null, IngredientCategory.Liqueur);

        if (lower.Contains("triple sec") || lower.Contains("cointreau"))
            return ("Liqueur", "Orange", IngredientCategory.Liqueur);

        if (lower.Contains("kahlua") || lower.Contains("borghetti") || (lower.Contains("coffee") && lower.Contains("liqueur")))
            return ("Liqueur", "Coffee", IngredientCategory.Liqueur);

        if (lower.Contains("limoncello"))
            return ("Liqueur", "Lemon", IngredientCategory.Liqueur);

        if (lower.Contains("peachtree") || lower.Contains("schnapps"))
            return ("Liqueur", "Peach", IngredientCategory.Liqueur);

        if (lower.Contains("prosecco") || lower.Contains("wine") || lower.Contains("spumante") || lower.Contains("champagne"))
            return ("Sparkling Wine", null, IngredientCategory.Wine);

        if (lower.Contains("beer") || lower.Contains("birra") || lower.Contains("lager") || lower.Contains("ale"))
            return ("Lager Beer", null, IngredientCategory.Beer);

        var safeAlcoholicCat = currentCat is IngredientCategory.Liqueur or IngredientCategory.Wine or IngredientCategory.Beer
            ? currentCat
            : IngredientCategory.Spirit;

        return (name, null, safeAlcoholicCat);
    }
}