using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Dose.Application.Common.Interfaces;
using Dose.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Dose.Infrastructure.Security;

public class JwtTokenService(IConfiguration configuration) : IJwtTokenService
{
    public string GenerateToken(User user, int expirationMinutes = 10080)
    {
        string secretKey = configuration["Jwt:SecretKey"]
                           ?? throw new InvalidOperationException("Jwt:SecretKey configuration is missing.");
        string issuer = configuration["Jwt:Issuer"] ?? "DoseApp";
        string audience = configuration["Jwt:Audience"] ?? "DoseClients";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.Username),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("preferredUnit", user.PreferredUnit.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(expirationMinutes),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}