using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dose.Infrastructure.Persistence.Configurations;

public class DrinkConfiguration : IEntityTypeConfiguration<Drink>
{
    public void Configure(EntityTypeBuilder<Drink> builder)
    {
        builder.ToTable("drinks");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.HasIndex(x => x.Name).IsUnique();

        // GIN Trigram index for fast instant search
        builder.HasIndex(x => x.Name)
            .HasMethod("gin")
            .HasOperators("gin_trgm_ops");

        builder.Property(x => x.Description).IsRequired();
        builder.Property(x => x.PreparationStepsJson)
            .HasColumnType("jsonb")
            .HasDefaultValue("[]")
            .IsRequired();

        builder.Property(x => x.GlassType).HasMaxLength(60);
        builder.Property(x => x.ImageUrl).HasMaxLength(500);

        builder.Property(x => x.CachedTotalVolumeCl).HasPrecision(6, 2).IsRequired();
        builder.Property(x => x.CachedAbv).HasPrecision(5, 2).IsRequired();
        builder.Property(x => x.CachedPureAlcoholGrams).HasPrecision(6, 2).IsRequired();
        builder.Property(x => x.CachedBottleScore).IsRequired();

        builder.HasOne(x => x.CreatedByUser)
            .WithMany()
            .HasForeignKey(x => x.CreatedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}