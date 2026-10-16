using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dose.Infrastructure.Persistence.Configurations;

public class DrinkLogItemConfiguration : IEntityTypeConfiguration<DrinkLogItem>
{
    public void Configure(EntityTypeBuilder<DrinkLogItem> builder)
    {
        builder.ToTable("drink_log_items");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(x => x.IngredientNameSnapshot).HasMaxLength(100).IsRequired();
        builder.Property(x => x.CategorySnapshot)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.AbvSnapshot).HasPrecision(5, 2).IsRequired();
        builder.Property(x => x.AmountCl).HasPrecision(6, 2).IsRequired();
        builder.Property(x => x.PureAlcoholGrams).HasPrecision(7, 2).IsRequired();

        builder.HasOne(x => x.DrinkLog)
            .WithMany(l => l.Items)
            .HasForeignKey(x => x.DrinkLogId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}