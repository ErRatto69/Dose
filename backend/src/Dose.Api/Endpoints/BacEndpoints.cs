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
                    )).ToList()
                ))
                .ToList();

            var bacResult = bacCalculator.ComputeRollingBac(
                user.WeightKg,
                user.HeightCm,
                user.Sex,
                user.BirthYear,
                activeEvents,
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
                bacResult.Timeline
            ));
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        // Admin-only monitoring overview with Search & Pagination
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

            var users = await context.Users
                .AsNoTracking()
                .Where(u => u.IsActive)
                .ToListAsync(ct);

            var logs = await context.DrinkLogs
                .AsNoTracking()
                .Where(l => l.ConsumedAt >= twelveHoursAgo && l.ConsumedAt <= now)
                .Select(l => new { l.UserId, l.Id, l.DrinkNameSnapshot, l.ConsumedAt, l.TotalPureAlcoholGrams })
                .ToListAsync(ct);

            var logsByUser = logs.GroupBy(l => l.UserId).ToDictionary(g => g.Key, g => g.ToList());

            var fullOverview = users.Select(u =>
            {
                var userLogs = logsByUser.TryGetValue(u.Id, out var userEvents)
                    ? userEvents.Select(e => new DrinkEventInput(e.Id, e.DrinkNameSnapshot, e.ConsumedAt, e.TotalPureAlcoholGrams)).ToList()
                    : [];

                var bac = bacCalculator.ComputeRollingBac(u.WeightKg, u.HeightCm, u.Sex, u.BirthYear, userLogs, now);

                return new
                {
                    u.Id,
                    u.Username,
                    CurrentBacGramsPerLiter = bac.CurrentBacGramsPerLiter,
                    SafetyLevel = bac.SafetyLevel.ToString(),
                    RawLevel = bac.SafetyLevel,
                    EstimatedSoberAt = bac.EstimatedSoberAt,
                    TotalDrinksLast12h = userLogs.Count
                };
            })
            .OrderByDescending(x => x.CurrentBacGramsPerLiter)
            .ThenBy(x => x.Username)
            .ToList();

            int criticalCount = fullOverview.Count(x => x.RawLevel is BacSafetyLevel.Warning or BacSafetyLevel.Critical);

            var filtered = string.IsNullOrWhiteSpace(search)
                ? fullOverview
                : fullOverview.Where(x => x.Username.Contains(search.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();

            int totalCount = filtered.Count;
            int totalPages = (int)Math.Ceiling(totalCount / (double)size);

            var pagedItems = filtered
                .Skip((page - 1) * size)
                .Take(size)
                .Select(x => new
                {
                    x.Id,
                    x.Username,
                    x.CurrentBacGramsPerLiter,
                    x.SafetyLevel,
                    x.EstimatedSoberAt,
                    x.TotalDrinksLast12h
                })
                .ToList();

            return Results.Ok(new
            {
                Items = pagedItems,
                TotalCount = totalCount,
                PageNumber = page,
                PageSize = size,
                TotalPages = totalPages,
                HasPreviousPage = page > 1,
                HasNextPage = page < totalPages,
                CriticalCount = criticalCount
            });
        })
        .RequireAuthorization("RequireAdmin");
    }
}