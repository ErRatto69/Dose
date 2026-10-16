using Dose.Application.Common.Interfaces;
using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Dose.Infrastructure.Persistence;

public class DoseDbContext(DbContextOptions<DoseDbContext> options)
    : DbContext(options), IApplicationDbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Ingredient> Ingredients => Set<Ingredient>();
    public DbSet<Drink> Drinks => Set<Drink>();
    public DbSet<DrinkIngredient> DrinkIngredients => Set<DrinkIngredient>();
    public DbSet<CabinetItem> CabinetItems => Set<CabinetItem>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<DrinkLog> DrinkLogs => Set<DrinkLog>();
    public DbSet<DrinkLogItem> DrinkLogItems => Set<DrinkLogItem>();
    public DbSet<RankingTier> RankingTiers => Set<RankingTier>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all entity type configurations automatically from this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DoseDbContext).Assembly);
    }
}