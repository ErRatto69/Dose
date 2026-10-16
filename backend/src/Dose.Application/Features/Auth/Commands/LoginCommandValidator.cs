using Dose.Application.Features.Auth.Dtos;
using FluentValidation;

namespace Dose.Application.Features.Auth.Commands;

public class LoginCommandValidator : AbstractValidator<LoginRequestDto>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Identifier)
            .NotEmpty().WithMessage("Username or email is required.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.");
    }
}