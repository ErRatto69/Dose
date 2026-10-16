using Dose.Domain.Enums;

namespace Dose.Application.Features.Users.Dtos;

public record UserProfileDto(
    Guid Id,
    string Username,
    string Email,
    UserRole Role,
    decimal WeightKg,
    decimal HeightCm,
    BiologicalSex Sex,
    int? BirthYear,
    VolumeUnit PreferredUnit,
    bool IsActive
);