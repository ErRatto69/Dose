using System.Security.Claims;
using Dose.Application.Common.Interfaces;
using Dose.Domain.Enums;
using Microsoft.AspNetCore.Http;

namespace Dose.Infrastructure.Security;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private readonly ClaimsPrincipal? _user = httpContextAccessor.HttpContext?.User;

    public Guid? UserId
    {
        get
        {
            string? idClaim = _user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                              ?? _user?.FindFirst("sub")?.Value;

            return Guid.TryParse(idClaim, out var id) ? id : null;
        }
    }

    public UserRole? Role
    {
        get
        {
            string? roleClaim = _user?.FindFirst(ClaimTypes.Role)?.Value;
            return Enum.TryParse<UserRole>(roleClaim, true, out var role) ? role : null;
        }
    }

    public bool IsAuthenticated => _user?.Identity?.IsAuthenticated ?? false;
}