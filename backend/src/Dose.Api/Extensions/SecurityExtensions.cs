using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Dose.Application.Common.Interfaces;
using Dose.Domain.Enums;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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

        services.AddMemoryCache();

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

            // Verifica account attivo con caching in-memory per prevenire database hammering
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    string? sub = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                  ?? context.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

                    if (!Guid.TryParse(sub, out Guid userId))
                    {
                        context.Fail("Invalid user identifier in token.");
                        return;
                    }

                    var cache = context.HttpContext.RequestServices.GetRequiredService<IMemoryCache>();
                    string cacheKey = $"user_active_{userId}";

                    if (!cache.TryGetValue(cacheKey, out bool isActiveUser))
                    {
                        var dbContext = context.HttpContext.RequestServices.GetRequiredService<IApplicationDbContext>();
                        isActiveUser = await dbContext.Users
                            .AsNoTracking()
                            .AnyAsync(u => u.Id == userId && u.IsActive, context.HttpContext.RequestAborted);

                        cache.Set(cacheKey, isActiveUser, TimeSpan.FromSeconds(60));
                    }

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

        // CORS ristretto alle origini note
        string[]? configuredOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? configuration["Cors:AllowedOrigins"]?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        string[] defaultOrigins = ["http://localhost:5155", "http://127.0.0.1:5155", "http://localhost:3000", "http://localhost:8080"];
        string[] allowedOrigins = (configuredOrigins != null && configuredOrigins.Length > 0)
            ? configuredOrigins
            : defaultOrigins;

        services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontendApp", policy =>
            {
                policy.WithOrigins(allowedOrigins)
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
        });

        return services;
    }
}