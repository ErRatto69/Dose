using Dose.Domain.Enums;
using FluentValidation;

namespace Dose.Application.Features.Users.Commands;

public record UpdateBiometricsCommand(
    decimal WeightKg,
    decimal HeightCm,
    BiologicalSex Sex,
    int? BirthYear
);

public class UpdateBiometricsCommandValidator : AbstractValidator<UpdateBiometricsCommand>
{
    public UpdateBiometricsCommandValidator()
    {
        RuleFor(x => x.WeightKg)
            .InclusiveBetween(30m, 250m)
            .WithMessage("Body weight must be between 30 and 250 kg.");

        RuleFor(x => x.HeightCm)
            .InclusiveBetween(100m, 230m)
            .WithMessage("Height must be between 100 and 230 cm.");

        RuleFor(x => x.BirthYear)
            .InclusiveBetween(1920, DateTimeOffset.UtcNow.Year - 16)
            .When(x => x.BirthYear.HasValue)
            .WithMessage("Invalid birth year.");
    }
}