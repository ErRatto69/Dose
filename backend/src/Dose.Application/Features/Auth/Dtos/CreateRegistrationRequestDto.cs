using Dose.Domain.Enums;
using FluentValidation;

namespace Dose.Application.Features.Auth.Dtos;

public record CreateRegistrationRequestDto(
    string Username,
    string Email,
    string Password,
    decimal WeightKg,
    decimal HeightCm,
    BiologicalSex Sex,
    int? BirthYear,
    string? RequestNote,
    string? WebsiteUrl = null // Honeypot field: must remain empty for real users
);

public class CreateRegistrationRequestValidator : AbstractValidator<CreateRegistrationRequestDto>
{
    public CreateRegistrationRequestValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().MinimumLength(3).MaximumLength(50);

        RuleFor(x => x.Email)
            .NotEmpty().EmailAddress().MaximumLength(120);

        RuleFor(x => x.Password)
            .NotEmpty().MinimumLength(8).WithMessage("Password must be at least 8 characters long.");

        RuleFor(x => x.WeightKg)
            .InclusiveBetween(30m, 250m);

        RuleFor(x => x.HeightCm)
            .InclusiveBetween(100m, 230m);

        RuleFor(x => x.BirthYear)
            .InclusiveBetween(1920, DateTimeOffset.UtcNow.Year - 16)
            .When(x => x.BirthYear.HasValue);

        RuleFor(x => x.RequestNote)
            .MaximumLength(300);
    }
}