using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Dose.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<RegistrationRequest> RegistrationRequests { get; }
    DbSet<Ingredient> Ingredients { get; }
    DbSet<Drink> Drinks { get; }
    DbSet<DrinkIngredient> DrinkIngredients { get; }
    DbSet<CabinetItem> CabinetItems { get; }
    DbSet<Review> Reviews { get; }
    DbSet<DrinkLog> DrinkLogs { get; }
    DbSet<DrinkLogItem> DrinkLogItems { get; }
    DbSet<RankingTier> RankingTiers { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}