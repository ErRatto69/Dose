using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dose.Infrastructure.Persistence.Configurations;

public class CabinetItemConfiguration : IEntityTypeConfiguration<CabinetItem>
{
    public void Configure(EntityTypeBuilder<CabinetItem> builder)
    {
        builder.ToTable("cabinet_items");

        builder.HasKey(x => new { x.UserId, x.IngredientId });

        builder.HasOne(x => x.User)
            .WithMany(u => u.CabinetItems)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Ingredient)
            .WithMany(i => i.CabinetUsers)
            .HasForeignKey(x => x.IngredientId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.UserId, x.IngredientId });
    }
}