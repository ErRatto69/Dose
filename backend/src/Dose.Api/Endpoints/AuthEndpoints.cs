using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.Auth.Dtos;
using Dose.Application.Features.Users.Dtos;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using ValidationException = Dose.Application.Common.Exceptions.ValidationException;

namespace Dose.Api.Endpoints;

public class AuthEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Authentication");

        group.MapPost("/login", async (
            LoginRequestDto request,
            IApplicationDbContext context,
            IPasswordHasher passwordHasher,
            IJwtTokenService jwtTokenService,
            IValidator<LoginRequestDto> validator,
            CancellationToken ct) =>
        {
            var validationResult = await validator.ValidateAsync(request, ct);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            string normalizedIdentifier = request.Identifier.Trim().ToLowerInvariant();

            var user = await context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u =>
                    u.Username.ToLower() == normalizedIdentifier ||
                    u.Email.ToLower() == normalizedIdentifier, ct);

            if (user is null || !user.IsActive || !passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
                throw new UnauthorizedException("Invalid username/email or password.");

            string token = jwtTokenService.GenerateToken(user);

            var userProfile = new UserProfileDto(
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
            );

            return Results.Ok(new AuthResponseDto(token, 604800, userProfile));
        })
        .WithName("Login")
        .Produces<AuthResponseDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);
    }
}