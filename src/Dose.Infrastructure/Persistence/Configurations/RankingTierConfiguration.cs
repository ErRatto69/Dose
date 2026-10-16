using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dose.Infrastructure.Persistence.Configurations;

public class RankingTierConfiguration : IEntityTypeConfiguration<RankingTier>
{
    public void Configure(EntityTypeBuilder<RankingTier> builder)
    {
        builder.ToTable("ranking_tiers");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(x => x.Name).HasMaxLength(60).IsRequired();
        builder.HasIndex(x => x.Name).IsUnique();

        builder.Property(x => x.TierOrder).IsRequired();
        builder.HasIndex(x => x.TierOrder).IsUnique();

        builder.Property(x => x.MinPureAlcoholGrams).HasPrecision(8, 2).IsRequired();
        builder.Property(x => x.MinPureAlcoholCl).HasPrecision(8, 2).IsRequired();
        builder.Property(x => x.BadgeIcon).HasMaxLength(50).IsRequired();
        builder.Property(x => x.ColorHex).HasMaxLength(7).HasDefaultValue("#10B981").IsRequired();
    }
}