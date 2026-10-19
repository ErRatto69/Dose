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

        // Public Registration Request with Anti-Spam protection
        group.MapPost("/register-request", async (
            CreateRegistrationRequestDto request,
            HttpContext httpContext,
            IApplicationDbContext context,
            IPasswordHasher passwordHasher,
            IDateTimeProvider dateTimeProvider,
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

            // 2. Global pending queue cap to prevent database flooding
            int pendingQueueCount = await context.RegistrationRequests
                .CountAsync(r => r.Status == RegistrationRequestStatus.Pending, ct);

            if (pendingQueueCount >= 30)
                throw new DomainException("The registration queue is currently full. Please contact the host directly.");

            // 3. Extract real client IP and enforce rate limit (max 1 pending or 2 requests per 12h per IP)
            string clientIp = GetClientIpAddress(httpContext);
            DateTimeOffset twelveHoursAgo = dateTimeProvider.UtcNow.AddHours(-12);

            int recentRequestsFromIp = await context.RegistrationRequests
                .CountAsync(r => r.ClientIpAddress == clientIp &&
                                 (r.Status == RegistrationRequestStatus.Pending || r.CreatedAt >= twelveHoursAgo), ct);

            if (recentRequestsFromIp >= 2)
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
        .WithName("SubmitRegistrationRequest");
    }

    private static string GetClientIpAddress(HttpContext httpContext)
    {
        if (httpContext.Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor))
        {
            string? firstIp = forwardedFor.ToString().Split(',').FirstOrDefault()?.Trim();
            if (!string.IsNullOrWhiteSpace(firstIp))
                return firstIp;
        }

        if (httpContext.Request.Headers.TryGetValue("X-Real-IP", out var realIp))
        {
            string ip = realIp.ToString().Trim();
            if (!string.IsNullOrWhiteSpace(ip))
                return ip;
        }

        return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}