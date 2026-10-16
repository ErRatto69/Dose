using Dose.Domain.Entities;

namespace Dose.Application.Common.Interfaces;

public interface IJwtTokenService
{
    string GenerateToken(User user, int expirationMinutes = 10080); // Default 7 days
}