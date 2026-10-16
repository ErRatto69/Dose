using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dose.Infrastructure.Persistence.Configurations;

public class DrinkIngredientConfiguration : IEntityTypeConfiguration<DrinkIngredient>
{
    public void Configure(EntityTypeBuilder<DrinkIngredient> builder)
    {
        builder.ToTable("drink_ingredients");

        builder.HasKey(x => new { x.DrinkId, x.IngredientId });

        builder.Property(x => x.AmountCl).HasPrecision(6, 2).IsRequired();
        builder.Property(x => x.DisplayUnitNote).HasMaxLength(50);
        builder.Property(x => x.IsOptional).IsRequired();
        builder.Property(x => x.SortOrder).IsRequired();

        builder.HasOne(x => x.Drink)
            .WithMany(d => d.DrinkIngredients)
            .HasForeignKey(x => x.DrinkId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Ingredient)
            .WithMany(i => i.DrinkIngredients)
            .HasForeignKey(x => x.IngredientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.IngredientId, x.DrinkId });
    }
}