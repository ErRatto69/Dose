using System.Text.Json;
using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.Drinks.Commands;
using Dose.Application.Features.Drinks.Dtos;
using Dose.Application.Services;
using Dose.Domain.Common;
using Dose.Domain.Entities;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using ValidationException = Dose.Application.Common.Exceptions.ValidationException;

namespace Dose.Api.Endpoints;

public class DrinksEndpoints : IEndpoint
{
    private const decimal ClToOzFactor = 0.33814m;

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/drinks").WithTags("Drinks");

        group.MapGet("/", async (IApplicationDbContext context, CancellationToken ct) =>
        {
            var drinks = await context.Drinks
                .AsNoTracking()
                .Where(d => d.IsPublished)
                .OrderBy(d => d.Name)
                .Select(d => new DrinkCatalogItemDto(
                    d.Id,
                    d.Name,
                    d.Description,
                    d.GlassType,
                    d.ImageUrl,
                    d.CachedTotalVolumeCl,
                    d.CachedAbv,
                    d.CachedBottleScore,
                    d.Reviews.Any() ? Math.Round(d.Reviews.Average(r => (double)r.Rating), 1) : 0,
                    d.Reviews.Count,
                    d.IsPublished
                ))
                .ToListAsync(ct);

            return Results.Ok(drinks);
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        group.MapGet("/{id:guid}", async (Guid id, IApplicationDbContext context, CancellationToken ct) =>
        {
            var drink = await context.Drinks
                .AsNoTracking()
                .Include(d => d.DrinkIngredients)
                    .ThenInclude(di => di.Ingredient)
                .Include(d => d.Reviews)
                .FirstOrDefaultAsync(d => d.Id == id, ct)
                ?? throw new NotFoundException(nameof(Drink), id);

            var steps = JsonSerializer.Deserialize<List<string>>(drink.PreparationStepsJson) ?? [];

            var ingredients = drink.DrinkIngredients
                .OrderBy(di => di.SortOrder)
                .Select(di => new DrinkIngredientDetailDto(
                    di.IngredientId,
                    di.Ingredient.Name,
                    di.Ingredient.Category.ToString(),
                    di.Ingredient.SubCategory,
                    di.Ingredient.Flavor,
                    di.Ingredient.Abv,
                    di.AmountCl,
                    Math.Round(di.AmountCl * ClToOzFactor, 2),
                    di.DisplayUnitNote,
                    di.IsOptional,
                    di.SortOrder
                ))
                .ToList();

            var metrics = new DrinkMetricsDto(
                drink.CachedTotalVolumeCl,
                Math.Round(drink.CachedTotalVolumeCl * ClToOzFactor, 2),
                drink.CachedAbv,
                drink.CachedPureAlcoholGrams,
                drink.CachedBottleScore,
                Math.Round(drink.CachedBottleScore / 2.0m, 2)
            );

            var detail = new DrinkDetailDto(
                drink.Id,
                drink.Name,
                drink.Description,
                drink.GlassType,
                drink.ImageUrl,
                steps,
                metrics,
                drink.Reviews.Any() ? Math.Round(drink.Reviews.Average(r => (double)r.Rating), 1) : 0,
                drink.Reviews.Count,
                ingredients
            );

            return Results.Ok(detail);
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        group.MapPost("/", async (
            CreateDrinkCommand command,
            IApplicationDbContext context,
            IDrinkStrengthCalculator strengthCalculator,
            ICurrentUserService currentUserService,
            IValidator<CreateDrinkCommand> validator,
            CancellationToken ct) =>
        {
            var validationResult = await validator.ValidateAsync(command, ct);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            var ingredientIds = command.Ingredients.Select(i => i.IngredientId).ToList();
            var dbIngredients = await context.Ingredients
                .Where(i => ingredientIds.Contains(i.Id))
                .ToDictionaryAsync(i => i.Id, ct);

            if (dbIngredients.Count != ingredientIds.Distinct().Count())
                throw new DomainException("One or more referenced ingredients do not exist.");

            var recipeComponents = command.Ingredients.Select(i =>
            {
                var ing = dbIngredients[i.IngredientId];
                return new RecipeComponentInput(ing.Category, i.AmountCl, ing.Abv);
            });

            var calculatedMetrics = strengthCalculator.CalculateMetrics(recipeComponents);
            string stepsJson = JsonSerializer.Serialize(command.PreparationSteps);

            var newDrink = new Drink(
                command.Name,
                command.Description,
                stepsJson,
                command.GlassType,
                command.ImageUrl,
                currentUserService.UserId
            );

            newDrink.UpdateCachedMetrics(calculatedMetrics);

            await context.Drinks.AddAsync(newDrink, ct);

            foreach (var item in command.Ingredients)
            {
                var link = new DrinkIngredient(
                    newDrink.Id,
                    item.IngredientId,
                    item.AmountCl,
                    item.DisplayUnitNote,
                    item.IsOptional,
                    item.SortOrder
                );
                await context.DrinkIngredients.AddAsync(link, ct);
            }

            await context.SaveChangesAsync(ct);

            return Results.Created($"/api/drinks/{newDrink.Id}", new { newDrink.Id, newDrink.Name });
        })
        .RequireAuthorization("RequireBartenderOrAdmin");
    }
}