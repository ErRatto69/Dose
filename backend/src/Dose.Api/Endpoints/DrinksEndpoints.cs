using System.Text.Json;
using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Common.Models;
using Dose.Application.Features.Drinks.Commands;
using Dose.Application.Features.Drinks.Dtos;
using Dose.Application.Services;
using Dose.Domain.Common;
using Dose.Domain.Entities;
using Dose.Domain.Enums;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using ValidationException = Dose.Application.Common.Exceptions.ValidationException;

namespace Dose.Api.Endpoints;

public class DrinksEndpoints : IEndpoint
{
    private const decimal ClToOzFactor = 0.33814m;

    private static readonly string[] CanonicalGlassTypes =
    [
        "Highball",
        "Old Fashioned",
        "Coupe",
        "Martini",
        "Wine",
        "Flute",
        "Hurricane",
        "Copper Mug",
        "Shot",
        "Collins",
        "Nick & Nora",
        "Irish Coffee Mug",
        "Tiki Mug",
        "Pint"
    ];

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/drinks").WithTags("Drinks");

        // 1. Catalogo Paginato dei Drinks
        group.MapGet("/", async (
            int? pageNumber,
            int? pageSize,
            string? search,
            string? glassType,
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            CancellationToken ct) =>
        {
            int page = Math.Max(1, pageNumber ?? 1);
            int size = Math.Clamp(pageSize ?? 12, 1, 50);

            var query = context.Drinks
                .AsNoTracking()
                .Where(d => d.IsPublished);

            if (!string.IsNullOrWhiteSpace(glassType))
            {
                string g = glassType.Trim().ToLowerInvariant();
                query = query.Where(d => d.GlassType != null && d.GlassType.ToLower() == g);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLowerInvariant();
                query = query.Where(d =>
                    d.Name.ToLower().Contains(s) ||
                    d.Description.ToLower().Contains(s) ||
                    (d.GlassType != null && d.GlassType.ToLower().Contains(s)));
            }

            int totalCount = await query.CountAsync(ct);

            Guid? currentUserId = currentUserService.UserId;
            bool isAdmin = currentUserService.Role == UserRole.Admin;
            bool isBartender = currentUserService.Role == UserRole.Bartender;

            var rawItems = await query
                .OrderBy(d => d.Name)
                .Skip((page - 1) * size)
                .Take(size)
                .Select(d => new
                {
                    d.Id,
                    d.Name,
                    d.Description,
                    d.GlassType,
                    d.ImageUrl,
                    d.CachedTotalVolumeCl,
                    d.CachedAbv,
                    d.CachedBottleScore,
                    AverageRating = d.Reviews.Any() ? Math.Round(d.Reviews.Average(r => (double)r.Rating), 1) : 0,
                    ReviewCount = d.Reviews.Count,
                    d.IsPublished,
                    d.CreatedByUserId,
                    d.IsLockedByCreator,
                    d.CachedKcal
                })
                .ToListAsync(ct);

            var items = rawItems.Select(d =>
            {
                bool isSystem = d.CreatedByUserId == null;
                bool canManage = !isSystem && (isAdmin || (isBartender && (!d.IsLockedByCreator || d.CreatedByUserId == currentUserId)));

                return new DrinkCatalogItemDto(
                    d.Id,
                    d.Name,
                    d.Description,
                    d.GlassType,
                    d.ImageUrl,
                    d.CachedTotalVolumeCl,
                    d.CachedAbv,
                    d.CachedBottleScore,
                    d.AverageRating,
                    d.ReviewCount,
                    d.IsPublished,
                    d.CreatedByUserId,
                    d.IsLockedByCreator,
                    CanEdit: canManage,
                    CanDelete: canManage,
                    EstimatedKcal: d.CachedKcal
                );
            }).ToList();

            return Results.Ok(new PagedResult<DrinkCatalogItemDto>(items, totalCount, page, size));
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        // 2. Tipologie di Bicchieri
        group.MapGet("/glass-types", (string? q) =>
        {
            var matches = string.IsNullOrWhiteSpace(q)
                ? CanonicalGlassTypes.Take(8)
                : CanonicalGlassTypes.Where(g => g.Contains(q.Trim(), StringComparison.OrdinalIgnoreCase)).Take(8);

            return Results.Ok(matches.ToList());
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        // 3. Dettaglio Drink Singolo
        group.MapGet("/{id:guid}", async (
            Guid id,
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            CancellationToken ct) =>
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
                Math.Round(drink.CachedBottleScore / 2.0m, 2),
                drink.CachedKcal
            );

            Guid? currentUserId = currentUserService.UserId;
            bool isAdmin = currentUserService.Role == UserRole.Admin;
            bool isBartender = currentUserService.Role == UserRole.Bartender;

            bool isSystem = drink.CreatedByUserId == null;
            bool canManage = !isSystem && (isAdmin || (isBartender && (!drink.IsLockedByCreator || drink.CreatedByUserId == currentUserId)));

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
                ingredients,
                drink.CreatedByUserId,
                drink.IsLockedByCreator,
                CanEdit: canManage,
                CanDelete: canManage
            );

            return Results.Ok(detail);
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        // 4. Upload Immagine Cocktail
        group.MapPost("/upload-image", async (
            IFormFile? file,
            IDrinkImageStorageService imageStorageService,
            CancellationToken ct) =>
        {
            if (file == null || file.Length == 0)
                return Results.BadRequest(new { error = "No file was uploaded." });

            if (file.Length > 5 * 1024 * 1024)
                return Results.BadRequest(new { error = "Image exceeds maximum allowed size of 5MB." });

            await using var stream = file.OpenReadStream();
            string? savedPath = await imageStorageService.SaveAndSanitizeUploadedImageAsync(stream, file.Length, ct);

            if (string.IsNullOrWhiteSpace(savedPath))
                return Results.BadRequest(new { error = "Uploaded file is not a valid JPEG, PNG, or WebP image." });

            return Results.Ok(new { imageUrl = savedPath });
        })
        .RequireAuthorization("RequireBartenderOrAdmin")
        .DisableAntiforgery()
        .RequireRateLimiting("upload-policy");

        // 5. Creazione Nuovo Drink (o Duplicazione)
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

            // Validazione preventiva unicità nome (impedisce collisione su indice DB)
            string trimmedName = command.Name.Trim();
            bool nameExists = await context.Drinks
                .AnyAsync(d => d.Name.ToLower() == trimmedName.ToLower(), ct);

            if (nameExists)
            {
                throw new ValidationException(
                [
                    new FluentValidation.Results.ValidationFailure(
                        nameof(command.Name), 
                        $"A cocktail named '{trimmedName}' already exists. Please choose a different name.")
                ]);
            }

            var ingredientIds = command.Ingredients.Select(i => i.IngredientId).ToList();
            var dbIngredients = await context.Ingredients
                .Where(i => ingredientIds.Contains(i.Id))
                .ToDictionaryAsync(i => i.Id, ct);

            if (dbIngredients.Count != ingredientIds.Distinct().Count())
                throw new DomainException("One or more referenced ingredients do not exist.");

            var recipeComponents = command.Ingredients.Select(i =>
            {
                var ing = dbIngredients[i.IngredientId];
                return new RecipeComponentInput(ing.Category, i.AmountCl, ing.Abv, ing.Name);
            });

            var calculatedMetrics = strengthCalculator.CalculateMetrics(recipeComponents);
            string stepsJson = JsonSerializer.Serialize(command.PreparationSteps);

            string drinkDescription = string.IsNullOrWhiteSpace(command.Description)
                ? $"Craft cocktail recipe featuring {dbIngredients.Values.FirstOrDefault()?.Name ?? "premium spirits"}."
                : command.Description.Trim();

            var newDrink = new Drink(
                command.Name.Trim(),
                drinkDescription,
                stepsJson,
                command.GlassType,
                command.ImageUrl,
                currentUserService.UserId,
                command.IsLockedByCreator
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

        // 6. Modifica Drink Esistente
        group.MapPut("/{id:guid}", async (
            Guid id,
            UpdateDrinkCommand command,
            IApplicationDbContext context,
            IDrinkStrengthCalculator strengthCalculator,
            ICurrentUserService currentUserService,
            IValidator<UpdateDrinkCommand> validator,
            CancellationToken ct) =>
        {
            var validationResult = await validator.ValidateAsync(command, ct);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            var drink = await context.Drinks
                .FirstOrDefaultAsync(d => d.Id == id, ct)
                ?? throw new NotFoundException(nameof(Drink), id);

            if (drink.CreatedByUserId == null)
                throw new ForbiddenException("System and synced cocktails cannot be modified. Duplicate this drink to create a custom variation.");

            Guid? currentUserId = currentUserService.UserId;
            bool isAdmin = currentUserService.Role == UserRole.Admin;
            bool isBartender = currentUserService.Role == UserRole.Bartender;

            bool canManage = isAdmin || (isBartender && (!drink.IsLockedByCreator || drink.CreatedByUserId == currentUserId));
            if (!canManage)
                throw new ForbiddenException("This recipe is locked by its creator. Only the author or an administrator can modify it.");

            string trimmedName = command.Name.Trim();
            bool nameExists = await context.Drinks
                .AnyAsync(d => d.Id != id && d.Name.ToLower() == trimmedName.ToLower(), ct);

            if (nameExists)
            {
                throw new ValidationException(
                [
                    new FluentValidation.Results.ValidationFailure(
                        nameof(command.Name), 
                        $"A cocktail named '{trimmedName}' already exists. Please choose a different name.")
                ]);
            }

            var ingredientIds = command.Ingredients.Select(i => i.IngredientId).ToList();
            var dbIngredients = await context.Ingredients
                .Where(i => ingredientIds.Contains(i.Id))
                .ToDictionaryAsync(i => i.Id, ct);

            if (dbIngredients.Count != ingredientIds.Distinct().Count())
                throw new DomainException("One or more referenced ingredients do not exist.");

            var recipeComponents = command.Ingredients.Select(i =>
            {
                var ing = dbIngredients[i.IngredientId];
                return new RecipeComponentInput(ing.Category, i.AmountCl, ing.Abv, ing.Name);
            });

            var calculatedMetrics = strengthCalculator.CalculateMetrics(recipeComponents);
            string stepsJson = JsonSerializer.Serialize(command.PreparationSteps);

            string drinkDescription = string.IsNullOrWhiteSpace(command.Description)
                ? $"Craft cocktail recipe featuring {dbIngredients.Values.FirstOrDefault()?.Name ?? "premium spirits"}."
                : command.Description.Trim();

            drink.UpdateDetails(
                command.Name.Trim(),
                drinkDescription,
                stepsJson,
                command.GlassType,
                command.ImageUrl,
                command.IsLockedByCreator
            );

            drink.UpdateCachedMetrics(calculatedMetrics);

            await context.DrinkIngredients
                .Where(di => di.DrinkId == id)
                .ExecuteDeleteAsync(ct);

            foreach (var item in command.Ingredients)
            {
                var link = new DrinkIngredient(
                    drink.Id,
                    item.IngredientId,
                    item.AmountCl,
                    item.DisplayUnitNote,
                    item.IsOptional,
                    item.SortOrder
                );
                await context.DrinkIngredients.AddAsync(link, ct);
            }

            await context.SaveChangesAsync(ct);

            return Results.Ok(new { drink.Id, drink.Name });
        })
        .RequireAuthorization("RequireBartenderOrAdmin");

        // 7. Eliminazione Drink
        group.MapDelete("/{id:guid}", async (
            Guid id,
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            CancellationToken ct) =>
        {
            var drink = await context.Drinks
                .FirstOrDefaultAsync(d => d.Id == id, ct)
                ?? throw new NotFoundException(nameof(Drink), id);

            if (drink.CreatedByUserId == null)
                throw new ForbiddenException("System and synced cocktails cannot be deleted.");

            Guid? currentUserId = currentUserService.UserId;
            bool isAdmin = currentUserService.Role == UserRole.Admin;
            bool isBartender = currentUserService.Role == UserRole.Bartender;

            bool canManage = isAdmin || (isBartender && (!drink.IsLockedByCreator || drink.CreatedByUserId == currentUserId));
            if (!canManage)
                throw new ForbiddenException("This recipe is locked by its creator. Only the author or an administrator can delete it.");

            context.Drinks.Remove(drink);
            await context.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .RequireAuthorization("RequireBartenderOrAdmin");
    }
}