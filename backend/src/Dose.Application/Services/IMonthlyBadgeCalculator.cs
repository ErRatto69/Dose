using Dose.Application.Features.Gamification.Dtos;
using Dose.Domain.Enums;

namespace Dose.Application.Services;

public record MonthlyBadgeUserContext(
    decimal WeightKg,
    decimal HeightCm,
    BiologicalSex Sex,
    int? BirthYear
);

public record MonthlyDrinkLogInput(
    Guid LogId,
    string DrinkNameSnapshot,
    DateTimeOffset ConsumedAt,
    decimal PureAlcoholGrams,
    StomachState StomachState,
    int TotalKcal
);

public record MonthlyDrinkLogItemInput(
    Guid DrinkLogId,
    string IngredientNameSnapshot,
    decimal AmountCl
);

public interface IMonthlyBadgeCalculator
{
    IReadOnlyList<MonthlyBadgeDto> ComputeMonthlyBadges(
        MonthlyBadgeUserContext userContext,
        IReadOnlyList<MonthlyDrinkLogInput> monthDrinkLogs,
        IReadOnlyList<MonthlyDrinkLogItemInput> monthDrinkLogItems,
        int monthWaterLogsCount);
}
