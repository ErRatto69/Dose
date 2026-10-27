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

        // 1. Log an existing catalog drink
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

            DateTimeOffset now = dateTimeProvider.UtcNow;
            DateTimeOffset consumptionTime = request.ConsumedAt ?? now;
            if (consumptionTime < now.AddHours(-12) || consumptionTime > now.AddMinutes(5))
                throw new DomainException("Consumption time must be within the last 12 hours.");

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

            return Results.Created($"/api/drinks/logs/{drinkLog.Id}", new DrinkLogResponseDto(
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

        // 2. Log a Quick Pour / Shot / Custom Drink
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

            DateTimeOffset now = dateTimeProvider.UtcNow;
            DateTimeOffset consumptionTime = request.ConsumedAt ?? now;
            if (consumptionTime < now.AddHours(-12) || consumptionTime > now.AddMinutes(5))
                throw new DomainException("Consumption time must be within the last 12 hours.");

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

            var drinkLog = new DrinkLog(
                userId,
                drinkId: null,
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

            return Results.Created($"/api/drinks/logs/{drinkLog.Id}", new DrinkLogResponseDto(
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

        // 3. Edit a Drink Log from the last 12 hours
        group.MapPut("/logs/{logId:guid}", async (
            Guid logId,
            UpdateDrinkLogRequestDto request,
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

            // Carichiamo SOLO il drinkLog senza includere Items nel tracking per evitare conflitti di cancellazione
            var drinkLog = await context.DrinkLogs
                .FirstOrDefaultAsync(l => l.Id == logId && l.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(DrinkLog), logId);

            DateTimeOffset now = dateTimeProvider.UtcNow;
            if (drinkLog.ConsumedAt < now.AddHours(-12))
                throw new DomainException("Only drinks logged within the last 12 hours can be modified.");

            DateTimeOffset updatedConsumedAt = request.ConsumedAt ?? drinkLog.ConsumedAt;
            if (updatedConsumedAt < now.AddHours(-12) || updatedConsumedAt > now.AddMinutes(5))
                throw new DomainException("Consumption time must be within the last 12 hours.");

            string updatedName = !string.IsNullOrWhiteSpace(request.CustomName)
                ? request.CustomName.Trim()
                : drinkLog.DrinkNameSnapshot;

            if (request.Components != null && request.Components.Count > 0)
            {
                var ingredientIds = request.Components.Select(c => c.IngredientId).Distinct().ToList();
                var dbIngredients = await context.Ingredients
                    .Where(i => ingredientIds.Contains(i.Id))
                    .ToDictionaryAsync(i => i.Id, ct);

                var newItems = new List<DrinkLogItem>();
                var strengthInputs = new List<RecipeComponentInput>();

                foreach (var comp in request.Components)
                {
                    if (comp.AmountCl <= 0 || !dbIngredients.TryGetValue(comp.IngredientId, out var ing))
                        continue;

                    decimal pureAlcoholGrams = ing.Abv > 0
                        ? PureAlcohol.FromClAndAbv(comp.AmountCl, ing.Abv).Grams
                        : 0.00m;

                    newItems.Add(new DrinkLogItem(
                        drinkLog.Id,
                        ing.Id,
                        ing.Name,
                        ing.Category,
                        ing.Abv,
                        comp.AmountCl,
                        pureAlcoholGrams
                    ));

                    strengthInputs.Add(new RecipeComponentInput(ing.Category, comp.AmountCl, ing.Abv));
                }

                if (newItems.Count == 0)
                    throw new DomainException("Total volume must be greater than zero.");

                var metrics = strengthCalculator.CalculateMetrics(strengthInputs);

                // Pulizia sicura direttamente su PostgreSQL senza collisioni nel ChangeTracker
                await context.DrinkLogItems
                    .Where(i => i.DrinkLogId == logId)
                    .ExecuteDeleteAsync(ct);

                drinkLog.UpdateLogDetails(
                    updatedName,
                    isCustomized: true,
                    updatedConsumedAt,
                    metrics.TotalLiquidVolumeCl,
                    metrics.FinalAbvPercent,
                    metrics.PureAlcohol,
                    request.Notes
                );

                await context.DrinkLogItems.AddRangeAsync(newItems, ct);
            }
            else
            {
                var currentPureAlcohol = PureAlcohol.FromGrams(drinkLog.TotalPureAlcoholGrams);

                drinkLog.UpdateLogDetails(
                    updatedName,
                    drinkLog.IsCustomized,
                    updatedConsumedAt,
                    drinkLog.TotalVolumeCl,
                    drinkLog.EffectiveAbv,
                    currentPureAlcohol,
                    request.Notes
                );
            }

            await context.SaveChangesAsync(ct);

            var bacResult = await ComputeCurrentUserBacAsync(user, context, bacCalculator, dateTimeProvider, ct);

            return Results.Ok(new DrinkLogResponseDto(
                drinkLog.Id,
                drinkLog.DrinkNameSnapshot,
                drinkLog.IsCustomized,
                drinkLog.ConsumedAt,
                new LoggedMetricsDto(
                    drinkLog.TotalVolumeCl,
                    drinkLog.EffectiveAbv,
                    drinkLog.TotalPureAlcoholGrams,
                    1
                ),
                bacResult
            ));
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        // 4. Delete a Drink Log from the last 12 hours
        group.MapDelete("/logs/{logId:guid}", async (
            Guid logId,
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            IDateTimeProvider dateTimeProvider,
            CancellationToken ct) =>
        {
            var userId = currentUserService.UserId ?? throw new UnauthorizedException();

            var drinkLog = await context.DrinkLogs
                .FirstOrDefaultAsync(l => l.Id == logId && l.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(DrinkLog), logId);

            if (drinkLog.ConsumedAt < dateTimeProvider.UtcNow.AddHours(-12))
                throw new DomainException("Only drinks logged within the last 12 hours can be removed.");

            context.DrinkLogs.Remove(drinkLog);
            await context.SaveChangesAsync(ct);

            return Results.NoContent();
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
            .Select(l => new DrinkEventInput(l.Id, l.DrinkNameSnapshot, l.ConsumedAt, l.TotalPureAlcoholGrams, l.TotalVolumeCl, l.EffectiveAbv, l.Notes, null))
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