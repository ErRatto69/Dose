using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dose.Infrastructure.Persistence.Configurations;

public class DrinkLogConfiguration : IEntityTypeConfiguration<DrinkLog>
{
    public void Configure(EntityTypeBuilder<DrinkLog> builder)
    {
        builder.ToTable("drink_logs");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(x => x.DrinkNameSnapshot).HasMaxLength(120).IsRequired();
        builder.Property(x => x.ConsumedAt).IsRequired();

        builder.Property(x => x.TotalVolumeCl).HasPrecision(6, 2).IsRequired();
        builder.Property(x => x.EffectiveAbv).HasPrecision(5, 2).IsRequired();
        builder.Property(x => x.TotalPureAlcoholCl).HasPrecision(6, 2).IsRequired();
        builder.Property(x => x.TotalPureAlcoholGrams).HasPrecision(7, 2).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(300);

        builder.HasIndex(x => new { x.UserId, x.ConsumedAt });
        builder.HasIndex(x => x.ConsumedAt);

        builder.HasOne(x => x.User)
            .WithMany(u => u.DrinkLogs)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Drink)
            .WithMany(d => d.DrinkLogs)
            .HasForeignKey(x => x.DrinkId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}