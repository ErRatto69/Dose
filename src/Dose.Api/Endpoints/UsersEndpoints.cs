using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.Users.Commands;
using Dose.Application.Features.Users.Dtos;
using Dose.Domain.Common;
using Dose.Domain.Entities;
using Dose.Domain.Enums;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using ValidationException = Dose.Application.Common.Exceptions.ValidationException;

namespace Dose.Api.Endpoints;

public class UsersEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/me", async (
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            CancellationToken ct) =>
        {
            var userId = currentUserService.UserId
                ?? throw new UnauthorizedException("User is not authenticated.");

            var user = await context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId, ct)
                ?? throw new NotFoundException(nameof(User), userId);

            return Results.Ok(new UserProfileDto(
                user.Id,
                user.Username,
                user.Email,
                user.Role,
                user.WeightKg,
                user.HeightCm,
                user.Sex,
                user.BirthYear,
                user.PreferredUnit,
                user.IsActive
            ));
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        group.MapPut("/me/biometrics", async (
            UpdateBiometricsCommand command,
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            IValidator<UpdateBiometricsCommand> validator,
            CancellationToken ct) =>
        {
            var validationResult = await validator.ValidateAsync(command, ct);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            var userId = currentUserService.UserId
                ?? throw new UnauthorizedException();

            var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                ?? throw new NotFoundException(nameof(User), userId);

            user.UpdateBiometrics(command.WeightKg, command.HeightCm, command.Sex, command.BirthYear);
            await context.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        group.MapPost("/", async (
            CreateUserCommand command,
            IApplicationDbContext context,
            IPasswordHasher passwordHasher,
            IValidator<CreateUserCommand> validator,
            CancellationToken ct) =>
        {
            var validationResult = await validator.ValidateAsync(command, ct);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            bool exists = await context.Users.AnyAsync(u =>
                u.Username.ToLower() == command.Username.ToLower() ||
                u.Email.ToLower() == command.Email.ToLower(), ct);

            if (exists)
                throw new DomainException("A user with this username or email already exists.");

            string passwordHash = passwordHasher.HashPassword(command.Password);

            var newUser = new User(
                command.Username,
                command.Email,
                passwordHash,
                command.Role,
                command.WeightKg,
                command.HeightCm,
                command.Sex,
                command.BirthYear,
                command.PreferredUnit
            );

            await context.Users.AddAsync(newUser, ct);
            await context.SaveChangesAsync(ct);

            return Results.Created($"/api/users/{newUser.Id}", new UserProfileDto(
                newUser.Id,
                newUser.Username,
                newUser.Email,
                newUser.Role,
                newUser.WeightKg,
                newUser.HeightCm,
                newUser.Sex,
                newUser.BirthYear,
                newUser.PreferredUnit,
                newUser.IsActive
            ));
        })
        .RequireAuthorization("RequireAdmin");
    }
}