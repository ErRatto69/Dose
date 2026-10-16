using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.Reviews.Commands;
using Dose.Application.Features.Reviews.Dtos;
using Dose.Domain.Entities;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using ValidationException = Dose.Application.Common.Exceptions.ValidationException;

namespace Dose.Api.Endpoints;

public class ReviewsEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/drinks/{drinkId:guid}/reviews").WithTags("Reviews");

        group.MapGet("/", async (Guid drinkId, IApplicationDbContext context, CancellationToken ct) =>
        {
            var reviews = await context.Reviews
                .AsNoTracking()
                .Where(r => r.DrinkId == drinkId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ReviewDto(
                    r.Id,
                    r.DrinkId,
                    r.UserId,
                    r.User.Username,
                    r.Rating,
                    r.Comment,
                    r.CreatedAt
                ))
                .ToListAsync(ct);

            return Results.Ok(reviews);
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        group.MapPost("/", async (
            Guid drinkId,
            UpsertReviewCommand command,
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            IValidator<UpsertReviewCommand> validator,
            CancellationToken ct) =>
        {
            var validationResult = await validator.ValidateAsync(command, ct);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            var userId = currentUserService.UserId ?? throw new UnauthorizedException();

            var existingReview = await context.Reviews
                .FirstOrDefaultAsync(r => r.DrinkId == drinkId && r.UserId == userId, ct);

            if (existingReview is not null)
            {
                existingReview.SetRating(command.Rating, command.Comment);
            }
            else
            {
                var newReview = new Review(drinkId, userId, command.Rating, command.Comment);
                await context.Reviews.AddAsync(newReview, ct);
            }

            await context.SaveChangesAsync(ct);
            return Results.NoContent();
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");
    }
}