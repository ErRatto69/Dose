using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dose.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(x => x.Username).HasMaxLength(50).IsRequired();
        builder.HasIndex(x => x.Username).IsUnique();

        builder.Property(x => x.Email).HasMaxLength(120).IsRequired();
        builder.HasIndex(x => x.Email).IsUnique();

        builder.Property(x => x.PasswordHash).HasMaxLength(255).IsRequired();

        builder.Property(x => x.Role)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.Sex)
            .HasConversion<string>()
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(x => x.PreferredUnit)
            .HasConversion<string>()
            .HasMaxLength(5)
            .IsRequired();

        builder.Property(x => x.WeightKg).HasPrecision(5, 2).IsRequired();
        builder.Property(x => x.HeightCm).HasPrecision(5, 2).IsRequired();

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("chk_users_weight", "weight_kg BETWEEN 30.00 AND 250.00");
            t.HasCheckConstraint("chk_users_height", "height_cm BETWEEN 100.00 AND 230.00");
        });
    }
}