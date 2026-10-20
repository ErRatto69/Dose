using Dose.Application.Common.Interfaces;
using Dose.Infrastructure.BackgroundJobs;
using Dose.Infrastructure.Persistence;
using Dose.Infrastructure.Persistence.Seeding;
using Dose.Infrastructure.Security;
using Dose.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Dose.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // PostgreSQL DbContext with connection string from environment/appsettings
        string connectionString = configuration.GetConnectionString("DefaultConnection")
                                  ?? "Host=localhost;Port=5432;Database=dose_prod;Username=dose_admin;Password=dose_pass";

        services.AddDbContext<DoseDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsAssembly(typeof(DoseDbContext).Assembly.FullName);
                npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorCodesToAdd: null);
            });
        });

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<DoseDbContext>());

        // Security & Common Providers
        services.AddHttpContextAccessor();
        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        // Image processing & External harvesting services
        services.AddHttpClient("CocktailDbClient", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(15);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("DoseBarTracker/2.0 (Self-Hosted Cocktail App)");
        });

        services.AddSingleton<IDrinkImageStorageService, DrinkImageStorageService>();
        services.AddSingleton<ICocktailDbSyncService, CocktailDbSyncService>();
        
        // Seeder
        services.AddScoped<DatabaseSeeder>();

        // Background Workers
        services.AddHostedService<LeaderboardMonthlyResetWorker>();

        return services;
    }
}