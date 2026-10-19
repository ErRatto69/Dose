using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.Ingredients.Commands;
using Dose.Application.Features.Ingredients.Dtos;
using Dose.Domain.Entities;
using Dose.Domain.Enums;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using ValidationException = Dose.Application.Common.Exceptions.ValidationException;

namespace Dose.Api.Endpoints;

public class IngredientsEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ingredients").WithTags("Ingredients");

        group.MapGet("/", async (
            string? category,
            string? search,
            int? limit,
            IApplicationDbContext context,
            CancellationToken ct) =>
        {
            var query = context.Ingredients.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(category) &&
                !category.Equals("ALL", StringComparison.OrdinalIgnoreCase) &&
                Enum.TryParse<IngredientCategory>(category, true, out var parsedCat))
            {
                query = query.Where(i => i.Category == parsedCat);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLowerInvariant();
                query = query.Where(i =>
                    i.Name.ToLower().Contains(s) ||
                    i.SubCategory.ToLower().Contains(s) ||
                    (i.Flavor != null && i.Flavor.ToLower().Contains(s)));
            }

            query = query
                .OrderBy(i => i.Category)
                .ThenBy(i => i.SubCategory)
                .ThenBy(i => i.Name);

            if (limit.HasValue && limit.Value > 0)
            {
                query = query.Take(Math.Clamp(limit.Value, 1, 200));
            }

            var ingredients = await query
                .Select(i => new IngredientDto(
                    i.Id,
                    i.Name,
                    i.Category,
                    i.SubCategory,
                    i.Flavor,
                    i.Abv,
                    i.IsAvailableInBar,
                    i.Description,
                    i.ImageUrl
                ))
                .ToListAsync(ct);

            return Results.Ok(ingredients);
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        group.MapGet("/autocomplete", async (string? q, IApplicationDbContext context, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(q))
                return Results.Ok(Array.Empty<IngredientSuggestionDto>());

            string normalizedQuery = RemoveDiacritics(q.Trim());

            var allIngredients = await context.Ingredients
                .AsNoTracking()
                .OrderBy(i => i.Name)
                .ToListAsync(ct);

            var suggestions = allIngredients
                .Where(i =>
                    RemoveDiacritics(i.Name).Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase) ||
                    RemoveDiacritics(i.SubCategory).Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase) ||
                    (i.Flavor != null && RemoveDiacritics(i.Flavor).Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase)))
                .Take(12)
                .Select(i => new IngredientSuggestionDto(
                    i.Id,
                    i.Name,
                    i.Category,
                    i.SubCategory,
                    i.Flavor,
                    i.Abv,
                    i.IsAvailableInBar
                ))
                .ToList();

            return Results.Ok(suggestions);
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        group.MapPost("/", async (
            CreateIngredientCommand command,
            IApplicationDbContext context,
            IValidator<CreateIngredientCommand> validator,
            CancellationToken ct) =>
        {
            var validationResult = await validator.ValidateAsync(command, ct);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            var ingredient = new Ingredient(
                command.Name,
                command.Category,
                command.SubCategory,
                command.Abv,
                command.Flavor,
                command.IsAvailableInBar,
                command.Description,
                command.ImageUrl
            );

            await context.Ingredients.AddAsync(ingredient, cancellationToken: ct);
            await context.SaveChangesAsync(ct);

            return Results.Created($"/api/ingredients/{ingredient.Id}", new IngredientDto(
                ingredient.Id,
                ingredient.Name,
                ingredient.Category,
                ingredient.SubCategory,
                ingredient.Flavor,
                ingredient.Abv,
                ingredient.IsAvailableInBar,
                ingredient.Description,
                ingredient.ImageUrl
            ));
        })
        .RequireAuthorization("RequireBartenderOrAdmin");

        group.MapPatch("/{id:guid}/availability", async (
            Guid id,
            bool isAvailable,
            IApplicationDbContext context,
            CancellationToken ct) =>
        {
            var ingredient = await context.Ingredients.FirstOrDefaultAsync(i => i.Id == id, ct)
                ?? throw new NotFoundException(nameof(Ingredient), id);

            ingredient.SetBarAvailability(isAvailable);
            await context.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .RequireAuthorization("RequireBartenderOrAdmin");
    }

    private static string RemoveDiacritics(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        var normalized = text.Normalize(System.Text.NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder(normalized.Length);
        foreach (var c in normalized)
        {
            if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        return sb.ToString().Normalize(System.Text.NormalizationForm.FormC);
    }
}