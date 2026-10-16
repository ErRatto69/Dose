using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.DrinkLogs.Dtos;
using Dose.Application.Services;
using Dose.Domain.Entities;
using Dose.Domain.Enums;
using Dose.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace Dose.Api.Endpoints;

public class DrinkLogsEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/drinks").WithTags("Drink Logging");

        group.MapPost("/{id:guid}/log", async (
            Guid id,
            LogDrinkRequestDto request,
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            IDrinkStrengthCalculator strengthCalculator,
            IBacCalculator bacCalculator,
            IDateTimeProvider dateTimeProvider,
            CancellationToken ct) =>
        {
            var userId = currentUserService.UserId ?? throw new UnauthorizedException();
            var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                ?? throw new NotFoundException(nameof(User), userId);

            var originalDrink = await context.Drinks
                .Include(d => d.DrinkIngredients)
                    .ThenInclude(di => di.Ingredient)
                .FirstOrDefaultAsync(d => d.Id == id, ct)
                ?? throw new NotFoundException(nameof(Drink), id);

            DateTimeOffset consumptionTime = request.ConsumedAt ?? dateTimeProvider.UtcNow;
            bool isCustomized = request.CustomComponents is not null && request.CustomComponents.Count > 0;

            var logItemsToCreate = new List<DrinkLogItem>();
            var strengthInputs = new List<RecipeComponentInput>();

            if (isCustomized)
            {
                var customIngredientIds = request.CustomComponents!.Select(c => c.IngredientId).ToList();
                var dbIngredients = await context.Ingredients
                    .Where(i => customIngredientIds.Contains(i.Id))
                    .ToDictionaryAsync(i => i.Id, ct);

                foreach (var component in request.CustomComponents!)
                {
                    if (!dbIngredients.TryGetValue(component.IngredientId, out var ing))
                        continue;

                    decimal pureAlcoholGrams = ing.Category == IngredientCategory.Spirit
                        ? PureAlcohol.FromClAndAbv(component.AmountCl, ing.Abv).Grams
                        : 0.00m;

                    logItemsToCreate.Add(new DrinkLogItem(
                        ing.Id,
                        ing.Name,
                        ing.Category,
                        ing.Abv,
                        component.AmountCl,
                        pureAlcoholGrams
                    ));

                    strengthInputs.Add(new RecipeComponentInput(ing.Category, component.AmountCl, ing.Abv));
                }
            }
            else
            {
                foreach (var di in originalDrink.DrinkIngredients)
                {
                    decimal pureAlcoholGrams = di.Ingredient.Category == IngredientCategory.Spirit
                        ? PureAlcohol.FromClAndAbv(di.AmountCl, di.Ingredient.Abv).Grams
                        : 0.00m;

                    logItemsToCreate.Add(new DrinkLogItem(
                        di.IngredientId,
                        di.Ingredient.Name,
                        di.Ingredient.Category,
                        di.Ingredient.Abv,
                        di.AmountCl,
                        pureAlcoholGrams
                    ));

                    strengthInputs.Add(new RecipeComponentInput(di.Ingredient.Category, di.AmountCl, di.Ingredient.Abv));
                }
            }

            var metrics = strengthCalculator.CalculateMetrics(strengthInputs);
            string snapshotName = isCustomized ? $"{originalDrink.Name} (Custom Dose)" : originalDrink.Name;

            var drinkLog = new DrinkLog(
                userId,
                originalDrink.Id,
                snapshotName,
                isCustomized,
                consumptionTime,
                metrics.TotalLiquidVolumeCl,
                metrics.FinalAbvPercent,
                metrics.PureAlcohol,
                request.Notes
            );

            foreach (var item in logItemsToCreate)
            {
                drinkLog.AddItem(item);
            }

            await context.DrinkLogs.AddAsync(drinkLog, ct);
            await context.SaveChangesAsync(ct);

            // Compute updated rolling BAC for the last 12 hours
            DateTimeOffset now = dateTimeProvider.UtcNow;
            DateTimeOffset twelveHoursAgo = now.AddHours(-12);

            var pastEvents = await context.DrinkLogs
                .AsNoTracking()
                .Where(l => l.UserId == userId && l.ConsumedAt >= twelveHoursAgo && l.ConsumedAt <= now)
                .Select(l => new DrinkEventInput(l.Id, l.DrinkNameSnapshot, l.ConsumedAt, l.TotalPureAlcoholGrams))
                .ToListAsync(ct);

            var bacResult = bacCalculator.ComputeRollingBac(
                user.WeightKg,
                user.HeightCm,
                user.Sex,
                user.BirthYear,
                pastEvents,
                now
            );

            var response = new DrinkLogResponseDto(
                drinkLog.Id,
                drinkLog.DrinkNameSnapshot,
                drinkLog.IsCustomized,
                drinkLog.ConsumedAt,
                new LoggedMetricsDto(
                    drinkLog.TotalVolumeCl,
                    drinkLog.EffectiveAbv,
                    drinkLog.TotalPureAlcoholGrams,
                    metrics.BottleScore1To10
                ),
                bacResult
            );

            return Results.Created($"/api/drink-logs/{drinkLog.Id}", response);
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");
    }
}