using FluentValidation;

namespace Dose.Application.Features.Reviews.Commands;

public record UpsertReviewCommand(
    short Rating,
    string? Comment
);

public class UpsertReviewCommandValidator : AbstractValidator<UpsertReviewCommand>
{
    public UpsertReviewCommandValidator()
    {
        RuleFor(x => x.Rating)
            .InclusiveBetween((short)1, (short)5)
            .WithMessage("Rating must be between 1 and 5 stars.");

        RuleFor(x => x.Comment)
            .MaximumLength(1000)
            .WithMessage("Comment cannot exceed 1000 characters.");
    }
}