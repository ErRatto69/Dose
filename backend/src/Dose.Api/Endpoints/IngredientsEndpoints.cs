using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.Ingredients.Commands;
using Dose.Application.Features.Ingredients.Dtos;
using Dose.Domain.Entities;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using ValidationException = Dose.Application.Common.Exceptions.ValidationException;

namespace Dose.Api.Endpoints;

public class IngredientsEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ingredients").WithTags("Ingredients");

        group.MapGet("/", async (IApplicationDbContext context, CancellationToken ct) =>
        {
            var ingredients = await context.Ingredients
                .AsNoTracking()
                .OrderBy(i => i.Category)
                .ThenBy(i => i.Name)
                .Select(i => new IngredientDto(
                    i.Id,
                    i.Name,
                    i.Category,
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

            string query = q.Trim();

            var suggestions = await context.Ingredients
                .AsNoTracking()
                .Where(i => EF.Functions.ILike(i.Name, $"%{query}%"))
                .OrderBy(i => i.Name)
                .Take(10)
                .Select(i => new IngredientSuggestionDto(
                    i.Id,
                    i.Name,
                    i.Category,
                    i.Abv,
                    i.IsAvailableInBar
                ))
                .ToListAsync(ct);

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
                command.Abv,
                command.IsAvailableInBar,
                command.Description,
                command.ImageUrl
            );

            await context.Ingredients.AddAsync(ingredient, ct);
            await context.SaveChangesAsync(ct);

            return Results.Created($"/api/ingredients/{ingredient.Id}", new IngredientDto(
                ingredient.Id,
                ingredient.Name,
                ingredient.Category,
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
}