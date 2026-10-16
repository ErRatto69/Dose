using Dose.Application.Common.Interfaces;

namespace Dose.Infrastructure.Services;

public class SystemDateTimeProvider : IDateTimeProvider
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}