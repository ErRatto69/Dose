using System.Reflection;
using Dose.Application.Services;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Dose.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // FluentValidation automatic validator discovery
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        // Domain calculation services
        services.AddSingleton<IBacCalculator, BacCalculator>();
        services.AddSingleton<IDrinkStrengthCalculator, DrinkStrengthCalculator>();
        services.AddSingleton<IRecipeMatcher, RecipeMatcher>();

        return services;
    }
}