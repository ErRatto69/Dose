using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Dose.Api.Extensions;
using Dose.Api.Middleware;
using Dose.Application;
using Dose.Infrastructure;
using Dose.Infrastructure.Persistence;
using Dose.Infrastructure.Persistence.Seeding;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// 0. Configure JSON Serialization
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// 1. Dependency Injection Registration
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddSecurityConfiguration(builder.Configuration);

// 2. Configure Forwarded Headers for Reverse Proxy (Nginx / NPM)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// 3. Rate Limiting Configuration
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Policy Brute-Force Auth (Login & Register requests): Max 5 tentativi al minuto per IP
    options.AddPolicy("auth-policy", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown-auth";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: clientIp,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });

    // Policy Upload Immagini: Max 10 upload al minuto per IP
    options.AddPolicy("upload-policy", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown-upload";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: clientIp,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });
});

// 4. OpenAPI & Documentation
builder.Services.AddOpenApi();

var app = builder.Build();

// Forwarded Headers (DEVE precedere qualsiasi logica dipendente dall'IP client)
app.UseForwardedHeaders();

// Security Headers Globali API
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    await next();
});

// Serving Static Files
string storageDrinksPath = Path.Combine(app.Environment.ContentRootPath, "storage", "drinks");
Directory.CreateDirectory(storageDrinksPath);

var staticFileOptionsStorage = new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(storageDrinksPath),
    RequestPath = "/storage/drinks",
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        ctx.Context.Response.Headers.Append("Cache-Control", "public, max-age=31536000, immutable");
    }
};

var staticFileOptionsApiStorage = new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(storageDrinksPath),
    RequestPath = "/api/storage/drinks",
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        ctx.Context.Response.Headers.Append("Cache-Control", "public, max-age=31536000, immutable");
    }
};

app.UseStaticFiles(staticFileOptionsStorage);
app.UseStaticFiles(staticFileOptionsApiStorage);

// Database Migration & Seeding
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<DoseDbContext>();
        logger.LogInformation("Applying PostgreSQL database migrations...");
        await dbContext.Database.MigrateAsync();

        var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
        logger.LogInformation("Executing initial database seed...");
        await seeder.SeedAsync();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while migrating or seeding the database.");
    }
}

app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.Title = "Dose API Reference";
        options.Theme = ScalarTheme.Purple;
    });
}

app.UseCors("AllowFrontendApp");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapDiscoveredEndpoints();

app.Run();

public partial class Program { }