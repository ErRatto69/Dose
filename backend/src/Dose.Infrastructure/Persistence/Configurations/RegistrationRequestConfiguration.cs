using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dose.Infrastructure.Persistence.Configurations;

public class RegistrationRequestConfiguration : IEntityTypeConfiguration<RegistrationRequest>
{
    public void Configure(EntityTypeBuilder<RegistrationRequest> builder)
    {
        builder.ToTable("registration_requests");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(x => x.Username).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Email).HasMaxLength(120).IsRequired();
        builder.Property(x => x.PasswordHash).HasMaxLength(255).IsRequired();

        builder.Property(x => x.WeightKg).HasPrecision(5, 2).IsRequired();
        builder.Property(x => x.HeightCm).HasPrecision(5, 2).IsRequired();

        builder.Property(x => x.Sex)
            .HasConversion<string>()
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(x => x.RequestNote).HasMaxLength(300);
        builder.Property(x => x.ClientIpAddress).HasMaxLength(64);

        builder.Property(x => x.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.ClientIpAddress);
        builder.HasIndex(x => x.CreatedAt);
    }
}