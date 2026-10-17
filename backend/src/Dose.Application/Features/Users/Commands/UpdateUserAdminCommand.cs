using Dose.Domain.Enums;
using FluentValidation;

namespace Dose.Application.Features.Users.Commands;

public record UpdateUserAdminCommand(
    string Username,
    string Email,
    UserRole Role,
    decimal WeightKg,
    decimal HeightCm,
    BiologicalSex Sex,
    int? BirthYear,
    VolumeUnit PreferredUnit,
    bool IsActive,
    string? NewPassword = null
);

public class UpdateUserAdminCommandValidator : AbstractValidator<UpdateUserAdminCommand>
{
    public UpdateUserAdminCommandValidator()
    {
        RuleFor(x => x.Username).NotEmpty().MinimumLength(3).MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(120);
        RuleFor(x => x.WeightKg).InclusiveBetween(30m, 250m);
        RuleFor(x => x.HeightCm).InclusiveBetween(100m, 230m);
        RuleFor(x => x.NewPassword)
            .MinimumLength(8)
            .When(x => !string.IsNullOrWhiteSpace(x.NewPassword))
            .WithMessage("New password must be at least 8 characters long.");
    }
}