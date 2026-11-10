using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dose.Infrastructure.Persistence.Configurations;

public class UserAchievementConfiguration : IEntityTypeConfiguration<UserAchievement>
{
    public void Configure(EntityTypeBuilder<UserAchievement> builder)
    {
        builder.ToTable("user_achievements");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(x => x.AchievementKey).HasMaxLength(64).IsRequired();
        builder.Property(x => x.CurrentProgress);
        builder.Property(x => x.TargetProgress).IsRequired();
        builder.Property(x => x.UnlockedAtUtc);

        builder.HasIndex(x => new { x.UserId, x.AchievementKey }).IsUnique();
        builder.HasIndex(x => new { x.UserId, x.UnlockedAtUtc });

        builder.HasOne(x => x.User)
            .WithMany(u => u.Achievements)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
