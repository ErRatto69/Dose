using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.Cabinet.Commands;
using Dose.Application.Features.Cabinet.Dtos;
using Dose.Application.Features.Ingredients.Dtos;
using Dose.Application.Services;
using Dose.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Dose.Api.Endpoints;

public class CabinetEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/cabinet").WithTags("Cabinet");

        group.MapGet("/", async (
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            CancellationToken ct) =>
        {
            var userId = currentUserService.UserId ?? throw new UnauthorizedException();

            var items = await context.CabinetItems
                .AsNoTracking()
                .Where(c => c.UserId == userId)
                .Select(c => new IngredientDto(
                    c.Ingredient.Id,
                    c.Ingredient.Name,
                    c.Ingredient.Category,
                    c.Ingredient.Abv,
                    c.Ingredient.IsAvailableInBar,
                    c.Ingredient.Description,
                    c.Ingredient.ImageUrl
                ))
                .ToListAsync(ct);

            return Results.Ok(new CabinetStatusDto(userId, items));
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        group.MapPost("/sync", async (
            SyncCabinetBatchCommand command,
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            CancellationToken ct) =>
        {
            var userId = currentUserService.UserId ?? throw new UnauthorizedException();

            var currentItems = await context.CabinetItems
                .Where(c => c.UserId == userId)
                .ToListAsync(ct);

            context.CabinetItems.RemoveRange(currentItems);

            foreach (var ingredientId in command.IngredientIds.Distinct())
            {
                await context.CabinetItems.AddAsync(new CabinetItem(userId, ingredientId), ct);
            }

            await context.SaveChangesAsync(ct);
            return Results.NoContent();
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        group.MapPost("/match", async (
            SyncCabinetBatchCommand? additionalIngredients,
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            IRecipeMatcher recipeMatcher,
            CancellationToken ct) =>
        {
            var userId = currentUserService.UserId ?? throw new UnauthorizedException();

            var userCabinetIds = await context.CabinetItems
                .Where(c => c.UserId == userId)
                .Select(c => c.IngredientId)
                .ToListAsync(ct);

            var targetIds = new HashSet<Guid>(userCabinetIds);
            if (additionalIngredients?.IngredientIds is not null)
            {
                foreach (var id in additionalIngredients.IngredientIds)
                    targetIds.Add(id);
            }

            var publishedDrinks = await context.Drinks
                .AsNoTracking()
                .Where(d => d.IsPublished)
                .Include(d => d.DrinkIngredients)
                    .ThenInclude(di => di.Ingredient)
                .ToListAsync(ct);

            var matches = recipeMatcher.MatchDrinks(publishedDrinks, targetIds, maxMissingAllowed: 2);

            return Results.Ok(matches);
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");
    }
}