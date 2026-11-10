using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;

namespace Dose.Api.Endpoints;

public class GamificationEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api").WithTags("Gamification & Achievements");

        // Dynamic monthly badges scoped strictly to the active (or requested) UTC month
        group.MapGet("/badges/monthly", async (
            string? period,
            ICurrentUserService currentUserService,
            IGamificationService gamificationService,
            IDateTimeProvider dateTimeProvider,
            CancellationToken ct) =>
        {
            var userId = currentUserService.UserId ?? throw new UnauthorizedException();

            DateTimeOffset now = dateTimeProvider.UtcNow;
            int year = now.Year;
            int month = now.Month;

            if (!string.IsNullOrWhiteSpace(period) &&
                DateTime.TryParseExact(
                    period,
                    "yyyy-MM",
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None,
                    out var parsedDate))
            {
                year = parsedDate.Year;
                month = parsedDate.Month;
            }

            var badges = await gamificationService.GetMonthlyBadgesAsync(userId, year, month, ct);
            return Results.Ok(badges);
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        // Persistent lifetime Cocktail Passport
        group.MapGet("/achievements/passport", async (
            ICurrentUserService currentUserService,
            IGamificationService gamificationService,
            CancellationToken ct) =>
        {
            var userId = currentUserService.UserId ?? throw new UnauthorizedException();
            var passport = await gamificationService.GetPassportAsync(userId, ct);
            return Results.Ok(passport);
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");
    }
}
