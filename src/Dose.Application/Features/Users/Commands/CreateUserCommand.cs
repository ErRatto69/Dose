using Dose.Domain.Enums;
using FluentValidation;

namespace Dose.Application.Features.Users.Commands;

public record CreateUserCommand(
    string Username,
    string Email,
    string Password,
    UserRole Role,
    decimal WeightKg,
    decimal HeightCm,
    BiologicalSex Sex,
    int? BirthYear,
    VolumeUnit PreferredUnit = VolumeUnit.Cl
);

public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().MinimumLength(3).MaximumLength(50);

        RuleFor(x => x.Email)
            .NotEmpty().EmailAddress().MaximumLength(120);

        RuleFor(x => x.Password)
            .NotEmpty().MinimumLength(8).WithMessage("Password must be at least 8 characters long.");

        RuleFor(x => x.WeightKg).InclusiveBetween(30m, 250m);
        RuleFor(x => x.HeightCm).InclusiveBetween(100m, 230m);
    }
}