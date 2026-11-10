using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.Gamification.Dtos;
using Dose.Application.Services;
using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Dose.Infrastructure.Services;

public class GamificationService(
    IApplicationDbContext context,
    IMonthlyBadgeCalculator monthlyBadgeCalculator,
    IDateTimeProvider dateTimeProvider,
    IMemoryCache memoryCache) : IGamificationService
{
    private static readonly TimeSpan MonthlyBadgeCacheTtl = TimeSpan.FromMinutes(2);

    public async Task<MonthlyBadgesResponseDto> GetMonthlyBadgesAsync(
        Guid userId,
        int year,
        int month,
        CancellationToken ct = default)
    {
        string cacheKey = BuildMonthlyCacheKey(userId, year, month);
        if (memoryCache.TryGetValue(cacheKey, out MonthlyBadgesResponseDto? cached) && cached is not null)
        {
            return cached;
        }

        DateTimeOffset startOfMonthUtc = new(year, month, 1, 0, 0, 0, TimeSpan.Zero);
        DateTimeOffset nextMonthUtc = startOfMonthUtc.AddMonths(1);

        var userContext = await context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new MonthlyBadgeUserContext(u.WeightKg, u.HeightCm, u.Sex, u.BirthYear))
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException(nameof(User), userId);

        var monthLogs = await context.DrinkLogs
            .AsNoTracking()
            .Where(l => l.UserId == userId && l.ConsumedAt >= startOfMonthUtc && l.ConsumedAt < nextMonthUtc)
            .OrderBy(l => l.ConsumedAt)
            .Select(l => new MonthlyDrinkLogInput(
                l.Id,
                l.DrinkNameSnapshot,
                l.ConsumedAt,
                l.TotalPureAlcoholGrams,
                l.StomachState,
                l.TotalKcal))
            .ToListAsync(ct);

        IReadOnlyList<MonthlyDrinkLogItemInput> monthItems = monthLogs.Count == 0
            ? []
            : await context.DrinkLogItems
                .AsNoTracking()
                .Where(i => i.DrinkLog.UserId == userId
                            && i.DrinkLog.ConsumedAt >= startOfMonthUtc
                            && i.DrinkLog.ConsumedAt < nextMonthUtc)
                .Select(i => new MonthlyDrinkLogItemInput(
                    i.DrinkLogId,
                    i.IngredientNameSnapshot,
                    i.AmountCl))
                .ToListAsync(ct);

        int waterLogsCount = await context.WaterLogs
            .AsNoTracking()
            .CountAsync(w => w.UserId == userId
                             && w.ConsumedAt >= startOfMonthUtc
                             && w.ConsumedAt < nextMonthUtc, ct);

        var badges = monthlyBadgeCalculator.ComputeMonthlyBadges(
            userContext,
            monthLogs,
            monthItems,
            waterLogsCount);

        var response = new MonthlyBadgesResponseDto(
            Period: $"{year:D4}-{month:D2}",
            ResetsAtUtc: nextMonthUtc,
            Badges: badges);

        memoryCache.Set(cacheKey, response, MonthlyBadgeCacheTtl);
        return response;
    }

    public async Task<IReadOnlyDictionary<Guid, IReadOnlyList<MonthlyBadgeDto>>> GetEarnedMonthlyBadgesForUsersAsync(
        IReadOnlyCollection<Guid> userIds,
        int year,
        int month,
        CancellationToken ct = default)
    {
        if (userIds.Count == 0)
            return new Dictionary<Guid, IReadOnlyList<MonthlyBadgeDto>>();

        var result = new Dictionary<Guid, IReadOnlyList<MonthlyBadgeDto>>(userIds.Count);
        var missingUserIds = new List<Guid>();

        foreach (Guid userId in userIds.Distinct())
        {
            string cacheKey = BuildMonthlyCacheKey(userId, year, month);
            if (memoryCache.TryGetValue(cacheKey, out MonthlyBadgesResponseDto? cached) && cached is not null)
            {
                result[userId] = cached.Badges.Where(b => b.IsEarned).ToList();
            }
            else
            {
                missingUserIds.Add(userId);
            }
        }

        if (missingUserIds.Count == 0)
            return result;

        DateTimeOffset startOfMonthUtc = new(year, month, 1, 0, 0, 0, TimeSpan.Zero);
        DateTimeOffset nextMonthUtc = startOfMonthUtc.AddMonths(1);

        var users = await context.Users
            .AsNoTracking()
            .Where(u => missingUserIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                Context = new MonthlyBadgeUserContext(u.WeightKg, u.HeightCm, u.Sex, u.BirthYear)
            })
            .ToDictionaryAsync(u => u.Id, u => u.Context, ct);

        var logs = await context.DrinkLogs
            .AsNoTracking()
            .Where(l => missingUserIds.Contains(l.UserId)
                        && l.ConsumedAt >= startOfMonthUtc
                        && l.ConsumedAt < nextMonthUtc)
            .OrderBy(l => l.ConsumedAt)
            .Select(l => new
            {
                l.UserId,
                Log = new MonthlyDrinkLogInput(
                    l.Id,
                    l.DrinkNameSnapshot,
                    l.ConsumedAt,
                    l.TotalPureAlcoholGrams,
                    l.StomachState,
                    l.TotalKcal)
            })
            .ToListAsync(ct);

        var items = logs.Count == 0
            ? []
            : await context.DrinkLogItems
                .AsNoTracking()
                .Where(i => missingUserIds.Contains(i.DrinkLog.UserId)
                            && i.DrinkLog.ConsumedAt >= startOfMonthUtc
                            && i.DrinkLog.ConsumedAt < nextMonthUtc)
                .Select(i => new
                {
                    i.DrinkLog.UserId,
                    Item = new MonthlyDrinkLogItemInput(
                        i.DrinkLogId,
                        i.IngredientNameSnapshot,
                        i.AmountCl)
                })
                .ToListAsync(ct);

        var waterCounts = await context.WaterLogs
            .AsNoTracking()
            .Where(w => missingUserIds.Contains(w.UserId)
                        && w.ConsumedAt >= startOfMonthUtc
                        && w.ConsumedAt < nextMonthUtc)
            .GroupBy(w => w.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count, ct);

        var logsByUser = logs.GroupBy(x => x.UserId).ToDictionary(g => g.Key, g => g.Select(x => x.Log).ToList());
        var itemsByUser = items.GroupBy(x => x.UserId).ToDictionary(g => g.Key, g => g.Select(x => x.Item).ToList());

        foreach (Guid userId in missingUserIds)
        {
            if (!users.TryGetValue(userId, out var userContext))
            {
                result[userId] = Array.Empty<MonthlyBadgeDto>();
                continue;
            }

            IReadOnlyList<MonthlyDrinkLogInput> userLogs = logsByUser.TryGetValue(userId, out var ul) ? ul : [];
            IReadOnlyList<MonthlyDrinkLogItemInput> userItems = itemsByUser.TryGetValue(userId, out var ui) ? ui : [];
            int userWaterCount = waterCounts.GetValueOrDefault(userId, 0);

            var badges = monthlyBadgeCalculator.ComputeMonthlyBadges(
                userContext,
                userLogs,
                userItems,
                userWaterCount);

            var fullResponse = new MonthlyBadgesResponseDto(
                Period: $"{year:D4}-{month:D2}",
                ResetsAtUtc: nextMonthUtc,
                Badges: badges);

            memoryCache.Set(BuildMonthlyCacheKey(userId, year, month), fullResponse, MonthlyBadgeCacheTtl);
            result[userId] = badges.Where(b => b.IsEarned).ToList();
        }

        return result;
    }

    public async Task<AchievementPassportResponseDto> GetPassportAsync(Guid userId, CancellationToken ct = default)
    {
        var rows = await context.UserAchievements
            .AsNoTracking()
            .Where(ua => ua.UserId == userId)
            .ToListAsync(ct);

        if (rows.Count < AchievementDefinitions.All.Count)
        {
            var existingKeys = rows.Select(r => r.AchievementKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
            await BackfillMissingPassportRowsAsync(userId, existingKeys, ct);

            rows = await context.UserAchievements
                .AsNoTracking()
                .Where(ua => ua.UserId == userId)
                .ToListAsync(ct);
        }

        var rowMap = rows.ToDictionary(r => r.AchievementKey, StringComparer.OrdinalIgnoreCase);
        var items = new List<AchievementPassportItemDto>(AchievementDefinitions.All.Count);

        foreach (var def in AchievementDefinitions.All)
        {
            rowMap.TryGetValue(def.Key, out var row);
            int progress = row?.CurrentProgress ?? 0;
            bool isUnlocked = row?.IsUnlocked ?? false;
            int capped = isUnlocked ? def.TargetProgress : Math.Min(progress, def.TargetProgress);
            decimal percent = def.TargetProgress > 0
                ? Math.Clamp(Math.Round((capped / (decimal)def.TargetProgress) * 100m, 1), 0m, 100m)
                : 0m;

            items.Add(new AchievementPassportItemDto(
                Key: def.Key,
                Title: def.Title,
                Subtitle: def.Subtitle,
                Description: def.Description,
                Category: def.Category,
                Icon: def.Icon,
                IsUnlocked: isUnlocked,
                UnlockedAtUtc: row?.UnlockedAtUtc,
                CurrentProgress: Math.Min(progress, def.TargetProgress),
                TargetProgress: def.TargetProgress,
                ProgressPercent: percent
            ));
        }

        return new AchievementPassportResponseDto(
            UnlockedCount: items.Count(i => i.IsUnlocked),
            TotalCount: items.Count,
            Achievements: items
        );
    }

    public async Task RecordDrinkLoggedAsync(Guid userId, string? glassType, CancellationToken ct = default)
    {
        var trackedRows = await context.UserAchievements
            .Where(ua => ua.UserId == userId)
            .ToListAsync(ct);

        if (trackedRows.Count < AchievementDefinitions.All.Count)
        {
            var existingKeys = trackedRows.Select(r => r.AchievementKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
            await BackfillMissingPassportRowsAsync(userId, existingKeys, ct);
            return;
        }

        DateTimeOffset now = dateTimeProvider.UtcNow;
        var byKey = trackedRows.ToDictionary(r => r.AchievementKey, StringComparer.OrdinalIgnoreCase);

        if (byKey.TryGetValue(AchievementDefinitions.FirstDropKey, out var firstDrop) && !firstDrop.IsUnlocked)
        {
            firstDrop.UpdateProgress(1, now);
        }

        if (byKey.TryGetValue(AchievementDefinitions.CenturyPourKey, out var century) && !century.IsUnlocked)
        {
            century.IncrementProgress(1, now);
        }

        if (byKey.TryGetValue(AchievementDefinitions.GlobetrotterKey, out var globetrotter)
            && !globetrotter.IsUnlocked
            && !string.IsNullOrWhiteSpace(glassType))
        {
            int distinctGlasses = await context.DrinkLogs
                .AsNoTracking()
                .Where(l => l.UserId == userId
                            && l.DrinkId != null
                            && l.Drink != null
                            && l.Drink.GlassType != null
                            && l.Drink.GlassType != "")
                .Select(l => l.Drink!.GlassType!.ToLower())
                .Distinct()
                .CountAsync(ct);

            globetrotter.UpdateProgress(distinctGlasses, now);
        }

        await context.SaveChangesAsync(ct);
    }

    public async Task RecordWaterLoggedAsync(Guid userId, CancellationToken ct = default)
    {
        var trackedRows = await context.UserAchievements
            .Where(ua => ua.UserId == userId)
            .ToListAsync(ct);

        if (trackedRows.Count < AchievementDefinitions.All.Count)
        {
            var existingKeys = trackedRows.Select(r => r.AchievementKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
            await BackfillMissingPassportRowsAsync(userId, existingKeys, ct);
            return;
        }

        var hydration = trackedRows.FirstOrDefault(r =>
            r.AchievementKey.Equals(AchievementDefinitions.HydrationSavantKey, StringComparison.OrdinalIgnoreCase));

        if (hydration is not null && !hydration.IsUnlocked)
        {
            hydration.IncrementProgress(1, dateTimeProvider.UtcNow);
            await context.SaveChangesAsync(ct);
        }
    }

    public async Task RecordCustomDrinkCreatedAsync(Guid userId, CancellationToken ct = default)
    {
        var trackedRows = await context.UserAchievements
            .Where(ua => ua.UserId == userId)
            .ToListAsync(ct);

        if (trackedRows.Count < AchievementDefinitions.All.Count)
        {
            var existingKeys = trackedRows.Select(r => r.AchievementKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
            await BackfillMissingPassportRowsAsync(userId, existingKeys, ct);
            return;
        }

        var alchemist = trackedRows.FirstOrDefault(r =>
            r.AchievementKey.Equals(AchievementDefinitions.MasterAlchemistKey, StringComparison.OrdinalIgnoreCase));

        if (alchemist is not null && !alchemist.IsUnlocked)
        {
            int createdCount = await context.Drinks
                .AsNoTracking()
                .CountAsync(d => d.CreatedByUserId == userId, ct);

            alchemist.UpdateProgress(createdCount, dateTimeProvider.UtcNow);
            await context.SaveChangesAsync(ct);
        }
    }

    public async Task RecordReviewSubmittedAsync(Guid userId, CancellationToken ct = default)
    {
        var trackedRows = await context.UserAchievements
            .Where(ua => ua.UserId == userId)
            .ToListAsync(ct);

        if (trackedRows.Count < AchievementDefinitions.All.Count)
        {
            var existingKeys = trackedRows.Select(r => r.AchievementKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
            await BackfillMissingPassportRowsAsync(userId, existingKeys, ct);
            return;
        }

        var critic = trackedRows.FirstOrDefault(r =>
            r.AchievementKey.Equals(AchievementDefinitions.TheCriticKey, StringComparison.OrdinalIgnoreCase));

        if (critic is not null && !critic.IsUnlocked)
        {
            int reviewCount = await context.Reviews
                .AsNoTracking()
                .CountAsync(r => r.UserId == userId, ct);

            critic.UpdateProgress(reviewCount, dateTimeProvider.UtcNow);
            await context.SaveChangesAsync(ct);
        }
    }

    public void InvalidateMonthlyBadgesCache(Guid userId, DateTimeOffset consumedAtUtc)
    {
        var utc = consumedAtUtc.ToUniversalTime();
        memoryCache.Remove(BuildMonthlyCacheKey(userId, utc.Year, utc.Month));
    }

    private async Task BackfillMissingPassportRowsAsync(
        Guid userId,
        HashSet<string> existingKeys,
        CancellationToken ct)
    {
        DateTimeOffset now = dateTimeProvider.UtcNow;

        int? totalDrinkLogs = null;
        int? distinctGlasses = null;
        int? createdDrinks = null;
        int? totalReviews = null;
        int? totalWaterLogs = null;

        foreach (var def in AchievementDefinitions.All)
        {
            if (existingKeys.Contains(def.Key))
                continue;

            int progress = def.Key switch
            {
                AchievementDefinitions.FirstDropKey => totalDrinkLogs ??= await context.DrinkLogs
                    .AsNoTracking()
                    .CountAsync(l => l.UserId == userId, ct),
                AchievementDefinitions.CenturyPourKey => totalDrinkLogs ??= await context.DrinkLogs
                    .AsNoTracking()
                    .CountAsync(l => l.UserId == userId, ct),
                AchievementDefinitions.GlobetrotterKey => distinctGlasses ??= await context.DrinkLogs
                    .AsNoTracking()
                    .Where(l => l.UserId == userId
                                && l.DrinkId != null
                                && l.Drink != null
                                && l.Drink.GlassType != null
                                && l.Drink.GlassType != "")
                    .Select(l => l.Drink!.GlassType!.ToLower())
                    .Distinct()
                    .CountAsync(ct),
                AchievementDefinitions.MasterAlchemistKey => createdDrinks ??= await context.Drinks
                    .AsNoTracking()
                    .CountAsync(d => d.CreatedByUserId == userId, ct),
                AchievementDefinitions.TheCriticKey => totalReviews ??= await context.Reviews
                    .AsNoTracking()
                    .CountAsync(r => r.UserId == userId, ct),
                AchievementDefinitions.HydrationSavantKey => totalWaterLogs ??= await context.WaterLogs
                    .AsNoTracking()
                    .CountAsync(w => w.UserId == userId, ct),
                _ => 0
            };

            int initialProgress = def.Key == AchievementDefinitions.FirstDropKey
                ? Math.Min(progress, 1)
                : progress;

            DateTimeOffset? unlockedAt = initialProgress >= def.TargetProgress ? now : null;

            var row = new UserAchievement(
                userId: userId,
                achievementKey: def.Key,
                targetProgress: def.TargetProgress,
                currentProgress: initialProgress,
                unlockedAtUtc: unlockedAt);

            await context.UserAchievements.AddAsync(row, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static string BuildMonthlyCacheKey(Guid userId, int year, int month) =>
        $"badges:monthly:{year:D4}-{month:D2}:{userId}";
}
