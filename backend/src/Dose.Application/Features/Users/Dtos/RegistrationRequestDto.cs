using Dose.Domain.Enums;

namespace Dose.Application.Features.Users.Dtos;

public record RegistrationRequestDto(
    Guid Id,
    string Username,
    string Email,
    decimal WeightKg,
    decimal HeightCm,
    BiologicalSex Sex,
    int? BirthYear,
    string? RequestNote,
    string? ClientIpAddress,
    RegistrationRequestStatus Status,
    DateTimeOffset CreatedAt
);