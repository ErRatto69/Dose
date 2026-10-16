using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dose.Infrastructure.Persistence.Configurations;

public class IngredientConfiguration : IEntityTypeConfiguration<Ingredient>
{
    public void Configure(EntityTypeBuilder<Ingredient> builder)
    {
        builder.ToTable("ingredients");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.HasIndex(x => x.Name).IsUnique();

        // GIN Trigram index for autocomplete and fuzzy typo matching
        builder.HasIndex(x => x.Name)
            .HasMethod("gin")
            .HasOperators("gin_trgm_ops");

        builder.Property(x => x.Category)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.Abv).HasPrecision(5, 2).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.Property(x => x.ImageUrl).HasMaxLength(500);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("chk_ingredient_abv_range", "abv >= 0.00 AND abv <= 96.00");
        });
    }
}