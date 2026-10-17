using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.DrinkLogs.Dtos;
using Dose.Application.Services;
using Dose.Domain.Common;
using Dose.Domain.Entities;
using Dose.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace Dose.Api.Endpoints;

public class DrinkLogsEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/drinks").WithTags("Drink Logging");

        // 1. Log an existing catalog drink (with optional custom doses)
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
                var customIngredientIds = request.CustomComponents!.Select(c => c.IngredientId).Distinct().ToList();
                var dbIngredients = await context.Ingredients
                    .Where(i => customIngredientIds.Contains(i.Id))
                    .ToDictionaryAsync(i => i.Id, ct);

                foreach (var component in request.CustomComponents!)
                {
                    if (component.AmountCl <= 0 || !dbIngredients.TryGetValue(component.IngredientId, out var ing))
                        continue;

                    decimal pureAlcoholGrams = ing.Abv > 0
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
                    decimal pureAlcoholGrams = di.Ingredient.Abv > 0
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
            string snapshotName = isCustomized ? $"{originalDrink.Name} (Custom)" : originalDrink.Name;

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
                drinkLog.AddItem(item);

            await context.DrinkLogs.AddAsync(drinkLog, ct);
            await context.SaveChangesAsync(ct);

            var bacResult = await ComputeCurrentUserBacAsync(user, context, bacCalculator, dateTimeProvider, ct);

            return Results.Created($"/api/drink-logs/{drinkLog.Id}", new DrinkLogResponseDto(
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
            ));
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        // 2. Log a Quick Pour / Shot / Custom Drink (Not saved in Drinks Catalog)
        group.MapPost("/custom/log", async (
            LogCustomDrinkRequestDto request,
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

            if (request.Components is null || request.Components.Count == 0)
                throw new DomainException("Please select at least one ingredient to log.");

            var ingredientIds = request.Components.Select(c => c.IngredientId).Distinct().ToList();
            var dbIngredients = await context.Ingredients
                .Where(i => ingredientIds.Contains(i.Id))
                .ToDictionaryAsync(i => i.Id, ct);

            var logItemsToCreate = new List<DrinkLogItem>();
            var strengthInputs = new List<RecipeComponentInput>();
            var usedNames = new List<string>();

            foreach (var comp in request.Components)
            {
                if (comp.AmountCl <= 0 || !dbIngredients.TryGetValue(comp.IngredientId, out var ing))
                    continue;

                decimal pureAlcoholGrams = ing.Abv > 0
                    ? PureAlcohol.FromClAndAbv(comp.AmountCl, ing.Abv).Grams
                    : 0.00m;

                logItemsToCreate.Add(new DrinkLogItem(
                    ing.Id,
                    ing.Name,
                    ing.Category,
                    ing.Abv,
                    comp.AmountCl,
                    pureAlcoholGrams
                ));

                strengthInputs.Add(new RecipeComponentInput(ing.Category, comp.AmountCl, ing.Abv));
                usedNames.Add(ing.Name);
            }

            if (logItemsToCreate.Count == 0)
                throw new DomainException("Total volume must be greater than zero.");

            var metrics = strengthCalculator.CalculateMetrics(strengthInputs);

            string generatedName = !string.IsNullOrWhiteSpace(request.CustomName)
                ? request.CustomName.Trim()
                : usedNames.Count == 1
                    ? $"{usedNames[0]} ({metrics.TotalLiquidVolumeCl:0.#} cl)"
                    : string.Join(" + ", usedNames.Take(2)) + (usedNames.Count > 2 ? $" +{usedNames.Count - 2}" : "");

            if (generatedName.Length > 120)
                generatedName = generatedName[..120];

            DateTimeOffset consumptionTime = request.ConsumedAt ?? dateTimeProvider.UtcNow;

            var drinkLog = new DrinkLog(
                userId,
                drinkId: null, // Not tied to a catalog recipe
                generatedName,
                isCustomized: true,
                consumptionTime,
                metrics.TotalLiquidVolumeCl,
                metrics.FinalAbvPercent,
                metrics.PureAlcohol,
                request.Notes
            );

            foreach (var item in logItemsToCreate)
                drinkLog.AddItem(item);

            await context.DrinkLogs.AddAsync(drinkLog, ct);
            await context.SaveChangesAsync(ct);

            var bacResult = await ComputeCurrentUserBacAsync(user, context, bacCalculator, dateTimeProvider, ct);

            return Results.Created($"/api/drink-logs/{drinkLog.Id}", new DrinkLogResponseDto(
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
            ));
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");
    }

    private static async Task<BacCalculationResult> ComputeCurrentUserBacAsync(
        User user,
        IApplicationDbContext context,
        IBacCalculator bacCalculator,
        IDateTimeProvider dateTimeProvider,
        CancellationToken ct)
    {
        DateTimeOffset now = dateTimeProvider.UtcNow;
        DateTimeOffset twelveHoursAgo = now.AddHours(-12);

        var pastEvents = await context.DrinkLogs
            .AsNoTracking()
            .Where(l => l.UserId == user.Id && l.ConsumedAt >= twelveHoursAgo && l.ConsumedAt <= now)
            .Select(l => new DrinkEventInput(l.Id, l.DrinkNameSnapshot, l.ConsumedAt, l.TotalPureAlcoholGrams))
            .ToListAsync(ct);

        return bacCalculator.ComputeRollingBac(
            user.WeightKg,
            user.HeightCm,
            user.Sex,
            user.BirthYear,
            pastEvents,
            now
        );
    }
}