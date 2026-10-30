using System.Text.RegularExpressions;
using FluentValidation;

namespace Dose.Application.Features.Drinks.Commands;

public record UpdateDrinkCommand(
    string Name,
    string? Description,
    IReadOnlyList<string> PreparationSteps,
    string? GlassType,
    string? ImageUrl,
    bool IsLockedByCreator,
    IReadOnlyList<CreateDrinkIngredientItem> Ingredients
);

public class UpdateDrinkCommandValidator : AbstractValidator<UpdateDrinkCommand>
{
    private static readonly Regex SafeInternalImagePathRegex = new(
        @"^/(api/)?storage/drinks/[a-zA-Z0-9_-]+\.webp$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public UpdateDrinkCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.Ingredients)
            .NotEmpty().WithMessage("A drink recipe must contain at least one ingredient.");

        RuleFor(x => x.ImageUrl)
            .Must(url => string.IsNullOrWhiteSpace(url) || SafeInternalImagePathRegex.IsMatch(url.Trim()))
            .WithMessage("Invalid image path format. Images must be safely sanitized WebP files stored in /storage/drinks/.");

        RuleForEach(x => x.Ingredients).ChildRules(item =>
        {
            item.RuleFor(i => i.IngredientId).NotEmpty();
            item.RuleFor(i => i.AmountCl).GreaterThanOrEqualTo(0m);
        });
    }
}