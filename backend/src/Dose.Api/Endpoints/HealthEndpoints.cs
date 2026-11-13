using Dose.Api.Common;

namespace Dose.Api.Endpoints;

public class HealthEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }))
            .WithTags("Health")
            .WithName("HealthCheck")
            .AllowAnonymous();
    }
}
