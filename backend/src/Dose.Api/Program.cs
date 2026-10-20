using System.Text.Json.Serialization;
using Dose.Api.Extensions;
using Dose.Api.Middleware;
using Dose.Application;
using Dose.Infrastructure;
using Dose.Infrastructure.Persistence;
using Dose.Infrastructure.Persistence.Seeding;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// 0. Configure JSON Serialization to serialize Enums as strings ("Sober", "Admin", "Male", etc.)
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// 1. Dependency Injection Registration across Clean Architecture Layers
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddSecurityConfiguration(builder.Configuration);

// 2. OpenAPI & Scalar API Documentation
builder.Services.AddOpenApi();

var app = builder.Build();

string storageDrinksPath = Path.Combine(app.Environment.ContentRootPath, "storage", "drinks");
Directory.CreateDirectory(storageDrinksPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(storageDrinksPath),
    RequestPath = "/storage/drinks",
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        ctx.Context.Response.Headers.Append("Cache-Control", "public, max-age=31536000, immutable");
    }
});

// 3. Automated Database Migration & Seeding on Startup
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

// 4. HTTP Request Pipeline Configuration
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
app.UseAuthentication();
app.UseAuthorization();

// 5. Automatic Endpoint Discovery
app.MapDiscoveredEndpoints();

app.Run();

public partial class Program { }