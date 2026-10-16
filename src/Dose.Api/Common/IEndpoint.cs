namespace Dose.Api.Common;

public interface IEndpoint
{
    void MapEndpoint(IEndpointRouteBuilder app);
}