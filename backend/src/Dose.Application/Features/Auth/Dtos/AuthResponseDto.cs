using Dose.Application.Features.Users.Dtos;

namespace Dose.Application.Features.Auth.Dtos;

public record AuthResponseDto(
    string AccessToken,
    int ExpiresInSeconds,
    UserProfileDto User
);