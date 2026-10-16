using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dose.Infrastructure.Persistence.Configurations;

public class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.ToTable("reviews");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(x => x.Rating).IsRequired();
        builder.Property(x => x.Comment).HasMaxLength(1000);

        builder.HasIndex(x => new { x.DrinkId, x.UserId }).IsUnique();

        builder.HasOne(x => x.Drink)
            .WithMany(d => d.Reviews)
            .HasForeignKey(x => x.DrinkId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.User)
            .WithMany(u => u.Reviews)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}