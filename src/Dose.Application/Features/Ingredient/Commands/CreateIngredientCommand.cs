using Dose.Domain.Enums;
using FluentValidation;

namespace Dose.Application.Features.Ingredients.Commands;

public record CreateIngredientCommand(
    string Name,
    IngredientCategory Category,
    decimal Abv,
    bool IsAvailableInBar = true,
    string? Description = null,
    string? ImageUrl = null
);

public class CreateIngredientCommandValidator : AbstractValidator<CreateIngredientCommand>
{
    public CreateIngredientCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Abv).InclusiveBetween(0m, 96m);

        RuleFor(x => x.Abv)
            .GreaterThan(0m)
            .When(x => x.Category == IngredientCategory.Spirit)
            .WithMessage("Spirits must have an ABV greater than 0%.");

        RuleFor(x => x.Abv)
            .Equal(0m)
            .When(x => x.Category is IngredientCategory.Mixer or IngredientCategory.Garnish)
            .WithMessage("Mixers and Garnishes must have 0% ABV.");
    }
}