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

        // 1. Indice B-Tree standard per garantire l'unicità del nome
        builder.HasIndex(x => x.Name)
            .IsUnique();

        // 2. Indice GIN separato per autocomplete e instant search
        builder.HasIndex(x => x.Name, "IX_ingredients_name_trgm")
            .HasMethod("gin")
            .HasOperators("gin_trgm_ops");

        builder.Property(x => x.Category)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.SubCategory)
            .HasMaxLength(60)
            .IsRequired();

        builder.Property(x => x.Flavor)
            .HasMaxLength(60);

        // 3. Indice composito per il matching rapido per categoria specifica e aroma
        builder.HasIndex(x => new { x.SubCategory, x.Flavor });

        builder.Property(x => x.Abv).HasPrecision(5, 2).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.Property(x => x.ImageUrl).HasMaxLength(500);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("chk_ingredient_abv_range", "\"Abv\" >= 0.00 AND \"Abv\" <= 96.00");
        });
    }
}