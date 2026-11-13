using Dose.Api.Common;
using Dose.Application.Common.Exceptions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.Auth.Dtos;
using Dose.Application.Features.Users.Dtos;
using Dose.Domain.Common;
using Dose.Domain.Entities;
using Dose.Domain.Enums;
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
            IConfiguration configuration,
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
                throw new UnauthorizedException("Invalid username/email or password, or account is disabled.");

            int expirationMinutes = configuration.GetValue<int?>("Jwt:ExpirationMinutes") ?? 10080;
            if (expirationMinutes <= 0)
                expirationMinutes = 10080;

            string token = jwtTokenService.GenerateToken(user, expirationMinutes);

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

            return Results.Ok(new AuthResponseDto(token, expirationMinutes * 60, userProfile));
        })
        .WithName("Login")
        .Produces<AuthResponseDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .RequireRateLimiting("auth-policy");

        // Public Registration Request with Anti-Spam protection
        group.MapPost("/register-request", async (
            CreateRegistrationRequestDto request,
            HttpContext httpContext,
            IApplicationDbContext context,
            IPasswordHasher passwordHasher,
            IDateTimeProvider dateTimeProvider,
            IConfiguration configuration,
            IValidator<CreateRegistrationRequestDto> validator,
            CancellationToken ct) =>
        {
            // 1. Honeypot trap for automated bots
            if (!string.IsNullOrWhiteSpace(request.WebsiteUrl))
            {
                return Results.Ok(new { message = "Registration request submitted." });
            }

            var validationResult = await validator.ValidateAsync(request, ct);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            int maxPendingQueue = configuration.GetValue<int?>("Registration:MaxPendingQueue") ?? 30;
            int maxRequestsPerIp = configuration.GetValue<int?>("Registration:MaxRequestsPerIpWindow") ?? 2;
            int windowHours = configuration.GetValue<int?>("Registration:RateLimitWindowHours") ?? 12;

            // 2. Global pending queue cap to prevent database flooding
            int pendingQueueCount = await context.RegistrationRequests
                .CountAsync(r => r.Status == RegistrationRequestStatus.Pending, ct);

            if (pendingQueueCount >= maxPendingQueue)
                throw new DomainException("The registration queue is currently full. Please contact the host directly.");

            // 3. Extract real client IP and enforce rate limit
            string clientIp = GetClientIpAddress(httpContext);
            DateTimeOffset windowStart = dateTimeProvider.UtcNow.AddHours(-windowHours);

            int recentRequestsFromIp = await context.RegistrationRequests
                .CountAsync(r => r.ClientIpAddress == clientIp &&
                                 (r.Status == RegistrationRequestStatus.Pending || r.CreatedAt >= windowStart), ct);

            if (recentRequestsFromIp >= maxRequestsPerIp)
                throw new DomainException("You have already submitted a registration request recently. Please wait for admin approval.");

            // 4. Verify username and email are not already taken or pending
            string normUser = request.Username.Trim().ToLowerInvariant();
            string normEmail = request.Email.Trim().ToLowerInvariant();

            bool userExists = await context.Users.AnyAsync(u =>
                u.Username.ToLower() == normUser || u.Email.ToLower() == normEmail, ct);

            bool requestExists = await context.RegistrationRequests.AnyAsync(r =>
                r.Status == RegistrationRequestStatus.Pending &&
                (r.Username.ToLower() == normUser || r.Email.ToLower() == normEmail), ct);

            if (userExists || requestExists)
                throw new DomainException("This username or email is already registered or awaiting approval.");

            string passwordHash = passwordHasher.HashPassword(request.Password);

            var regRequest = new RegistrationRequest(
                request.Username,
                request.Email,
                passwordHash,
                request.WeightKg,
                request.HeightCm,
                request.Sex,
                request.BirthYear,
                request.RequestNote,
                clientIp
            );

            await context.RegistrationRequests.AddAsync(regRequest, ct);
            await context.SaveChangesAsync(ct);

            return Results.Accepted(value: new { message = "Your access request has been sent to the administrator." });
        })
        .WithName("SubmitRegistrationRequest")
        .RequireRateLimiting("auth-policy");
    }

    private static string GetClientIpAddress(HttpContext httpContext)
    {
        return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}