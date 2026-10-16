namespace Dose.Application.Common.Exceptions;

public class UnauthorizedException : Exception
{
    public UnauthorizedException(string message = "Invalid credentials or unauthorized access.")
        : base(message)
    {
    }
}