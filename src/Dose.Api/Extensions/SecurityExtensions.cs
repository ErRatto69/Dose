using System.Text;
using Dose.Domain.Enums;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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