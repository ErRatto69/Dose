using Dose.Domain.Common;

namespace Dose.Domain.ValueObjects;

public sealed record PureAlcohol
{
    private const decimal EthanolDensityGramsPerMl = 0.789m;

    public decimal Grams { get; }
    public decimal PureAlcoholCl { get; }

    private PureAlcohol(decimal grams, decimal pureAlcoholCl)
    {
        if (grams < 0 || pureAlcoholCl < 0)
            throw new DomainException("The pure alcool amount cannot be negative");

        Grams = Math.Round(grams, 2);
        PureAlcoholCl = Math.Round(pureAlcoholCl, 2);
    }

    public static PureAlcohol Zero => new(0m, 0m);

    public static PureAlcohol FromClAndAbv(decimal volumeCl, decimal abvPercent)
    {
        if (volumeCl <= 0 || abvPercent <= 0)
            return Zero;

        decimal alcoholVolumeCl = volumeCl * (abvPercent / 100m);
        decimal grams = alcoholVolumeCl * 10m * EthanolDensityGramsPerMl; // 1 cl = 10 ml

        return new PureAlcohol(grams, alcoholVolumeCl);
    }

    public static PureAlcohol FromGrams(decimal grams)
    {
        if (grams <= 0)
            return Zero;

        decimal alcoholVolumeCl = (grams / EthanolDensityGramsPerMl) / 10m;
        return new PureAlcohol(grams, alcoholVolumeCl);
    }

    public static PureAlcohol operator +(PureAlcohol a, PureAlcohol b) =>
        new(a.Grams + b.Grams, a.PureAlcoholCl + b.PureAlcoholCl);

    public static PureAlcohol operator -(PureAlcohol a, PureAlcohol b) =>
        new(Math.Max(0m, a.Grams - b.Grams), Math.Max(0m, a.PureAlcoholCl - b.PureAlcoholCl));
}