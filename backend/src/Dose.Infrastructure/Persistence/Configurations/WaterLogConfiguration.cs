using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dose.Infrastructure.Persistence.Configurations;

public class WaterLogConfiguration : IEntityTypeConfiguration<WaterLog>
{
    public void Configure(EntityTypeBuilder<WaterLog> builder)
    {
        builder.ToTable("water_logs");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(x => x.AmountCl).HasPrecision(6, 2).IsRequired();
        builder.Property(x => x.ConsumedAt).IsRequired();

        builder.HasIndex(x => new { x.UserId, x.ConsumedAt });

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}