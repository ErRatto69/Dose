using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.DrinkLogs.Dtos;
using Dose.Application.Services;
using Dose.Domain.Entities;
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

            var activeEvents = await context.DrinkLogs
                .AsNoTracking()
                .Where(l => l.UserId == userId && l.ConsumedAt >= twelveHoursAgo && l.ConsumedAt <= now)
                .OrderBy(l => l.ConsumedAt)
                .Select(l => new DrinkEventInput(l.Id, l.DrinkNameSnapshot, l.ConsumedAt, l.TotalPureAlcoholGrams))
                .ToListAsync(ct);

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

        // Admin-only monitoring overview
        group.MapGet("/admin/users/bac-overview", async (
            IApplicationDbContext context,
            IBacCalculator bacCalculator,
            IDateTimeProvider dateTimeProvider,
            CancellationToken ct) =>
        {
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

            var overview = users.Select(u =>
            {
                var userLogs = logsByUser.TryGetValue(u.Id, out var userEvents)
                    ? userEvents.Select(e => new DrinkEventInput(e.Id, e.DrinkNameSnapshot, e.ConsumedAt, e.TotalPureAlcoholGrams))
                    : [];

                var bac = bacCalculator.ComputeRollingBac(u.WeightKg, u.HeightCm, u.Sex, u.BirthYear, userLogs, now);

                return new
                {
                    u.Id,
                    u.Username,
                    CurrentBacGramsPerLiter = bac.CurrentBacGramsPerLiter,
                    SafetyLevel = bac.SafetyLevel.ToString(),
                    EstimatedSoberAt = bac.EstimatedSoberAt,
                    TotalDrinksLast12h = userLogs.Count()
                };
            })
            .OrderByDescending(x => x.CurrentBacGramsPerLiter)
            .ToList();

            return Results.Ok(overview);
        })
        .RequireAuthorization("RequireAdmin");
    }
}