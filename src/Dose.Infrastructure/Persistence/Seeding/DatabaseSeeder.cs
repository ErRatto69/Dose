using Dose.Application.Common.Interfaces;
using Dose.Application.Services;
using Dose.Domain.Entities;
using Dose.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Dose.Infrastructure.Persistence.Seeding;

public class DatabaseSeeder(
    DoseDbContext context,
    IPasswordHasher passwordHasher,
    IDrinkStrengthCalculator strengthCalculator,
    IConfiguration configuration,
    ILogger<DatabaseSeeder> logger)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        // 1. Seed Ranking Tiers
        if (!await context.RankingTiers.AnyAsync(cancellationToken))
        {
            logger.LogInformation("Seeding initial ranking tiers...");
            await context.RankingTiers.AddRangeAsync(RankingTiersSeed.GetInitialTiers(), cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
        }

        // 2. Seed Default Admin User
        if (!await context.Users.AnyAsync(u => u.Role == UserRole.Admin, cancellationToken))
        {
            logger.LogInformation("Seeding default admin user...");
            string adminPassword = configuration["Admin:InitialPassword"] ?? "AdminDose2026!";
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

        // 3. Seed Ingredients and Classic Drinks
        if (!await context.Drinks.AnyAsync(cancellationToken))
        {
            logger.LogInformation("Seeding core ingredients and IBA classic drinks...");
            var (ingredients, recipes) = CocktailIbaSeed.GetSeedData(strengthCalculator);

            await context.Ingredients.AddRangeAsync(ingredients, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);

            foreach (var (drink, components) in recipes)
            {
                await context.Drinks.AddAsync(drink, cancellationToken);
                await context.DrinkIngredients.AddRangeAsync(components, cancellationToken);
            }

            await context.SaveChangesAsync(cancellationToken);
        }
    }
}