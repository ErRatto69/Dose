using Dose.Api.Common;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.Leaderboard.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Dose.Api.Endpoints;

public class LeaderboardEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api").WithTags("Leaderboard & Gamification");

        group.MapGet("/leaderboard", async (
            string? period,
            IApplicationDbContext context,
            IDateTimeProvider dateTimeProvider,
            CancellationToken ct) =>
        {
            DateTimeOffset now = dateTimeProvider.UtcNow;
            int year = now.Year;
            int month = now.Month;

            if (!string.IsNullOrWhiteSpace(period) &&
                DateTime.TryParseExact(period, "yyyy-MM", null, System.Globalization.DateTimeStyles.None, out var parsedDate))
            {
                year = parsedDate.Year;
                month = parsedDate.Month;
            }

            var startOfMonth = new DateTimeOffset(year, month, 1, 0, 0, 0, TimeSpan.Zero);
            var endOfMonth = startOfMonth.AddMonths(1);

            var tiers = await context.RankingTiers
                .AsNoTracking()
                .OrderBy(t => t.TierOrder)
                .ToListAsync(ct);

            // Fetch only the top 15 active users for the selected month
            var monthLogs = await context.DrinkLogs
                .AsNoTracking()
                .Where(l => l.ConsumedAt >= startOfMonth && l.ConsumedAt < endOfMonth && l.User.IsActive)
                .GroupBy(l => l.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    DrinksCount = g.Count(),
                    TotalGrams = g.Sum(x => x.TotalPureAlcoholGrams),
                    TotalCl = g.Sum(x => x.TotalPureAlcoholCl)
                })
                .OrderByDescending(x => x.TotalGrams)
                .Take(15)
                .ToListAsync(ct);

            var userIds = monthLogs.Select(m => m.UserId).ToList();
            var users = await context.Users
                .AsNoTracking()
                .Where(u => userIds.Contains(u.Id) && u.IsActive)
                .ToDictionaryAsync(u => u.Id, ct);

            var entries = new List<LeaderboardEntryDto>();
            int rank = 1;

            foreach (var logAgg in monthLogs)
            {
                if (!users.TryGetValue(logAgg.UserId, out var user))
                    continue;

                var achievedTier = tiers
                    .Where(t => logAgg.TotalGrams >= t.MinPureAlcoholGrams)
                    .OrderByDescending(t => t.TierOrder)
                    .FirstOrDefault() ?? tiers.First();

                var nextTier = tiers
                    .Where(t => t.TierOrder > achievedTier.TierOrder)
                    .OrderBy(t => t.TierOrder)
                    .FirstOrDefault();

                decimal progressPercent = 100m;
                decimal gramsToNext = 0m;

                if (nextTier is not null)
                {
                    decimal tierSpan = nextTier.MinPureAlcoholGrams - achievedTier.MinPureAlcoholGrams;
                    decimal currentProgress = logAgg.TotalGrams - achievedTier.MinPureAlcoholGrams;
                    progressPercent = tierSpan > 0
                        ? Math.Clamp(Math.Round((currentProgress / tierSpan) * 100m, 1), 0m, 100m)
                        : 100m;
                    gramsToNext = Math.Max(0m, nextTier.MinPureAlcoholGrams - logAgg.TotalGrams);
                }

                entries.Add(new LeaderboardEntryDto(
                    rank++,
                    user.Id,
                    user.Username,
                    logAgg.DrinksCount,
                    logAgg.TotalGrams,
                    logAgg.TotalCl,
                    new RankingTierDto(
                        achievedTier.Id,
                        achievedTier.Name,
                        achievedTier.TierOrder,
                        achievedTier.MinPureAlcoholGrams,
                        achievedTier.MinPureAlcoholCl,
                        achievedTier.BadgeIcon,
                        achievedTier.ColorHex
                    ),
                    progressPercent,
                    gramsToNext
                ));
            }

            var response = new MonthlyLeaderboardResponseDto(
                $"{year:D4}-{month:D2}",
                endOfMonth,
                entries
            );

            return Results.Ok(response);
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");
    }
}