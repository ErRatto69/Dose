using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.Users.Commands;
using Dose.Application.Features.Users.Dtos;
using Dose.Domain.Common;
using Dose.Domain.Entities;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using ValidationException = Dose.Application.Common.Exceptions.ValidationException;

namespace Dose.Api.Endpoints;

public class UsersEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        // Current User Profile
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

            return Results.Ok(MapToDto(user));
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        // Update Current User Biometrics & Preferences
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
            if (command.PreferredUnit.HasValue)
            {
                user.SetPreferredUnit(command.PreferredUnit.Value);
            }

            await context.SaveChangesAsync(ct);

            return Results.Ok(MapToDto(user));
        })
        .RequireAuthorization("RequireAuthenticatedDrinker");

        // Admin: Get All Users
        group.MapGet("/", async (
            IApplicationDbContext context,
            CancellationToken ct) =>
        {
            var users = await context.Users
                .AsNoTracking()
                .OrderBy(u => u.Username)
                .Select(u => new UserProfileDto(
                    u.Id,
                    u.Username,
                    u.Email,
                    u.Role,
                    u.WeightKg,
                    u.HeightCm,
                    u.Sex,
                    u.BirthYear,
                    u.PreferredUnit,
                    u.IsActive
                ))
                .ToListAsync(ct);

            return Results.Ok(users);
        })
        .RequireAuthorization("RequireAdmin");

        // Admin: Create New User
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

            return Results.Created($"/api/users/{newUser.Id}", MapToDto(newUser));
        })
        .RequireAuthorization("RequireAdmin");

        // Admin: Update Existing User
        group.MapPut("/{id:guid}", async (
            Guid id,
            UpdateUserAdminCommand command,
            IApplicationDbContext context,
            IPasswordHasher passwordHasher,
            IValidator<UpdateUserAdminCommand> validator,
            CancellationToken ct) =>
        {
            var validationResult = await validator.ValidateAsync(command, ct);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            var user = await context.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
                ?? throw new NotFoundException(nameof(User), id);

            bool duplicate = await context.Users.AnyAsync(u =>
                u.Id != id &&
                (u.Username.ToLower() == command.Username.ToLower() ||
                 u.Email.ToLower() == command.Email.ToLower()), ct);

            if (duplicate)
                throw new DomainException("Another user with this username or email already exists.");

            user.UpdateIdentity(command.Username, command.Email);
            user.SetRole(command.Role);
            user.UpdateBiometrics(command.WeightKg, command.HeightCm, command.Sex, command.BirthYear);
            user.SetPreferredUnit(command.PreferredUnit);
            user.SetActive(command.IsActive);

            if (!string.IsNullOrWhiteSpace(command.NewPassword))
            {
                user.UpdatePasswordHash(passwordHasher.HashPassword(command.NewPassword));
            }

            await context.SaveChangesAsync(ct);

            return Results.Ok(MapToDto(user));
        })
        .RequireAuthorization("RequireAdmin");

        // Admin: Delete User
        group.MapDelete("/{id:guid}", async (
            Guid id,
            ICurrentUserService currentUserService,
            IApplicationDbContext context,
            CancellationToken ct) =>
        {
            if (currentUserService.UserId == id)
                throw new DomainException("You cannot delete your own admin account.");

            var user = await context.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
                ?? throw new NotFoundException(nameof(User), id);

            context.Users.Remove(user);
            await context.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .RequireAuthorization("RequireAdmin");
    }

    private static UserProfileDto MapToDto(User u) => new(
        u.Id,
        u.Username,
        u.Email,
        u.Role,
        u.WeightKg,
        u.HeightCm,
        u.Sex,
        u.BirthYear,
        u.PreferredUnit,
        u.IsActive
    );
}