namespace Dose.Application.Features.Leaderboard.Dtos;

public record RankingTierDto(
    Guid Id,
    string Name,
    short TierOrder,
    decimal MinPureAlcoholGrams,
    decimal MinPureAlcoholCl,
    string BadgeIcon,
    string ColorHex
);