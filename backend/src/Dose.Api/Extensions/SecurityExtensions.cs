using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Dose.Application.Common.Interfaces;
using Dose.Domain.Enums;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Dose.Api.Extensions;

public static class SecurityExtensions
{
    public static IServiceCollection AddSecurityConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        string secretKey = configuration["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("Jwt:SecretKey is not configured.");
        string issuer = configuration["Jwt:Issuer"] ?? "DoseApp";
        string audience = configuration["Jwt:Audience"] ?? "DoseClients";

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1)
            };

            // Reject tokens immediately if the user account was disabled or deleted
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    var dbContext = context.HttpContext.RequestServices.GetRequiredService<IApplicationDbContext>();
                    string? sub = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                  ?? context.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

                    if (!Guid.TryParse(sub, out Guid userId))
                    {
                        context.Fail("Invalid user identifier in token.");
                        return;
                    }

                    bool isActiveUser = await dbContext.Users
                        .AsNoTracking()
                        .AnyAsync(u => u.Id == userId && u.IsActive, context.HttpContext.RequestAborted);

                    if (!isActiveUser)
                    {
                        context.Fail("User account is disabled or no longer exists.");
                    }
                }
            };
        });

        services.AddAuthorizationBuilder()
            .AddPolicy("RequireAdmin", policy => policy.RequireRole(UserRole.Admin.ToString()))
            .AddPolicy("RequireBartenderOrAdmin", policy =>
                policy.RequireRole(UserRole.Admin.ToString(), UserRole.Bartender.ToString()))
            .AddPolicy("RequireAuthenticatedDrinker", policy =>
                policy.RequireRole(UserRole.Admin.ToString(), UserRole.Bartender.ToString(), UserRole.Drinker.ToString()));

        services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontendApp", policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            });
        });

        return services;
    }
}