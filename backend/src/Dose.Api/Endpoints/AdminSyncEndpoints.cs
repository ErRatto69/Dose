using Dose.Api.Common;
using Dose.Application.Common.Interfaces;

namespace Dose.Api.Endpoints;

public class AdminSyncEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/sync").WithTags("Admin Synchronization");

        // Trigger TheCocktailDB Harvesting
        group.MapPost("/cocktaildb", (ICocktailDbSyncService syncService) =>
            {
                bool started = syncService.StartSync();
                if (!started)
                {
                    return Results.Conflict(new { message = "Synchronization is already running in background." });
                }

                return Results.Accepted(value: new { message = "TheCocktailDB synchronization started." });
            })
            .RequireAuthorization("RequireAdmin");

        // Check real-time progress status
        group.MapGet("/cocktaildb/status", (ICocktailDbSyncService syncService) =>
            {
                return Results.Ok(syncService.GetStatus());
            })
            .RequireAuthorization("RequireAdmin");
    }
}