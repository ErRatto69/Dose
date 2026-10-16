using Dose.Api.Common;

namespace Dose.Api.Extensions;

public static class EndpointRegistrationExtensions
{
    public static IEndpointRouteBuilder MapDiscoveredEndpoints(this IEndpointRouteBuilder app)
    {
        var endpointType = typeof(IEndpoint);
        var endpointImplementations = typeof(Program).Assembly.GetTypes()
            .Where(t => endpointType.IsAssignableFrom(t) && !t.IsInterface && !t.IsAbstract);

        foreach (var type in endpointImplementations)
        {
            if (Activator.CreateInstance(type) is IEndpoint endpoint)
            {
                endpoint.MapEndpoint(app);
            }
        }

        return app;
    }
}