using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Common.Models;
using Dose.Application.Features.Reviews.Commands;
using Dose.Application.Features.Reviews.Dtos;
using Dose.Domain.Entities;
using Dose.Domain.Enums;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using ValidationException = Dose.Application.Common.Exceptions.ValidationException;

namespace Dose.Api.Endpoints;

public class ReviewsEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var drinkGroup = app.MapGroup("/api/drinks/{drinkId:guid}/reviews").WithTags("Reviews");

        // 1. Paginated reviews for a specific drink
        drinkGroup.MapGet("/", async (
            Guid drinkId,
            int? pageNumber,
            int? pageSize,
            IApplicationDbContext context,
            CancellationToken ct) =>
        {
            int page = Math.Max(1, pageNumber ?? 1);
            int size = Math.Clamp(pageSize ?? 10, 1, 50);

            var query = context.Reviews
                .AsNoTracking()
                .Where(r => r.DrinkId == drinkId);

            int totalCount = await query.CountAsync(ct);

            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * size)
                .Take(size)
                .Select(r => new ReviewDto(
                    r.Id,
                    r.DrinkId,
                    r.Drink.Name,
                    r.UserId,
                    r.User.Username,
                    r.Rating,
                    r.Comment,
                    r.CreatedAt
                ))
                .ToListAsync(ct);

            return Results.Ok(new PagedResult<ReviewDto>(items, totalCount, page, size));
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        // 2. Create or Update a review on a drink
        drinkGroup.MapPost("/", async (
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

        // 3. Current user's own reviews (paginated, for Profile page)
        app.MapGet("/api/users/me/reviews", async (
            int? pageNumber,
            int? pageSize,
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            CancellationToken ct) =>
        {
            var userId = currentUserService.UserId ?? throw new UnauthorizedException();
            int page = Math.Max(1, pageNumber ?? 1);
            int size = Math.Clamp(pageSize ?? 8, 1, 50);

            var query = context.Reviews
                .AsNoTracking()
                .Where(r => r.UserId == userId);

            int totalCount = await query.CountAsync(ct);

            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * size)
                .Take(size)
                .Select(r => new ReviewDto(
                    r.Id,
                    r.DrinkId,
                    r.Drink.Name,
                    r.UserId,
                    r.User.Username,
                    r.Rating,
                    r.Comment,
                    r.CreatedAt
                ))
                .ToListAsync(ct);

            return Results.Ok(new PagedResult<ReviewDto>(items, totalCount, page, size));
        })
        .WithTags("Reviews")
        .RequireAuthorization("RequireAuthenticatedDrinker");

        // 4. Admin: Paginated global or per-user reviews with search
        app.MapGet("/api/admin/reviews", async (
            Guid? userId,
            string? search,
            int? pageNumber,
            int? pageSize,
            IApplicationDbContext context,
            CancellationToken ct) =>
        {
            int page = Math.Max(1, pageNumber ?? 1);
            int size = Math.Clamp(pageSize ?? 12, 1, 50);

            var query = context.Reviews.AsNoTracking().AsQueryable();

            if (userId.HasValue)
            {
                query = query.Where(r => r.UserId == userId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLowerInvariant();
                query = query.Where(r =>
                    r.User.Username.ToLower().Contains(s) ||
                    r.Drink.Name.ToLower().Contains(s) ||
                    (r.Comment != null && r.Comment.ToLower().Contains(s)));
            }

            int totalCount = await query.CountAsync(ct);

            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * size)
                .Take(size)
                .Select(r => new ReviewDto(
                    r.Id,
                    r.DrinkId,
                    r.Drink.Name,
                    r.UserId,
                    r.User.Username,
                    r.Rating,
                    r.Comment,
                    r.CreatedAt
                ))
                .ToListAsync(ct);

            return Results.Ok(new PagedResult<ReviewDto>(items, totalCount, page, size));
        })
        .WithTags("Reviews")
        .RequireAuthorization("RequireAdmin");

        // 5. Delete a review (allowed for the review author OR Admin)
        app.MapDelete("/api/reviews/{reviewId:guid}", async (
            Guid reviewId,
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            CancellationToken ct) =>
        {
            var currentUserId = currentUserService.UserId ?? throw new UnauthorizedException();
            bool isAdmin = currentUserService.Role == UserRole.Admin;

            var review = await context.Reviews.FirstOrDefaultAsync(r => r.Id == reviewId, ct)
                ?? throw new NotFoundException(nameof(Review), reviewId);

            if (review.UserId != currentUserId && !isAdmin)
                throw new ForbiddenException("You can only delete your own reviews.");

            context.Reviews.Remove(review);
            await context.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithTags("Reviews")
        .RequireAuthorization("RequireAuthenticatedDrinker");
    }
}