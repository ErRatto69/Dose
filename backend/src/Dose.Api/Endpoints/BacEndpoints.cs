using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.DrinkLogs.Dtos;
using Dose.Application.Services;
using Dose.Domain.Entities;
using Dose.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Dose.Api.Endpoints;

public class BacEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api").WithTags("Blood Alcohol Content (BAC)");

        group.MapGet("/users/me/bac", async (
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            IBacCalculator bacCalculator,
            IDateTimeProvider dateTimeProvider,
            CancellationToken ct) =>
        {
            var userId = currentUserService.UserId ?? throw new UnauthorizedException();
            var user = await context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct)
                ?? throw new NotFoundException(nameof(User), userId);

            DateTimeOffset now = dateTimeProvider.UtcNow;
            DateTimeOffset twelveHoursAgo = now.AddHours(-12);

            var rawLogs = await context.DrinkLogs
                .AsNoTracking()
                .Include(l => l.Items)
                .Where(l => l.UserId == userId && l.ConsumedAt >= twelveHoursAgo && l.ConsumedAt <= now)
                .OrderBy(l => l.ConsumedAt)
                .ToListAsync(ct);

            var activeEvents = rawLogs
                .Select(l => new DrinkEventInput(
                    l.Id,
                    l.DrinkNameSnapshot,
                    l.ConsumedAt,
                    l.TotalPureAlcoholGrams,
                    l.TotalVolumeCl,
                    l.EffectiveAbv,
                    l.Notes,
                    l.Items.Select(i => new LoggedDrinkComponentDto(
                        i.IngredientId,
                        i.IngredientNameSnapshot,
                        i.CategorySnapshot.ToString(),
                        i.AbvSnapshot,
                        i.AmountCl
                    )).ToList(),
                    l.StomachState,
                    l.TotalKcal
                ))
                .ToList();

            var waterLogs = await context.WaterLogs
                .AsNoTracking()
                .Where(w => w.UserId == userId && w.ConsumedAt >= twelveHoursAgo && w.ConsumedAt <= now)
                .OrderBy(w => w.ConsumedAt)
                .Select(w => new WaterEventInput(w.Id, w.AmountCl, w.ConsumedAt))
                .ToListAsync(ct);

            var bacResult = bacCalculator.ComputeRollingBac(
                user.WeightKg,
                user.HeightCm,
                user.Sex,
                user.BirthYear,
                activeEvents,
                waterLogs,
                now
            );

            return Results.Ok(new BacStatusDto(
                user.Id,
                now,
                bacResult.CurrentBacGramsPerDl,
                bacResult.CurrentBacGramsPerLiter,
                bacResult.SafetyLevel,
                bacResult.SafetyMessage,
                bacResult.EstimatedSoberAt,
                bacResult.TotalAlcoholGramsLast12h,
                activeEvents,
                bacResult.Timeline,
                bacResult.HangoverRiskPercent,
                bacResult.ResponsibleDrinkingScore,
                bacResult.TotalKcalLast12h,
                bacResult.TotalWaterClLast12h,
                bacResult.WaterLogsCountLast12h,
                waterLogs
            ));
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        // Admin/Party BAC overview with server-side search, ordering, projection, and pagination
        group.MapGet("/admin/users/bac-overview", async (
            int? pageNumber,
            int? pageSize,
            string? search,
            IApplicationDbContext context,
            IBacCalculator bacCalculator,
            IDateTimeProvider dateTimeProvider,
            CancellationToken ct) =>
        {
            int page = Math.Max(1, pageNumber ?? 1);
            int size = Math.Clamp(pageSize ?? 12, 1, 50);

            DateTimeOffset now = dateTimeProvider.UtcNow;
            DateTimeOffset twelveHoursAgo = now.AddHours(-12);

            var usersQuery = context.Users
                .AsNoTracking()
                .Where(u => u.IsActive);

            if (!string.IsNullOrWhiteSpace(search))
            {
                string pattern = $"%{search.Trim()}%";
                usersQuery = usersQuery.Where(u => EF.Functions.ILike(u.Username, pattern));
            }

            int totalCount = await usersQuery.CountAsync(ct);

            var pagedUsers = totalCount == 0
                ? []
                : await usersQuery
                    .OrderByDescending(u => u.DrinkLogs
                        .Where(l => l.ConsumedAt >= twelveHoursAgo && l.ConsumedAt <= now)
                        .Sum(l => (decimal?)l.TotalPureAlcoholGrams) ?? 0m)
                    .ThenBy(u => u.Username)
                    .Skip((page - 1) * size)
                    .Take(size)
                    .Select(u => new
                    {
                        u.Id,
                        u.Username,
                        u.WeightKg,
                        u.HeightCm,
                        u.Sex,
                        u.BirthYear
                    })
                    .ToListAsync(ct);

            var pagedUserIds = pagedUsers.Select(u => u.Id).ToList();

            var activePartyLogs = await context.DrinkLogs
                .AsNoTracking()
                .Where(l => l.ConsumedAt >= twelveHoursAgo && l.ConsumedAt <= now && l.User.IsActive)
                .OrderBy(l => l.ConsumedAt)
                .Select(l => new
                {
                    l.UserId,
                    l.User.WeightKg,
                    l.User.HeightCm,
                    l.User.Sex,
                    l.User.BirthYear,
                    l.Id,
                    l.DrinkNameSnapshot,
                    l.ConsumedAt,
                    l.TotalPureAlcoholGrams,
                    l.StomachState,
                    l.TotalKcal
                })
                .ToListAsync(ct);

            var pagedWaterLogs = pagedUserIds.Count == 0
                ? []
                : await context.WaterLogs
                    .AsNoTracking()
                    .Where(w => pagedUserIds.Contains(w.UserId) && w.ConsumedAt >= twelveHoursAgo && w.ConsumedAt <= now)
                    .OrderBy(w => w.ConsumedAt)
                    .Select(w => new
                    {
                        w.UserId,
                        w.Id,
                        w.AmountCl,
                        w.ConsumedAt
                    })
                    .ToListAsync(ct);

            var logsByUser = activePartyLogs.GroupBy(l => l.UserId).ToDictionary(g => g.Key, g => g.ToList());
            var waterByUser = pagedWaterLogs.GroupBy(w => w.UserId).ToDictionary(g => g.Key, g => g.ToList());

            int criticalCount = logsByUser.Values.Count(userLogGroup =>
            {
                var first = userLogGroup[0];
                var events = userLogGroup.Select(e => new DrinkEventInput(
                    e.Id,
                    e.DrinkNameSnapshot,
                    e.ConsumedAt,
                    e.TotalPureAlcoholGrams,
                    0m,
                    0m,
                    null,
                    null,
                    e.StomachState,
                    e.TotalKcal));

                var bac = bacCalculator.ComputeRollingBac(
                    first.WeightKg,
                    first.HeightCm,
                    first.Sex,
                    first.BirthYear,
                    events,
                    Array.Empty<WaterEventInput>(),
                    now);

                return bac.SafetyLevel is BacSafetyLevel.Warning or BacSafetyLevel.Critical;
            });

            var pagedItems = pagedUsers
                .Select(u =>
                {
                    var userLogs = logsByUser.TryGetValue(u.Id, out var userEvents)
                        ? userEvents.Select(e => new DrinkEventInput(
                            e.Id,
                            e.DrinkNameSnapshot,
                            e.ConsumedAt,
                            e.TotalPureAlcoholGrams,
                            0m,
                            0m,
                            null,
                            null,
                            e.StomachState,
                            e.TotalKcal)).ToList()
                        : [];

                    var userWater = waterByUser.TryGetValue(u.Id, out var waterEvents)
                        ? waterEvents.Select(w => new WaterEventInput(w.Id, w.AmountCl, w.ConsumedAt)).ToList()
                        : [];

                    var bac = bacCalculator.ComputeRollingBac(
                        u.WeightKg,
                        u.HeightCm,
                        u.Sex,
                        u.BirthYear,
                        userLogs,
                        userWater,
                        now);

                    return new UserBacSummaryDto(
                        u.Id,
                        u.Username,
                        bac.CurrentBacGramsPerLiter,
                        bac.SafetyLevel.ToString(),
                        bac.EstimatedSoberAt,
                        userLogs.Count
                    );
                })
                .OrderByDescending(x => x.CurrentBacGramsPerLiter)
                .ThenBy(x => x.Username)
                .ToList();

            int totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)size);

            return Results.Ok(new AdminBacOverviewDto(
                pagedItems,
                totalCount,
                page,
                size,
                totalPages,
                page > 1,
                page < totalPages,
                criticalCount
            ));
        })
        .RequireAuthorization("RequireAdmin");
    }
}